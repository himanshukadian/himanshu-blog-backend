'use strict';

// Conversational Query Reformulation (CQR) for the assistant.
//
// Context-dependent follow-ups — anaphora ("is there article on it"), bare
// ellipsis ("in 2 points", "more details") — must be rewritten into a
// self-contained query BEFORE both RAG retrieval and the answer LLM,
// otherwise retrieval sees ~empty tokens and the generation model guesses
// the wrong referent.
//
// The permanent design (per LlamaIndex CondenseQuestionChatEngine /
// CondensePlusContextChatEngine, LangChain condense_question, AdaptiveRecall,
// and the rules-vs-LLM literature: arXiv 2607.23386, Mirzadeh et al. 2024,
// AutoSpec, KRD):
//   - NO hand-tuned detector decides "is this context-dependent". Hand-coded
//     keyword gates fail in the long tail — every new edge case ("in two
//     points", "in 3 bullets", "make it a table") needed a new keyword.
//   - ONE cheap LLM condense pass runs on EVERY turn that has history. The
//     prompt follows the canonical
//       Chat History: ... / Follow Up Input: <query> / Standalone question:
//     template, and instructs the model to output the query verbatim when it
//     is already self-contained.
//   - This module exposes exactly two things:
//       1. hasUsableHistory()   — the ONLY gate (history exists?).
//       2. buildRewritePrompt() — the condense prompt for the lite model.

// History entries arrive either OpenAI-style ({role:'user'|'assistant'|'system'})
// or legacy ({type: ...}). Normalize so both work — this was the root cause of
// the terminal silently dropping all context.
function speakerOf(m) {
  if (!m) return null;
  const t = m.type || m.role;
  if (t === 'user' || t === 'assistant') return t;
  return null;
}

function summaryOf(m) {
  if (!m) return null;
  const t = m.type || m.role;
  const c = String(m.content || '').trim();
  return t === 'system' && c ? c : null;
}

// The only gate for the LLM CQR rewrite: is there real conversation history?
function hasUsableHistory(chatHistory) {
  return Array.isArray(chatHistory) && chatHistory.some(
    (m) => speakerOf(m) && String(m.content || '').trim().length > 1
  );
}

// Build the LLM messages for the condense rewrite (LlamaIndex
// DEFAULT_CONDENSE_PROMPT_TEMPLATE shape). The rewritten query must be
// self-contained so a fresh retrieval + generation pass sees the resolved
// referent — e.g. "in 2 points" after a projects answer becomes
// "Give the previous answer about his projects in 2 points".
function buildRewritePrompt(query, chatHistory) {
  const entries = Array.isArray(chatHistory) ? chatHistory : [];
  const sanitized = entries
    .map((m) => {
      const speaker = speakerOf(m);
      if (speaker) return `${speaker === 'user' ? 'User' : 'Assistant'}: ${String(m.content || '').trim()}`;
      const summary = summaryOf(m);
      return summary ? `Summary of earlier conversation: ${summary}` : null;
    })
    .filter((l) => l && l.length > 4)
    .slice(-6);

  const prompt = [
    'You rewrite conversational follow-up messages so they are fully self-contained, resolved queries.',
    'The conversation is with an assistant that knows one person (Himanshu) and his portfolio (projects, resume, blog articles).',
    '',
    'Rules:',
    '- Rewrite ONLY the "Follow Up Input" below into a standalone question that names everything it refers to, resolving pronouns ("it", "that", "this", "those"), ellipsis, and omitted topics from the conversation.',
    "- Keep the user's formatting request (e.g. \"in bullet points\", \"in 2 points\", \"more details\", \"expand\").",
    '- Output ONLY the rewritten question. No prefixes, no quotes, no commentary.',
    '- If the "Follow Up Input" is already fully self-contained, re-output it verbatim.',
    '- Never invent facts, links, or projects not present in the conversation.',
    '',
    'Conversation:',
    ...sanitized,
    '',
    `Follow Up Input: ${String(query || '').trim()}`,
    'Standalone question:'
  ].filter(Boolean).join('\n');

  return [
    { role: 'system', content: 'You are a precise query-rewriting module. Return only the rewritten sentence.' },
    { role: 'user', content: prompt }
  ];
}

module.exports = { hasUsableHistory, buildRewritePrompt };