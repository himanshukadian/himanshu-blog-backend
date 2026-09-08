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
// Two layers:
//   1. resolveQuery()        — deterministic, zero-cost fast path for
//                              marker/hollow queries (token substitution).
//   2. isContextDependent()  — cheap gate that fires a train-free LLM rewrite
//                              only for queries deterministic logic cannot
//                              resolve (pure ellipsis / formatting follow-ups).

const { tokenize } = require('./articleRag');

const REF_MARKERS = /\b(it|its|this|that|these|those|them|they|there)\b/i;

const FORMAT_ONLY = new Set([
  'bullet', 'bullets', 'point', 'points', 'more', 'detail', 'details',
  'summary', 'summarize', 'summaries', 'expand', 'elaborate', 'concise',
  'short', 'shorter', 'simplify', 'simplified', 'reword', 'rephrase',
  'format', 'formatting', 'list', 'give', 'show', 'tell', 'say', 'write',
  'explain', 'describe', 'one', 'ones', 'like', 'same', 'similar', 'those',
  'me', 'us', 'thing', 'things', 'stuff'
]);

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
// Returns null when the query is already self-contained (nothing to resolve).
function resolveQuery(query, chatHistory) {
  const raw = String(query || '').trim();
  if (!raw) return null;

  const contentTokens = tokenize(raw);
  const hasMarker = REF_MARKERS.test(raw);
  const isHollow = contentTokens.length < 2 && hasMarker;

  if (!isHollow && !hasMarker) return null;

  const topic = extractTopicTokens(raw, chatHistory);
  if (!topic.length) return null;

  const topicStr = topic.join(' ');

  if (isHollow) {
    // Ellipsis / bare-marker follow-up: substitute prior topic entirely.
    // e.g. "is there article on it" -> "is there article on <topic>"
    const withoutMarkers = raw.replace(REF_MARKERS, ' ');
    return `${withoutMarkers.trim()} ${topicStr}`.trim();
  }

  // Marker + other content: insert the antecedent after the marker (CRDR add).
  return raw.replace(REF_MARKERS, ` ${topicStr}`);
}

// Cheap gate: is THIS query context-dependent (needs CQR rewrite)?
// True when the query is (a) hollow (≤1 content token), or (b) composed only
// of formatting/continuation words ("in bullet points", "more details",
// "expand", "like those") with no topical content of its own, or (c) carries
// a reference marker. Entirely self-contained queries ("what is priceiq",
// "summarize the AI agents article") are never flagged.
function isContextDependent(query, chatHistory) {
  const raw = String(query || '').trim();
  if (!raw) return false;

  const hasHistory = Array.isArray(chatHistory) && chatHistory.some(
    (m) => m && (m.type === 'user' || m.type === 'assistant') &&
      String(m.content || '').trim().length > 1
  );
  if (!hasHistory) return false;

  if (REF_MARKERS.test(raw)) return true;

  const tokens = tokenize(raw);
  if (tokens.length <= 1) return true;

  const meaningful = tokens.filter((t) => !FORMAT_ONLY.has(t));
  // If nothing substantive survives beyond format words -> ellipsis follow-up.
  return meaningful.length === 0;
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

module.exports = { resolveQuery, extractTopicTokens, isContextDependent, buildRewritePrompt, REF_MARKERS };