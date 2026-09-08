'use strict';

// Deterministic conversational query resolver (CQR/anaphora handling).
// When a follow-up is lexically "hollow" (tokenizes to ~0 content after
// stopword removal) or carries a reference marker (it/that/this/these/those/
// them/they/its/there), substitute the most recent topical content from the
// conversation so RAG retrieves against a self-contained query.
//
// Research-backed (TREC CAsT / CRDR "replace/add" rules + salience-based
// coreference "last-mention" heuristic): only resolve when hollow or
// marker-bearing; never blanket-append history. LLM stays untouched; only
// the retrieval input changes.

const { tokenize } = require('./articleRag');

const REF_MARKERS = /\b(it|its|this|that|these|those|them|they|there)\b/i;

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

module.exports = { resolveQuery, extractTopicTokens };