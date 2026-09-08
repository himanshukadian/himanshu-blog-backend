'use strict';

// Conversational Query Reformulation (CQR) for the assistant.
//
// Research-backed (TREC CAsT / CRDR replace+add rules; LLM4CS / Ye et al.
// 2023 train-free prompt rewriting): context-dependent follow-ups — anaphora
// ("is there article on it"), bare ellipsis ("in bullet points", "more
// details") — must be rewritten into a self-contained query BEFORE both RAG
// retrieval and the answer LLM, otherwise retrieval sees ~empty tokens and
// the generation model guesses the wrong referent.
//
// Design notes (research-backed replacement for the earlier keyword-gate):
//   KRD / Ideaplan "Rule sprawl", AutoSpec, and the LLM rule-evaluation
//   literature (arXiv 2607.23386; Mirzadeh et al. 2024) show that hand-tuned
//   detectors for "what counts as context-dependent" fail in the long tail:
//   every new edge case ("in two points", "in 3 bullets") required a new
//   keyword. The permanent fix (per LlamaIndex CondenseQuestionChatEngine /
//   CondensePlusContextChatEngine, LangChain condense_question, AdaptiveRecall)
//   is to skip the heuristic gate entirely and run ONE cheap LLM condense pass
//   on EVERY turn that has history. This module keeps only:
//     1. resolveQuery()       — deterministic fast path (marker/hollow token
//                               substitution). Fires ONLY for unambiguous
//                               pronoun referents ("it", "that", "those");
//                               determiner usage ("this project") never fires.
//     2. hasUsableHistory()   — the ONLY gate for the LLM rewrite: history
//                               exists (and the deterministic path failed).
//     3. buildRewritePrompt() — the LLM rewrite prompt ("return verbatim if
//                               already self-contained").

const { tokenize } = require('./articleRag');

const REF_MARKERS = /\b(it|its|this|that|these|those|them|they|there)\b/i;

const DETERMINER_RE = /\b(?:this|that|these|those|its)\s+[a-z][a-z0-9'-]*\b/gi;

// True when the query uses a marker as a PRONOUN (standalone referent:
// "is there article on it", "expand on that"). Determiner usage ("this
// project", "that article") is self-contained and must NOT trigger a rewrite.
function usesPronounMarker(raw) {
  if (!REF_MARKERS.test(raw)) return false;
  const withoutDeterminers = raw.replace(DETERMINER_RE, ' ');
  return REF_MARKERS.test(withoutDeterminers);
}

// The only gate for the LLM CQR rewrite: is there real conversation history?
// (This is what the reference implementations use — no content-based gate.)
function hasUsableHistory(chatHistory) {
  return Array.isArray(chatHistory) && chatHistory.some(
    (m) => m && (m.type === 'user' || m.type === 'assistant') &&
      String(m.content || '').trim().length > 1
  );
}

// Extract the most salient topical tokens, preferring the LAST USER turn
// (CQR last-user-priority): find the most recent user utterance that carries
// real content; only fall back to the assistant turn (which often restates/
// cites an article title) when no textured user turn exists.
function extractTopicTokens(_query, chatHistory) {
  const entries = Array.isArray(chatHistory) ? chatHistory : [];
  const rawTrim = String(_query || '').trim().toLowerCase();

  const contentOf = (m) => String((m && m.content) || '').trim();

  const textured = (text) => tokenize(text).length >= 2;

  let userText = null;
  let assitText = null;
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const m = entries[i];
    if (!m || (m.type !== 'user' && m.type !== 'assistant')) continue;
    const content = contentOf(m);
    if (!content || content.toLowerCase() === rawTrim) continue;
    if (m.type === 'assistant') {
      if (assitText === null) assitText = content;
      continue;
    }
    if (textured(content)) {
      userText = content;
      break;
    }
    if (userText === null) userText = '';
  }

  const counts = {};
  const topTokens = (text) => {
    tokenize(text || '').forEach((t) => {
      counts[t] = (counts[t] || 0) + 1;
    });
  };

  if (userText !== null && textured(userText)) {
    topTokens(userText);
  } else if (assitText !== null && textured(assitText)) {
    topTokens(assitText);
  } else if (userText !== null) {
    topTokens(userText);
  }

  return Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 6);
}

// Resolve an anaphoric/elliptical follow-up into a self-contained query.
// Returns null when the query is already self-contained (nothing to resolve),
// or when no prior topic can be found. Fires ONLY on unambiguous PRONOUN
// referents — determiner usage ("list 4 main points about this project") is
// self-contained and returns null (the LLM condense step then preserves it).
function resolveQuery(query, chatHistory) {
  const raw = String(query || '').trim();
  if (!raw) return null;

  const contentTokens = tokenize(raw);
  if (!usesPronounMarker(raw)) return null;

  const isHollow = contentTokens.length < 2;

  const topic = extractTopicTokens(raw, chatHistory);
  if (!topic.length) return null;

  const topicStr = topic.join(' ');

  if (isHollow) {
    // Ellipsis / bare-marker follow-up: substitute prior topic entirely.
    // e.g. "is there article on it" -> "is there article on <topic>"
    const withoutMarkers = raw.replace(DETERMINER_RE, ' ').replace(REF_MARKERS, ' ');
    return `${withoutMarkers.trim()} ${topicStr}`.trim();
  }

  // Marker + other content: insert the antecedent after the marker (CRDR add).
  return raw.replace(DETERMINER_RE, ' ').replace(REF_MARKERS, ` ${topicStr}`);
}

// Build the LLM messages for train-free CQR rewriting (LLM4CS-style).
// The rewrite must be self-contained so a fresh retrieval + generation pass
// sees the resolved referent — warum "in bullet points" becomes
// "Give me the previous answer about <topic> in bullet points".
function buildRewritePrompt(query, chatHistory) {
  const entries = Array.isArray(chatHistory) ? chatHistory : [];
  const sanitized = entries
    .filter((m) => m && (m.type === 'user' || m.type === 'assistant'))
    .map((m) => `${m.type === 'user' ? 'User' : 'Assistant'}: ${String(m.content || '').trim()}`)
    .filter((l) => l.length > 4)
    .slice(-6);

  const prompt = [
    'You rewrite conversational follow-up messages so they are fully self-contained, resolved queries.',
    'The conversation is with an assistant that knows one person (Himanshu) and his portfolio (projects, resume, blog articles).',
    '',
    'Syntax:',
    '  User: <message>',
    '  Assistant: <message>',
    '',
    'Rules:',
    '- ALWAYS rewrite the final User line so it names what it refers to, resolving pronouns ("it", "that", "this", "those"), ellipsis, and omitted topics.',
    "- Keep the user's formatting request (e.g. \"in bullet points\", \"more details\", \"expand\").",
    '- Output ONLY the rewritten user message. No prefixes, no quotes, no commentary.',
    '- If the final User line is already fully self-contained, re-output it verbatim.',
    '- Never invent facts, links, or projects not present in the conversation.',
    '',
    ...sanitized
  ].filter(Boolean).join('\n');

  return [
    { role: 'system', content: 'You are a precise query-rewriting module. Return only the rewritten sentence.' },
    { role: 'user', content: prompt }
  ];
}

module.exports = { resolveQuery, extractTopicTokens, hasUsableHistory, buildRewritePrompt, REF_MARKERS };