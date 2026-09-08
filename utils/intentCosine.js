'use strict';

// Hand-rolled intentmap-style cosine matcher (zero deps, CJS-safe, sub-ms).
// Dictionary = prototype phrases per intent -> word-stem unigram+bigram vectors
// (L2-normalized TF, averaged per intent). queryScores() returns cosine per
// intent. It is a SUPPLEMENT to the Damerau fuzzy tier: regex tier remains the
// sole authority, Damerau remains the typo layer; cosine adds lexical recall
// for non-typo paraphrases. It never runs before regex and never overrides it.

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'to', 'of', 'in', 'on', 'at',
  'for', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'do', 'does', 'did', 'have', 'has', 'had', 'i', 'me', 'my', 'we',
  'our', 'you', 'your', 'he', 'him', 'she', 'her', 'it', 'they', 'them',
  'this', 'that', 'these', 'those', 'can', 'could', 'will', 'would', 'should',
  'may', 'might', 'must', 'let', 'lets', 'how', 'what', 'when', 'where',
  'why', 'who', 'which', 'about', 'wanna', 'want', 'like', 'please'
]);

function stemWord(w) {
  let s = w;
  let changed = true;
  while (changed && s.length > 3) {
    changed = false;
    if (s.length > 5 && s.endsWith('ing')) {
      s = s.slice(0, -3);
      changed = true;
    } else if (s.length > 4 && s.endsWith('ed')) {
      s = s.slice(0, -2);
      changed = true;
    } else if (s.length > 3 && s.endsWith('es')) {
      s = s.slice(0, -2);
      changed = true;
    } else if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss')) {
      s = s.slice(0, -1);
      changed = true;
    }
  }
  return s;
}

function tokenize(normQ) {
  return String(normQ || '')
    .toLowerCase()
    .split(' ')
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .map(stemWord)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

function buildVector(tokens) {
  const counts = new Map();
  for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
  for (let i = 0; i + 1 < tokens.length; i += 1) {
    const bg = `${tokens[i]}_${tokens[i + 1]}`;
    counts.set(bg, (counts.get(bg) || 0) + 1);
  }
  let norm = 0;
  for (const v of counts.values()) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  const vec = {};
  for (const [k, v] of counts) vec[k] = v / norm;
  return vec;
}

function cosineSimilarity(a, b) {
  let dot = 0;
  for (const k of Object.keys(a)) {
    if (Object.prototype.hasOwnProperty.call(b, k)) dot += a[k] * b[k];
  }
  return dot;
}

function averageVectors(vecs) {
  const sums = {};
  for (const vec of vecs) {
    for (const k of Object.keys(vec)) sums[k] = (sums[k] || 0) + vec[k];
  }
  let norm = 0;
  for (const v of Object.values(sums)) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  const avg = {};
  for (const k of Object.keys(sums)) avg[k] = sums[k] / norm;
  return avg;
}

function buildDictionary(seedByIntent) {
  const dict = {};
  for (const intent of Object.keys(seedByIntent)) {
    dict[intent] = averageVectors(seedByIntent[intent].map((seed) => buildVector(tokenize(seed))));
  }
  return dict;
}

function scoreQuery(dict, normQ) {
  const qv = buildVector(tokenize(normQ));
  const scores = {};
  for (const intent of Object.keys(dict)) scores[intent] = cosineSimilarity(qv, dict[intent]);
  return scores;
}

module.exports = {
  stemWord,
  tokenize,
  buildVector,
  cosineSimilarity,
  averageVectors,
  buildDictionary,
  scoreQuery
};