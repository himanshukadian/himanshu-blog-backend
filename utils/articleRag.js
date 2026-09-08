const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'for', 'to', 'of', 'in', 'on', 'with', 'at', 'i', 'you', 'he', 'she', 'it', 'is', 'are', 'was', 'were', 'be', 'has', 'have', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'should', 'this', 'that', 'these', 'those', 'my', 'your', 'about', 'how', 'what', 'why', 'when', 'where', 'from', 'by', 'as', 'into', 'over', 'then']);

const INDEX_TTL = 10 * 60 * 1000;
const INIT_TIMEOUT = 5 * 1000;
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;
const TITLE_BOOST = 4;
const TITLE_BOOST_CAP = 20;
const TAG_BOOST = 3;
const TAG_BOOST_CAP = 12;
const SNIPPET_RADIUS = 140;
const SNIPPET_MAX = 320;
const SECOND_CHUNK_BONUS = 0.25;
const BASE_URL = 'https://blog.buildwithhimanshu.com/';

let index = {
  builtAt: 0,
  articleCount: 0,
  chunks: [],
  idf: {},
  titles: {},
  tags: {},
  publishedAt: {}
};

let stats = {
  corpusSize: 0,
  chunkCount: 0,
  builtAt: null,
  stale: false,
  lastError: null,
  lastBuildMs: 0
};

let buildingPromise = null;

function round2(n) {
  return Number.parseFloat(n.toFixed(2));
}

function stem(token) {
  if (token.length <= 4) return token;
  let result;
  if (token.endsWith('ies')) {
    result = token.slice(0, -3) + 'y';
  } else if (token.endsWith('es')) {
    result = token.slice(0, -2);
  } else if (token.endsWith('s')) {
    result = token.slice(0, -1);
  } else if (token.endsWith('ing')) {
    result = token.slice(0, -3);
  } else if (token.endsWith('ed')) {
    result = token.slice(0, -2);
  } else {
    return token;
  }
  if (result.length < 4) return token;
  return result;
}

function pushToken(out, token) {
  out.push(token);
  const s = stem(token);
  if (s !== token) out.push(s);
}

function tokenize(text) {
  const cleaned = String(text || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  const out = [];
  cleaned.split(/\s+/).filter(Boolean).forEach(function(raw) {
    if (STOPWORDS.has(raw)) return;
    pushToken(out, raw);
    raw.split('-').forEach(function(part) {
      if (part && !STOPWORDS.has(part)) pushToken(out, part);
    });
  });
  return out;
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function splitChunks(text, size, overlap) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let start = 0;
  while (start < words.length) {
    let end = start;
    let length = 0;
    while (end < words.length) {
      const wordLength = words[end].length + (end > start ? 1 : 0);
      if (length + wordLength > size) break;
      length += wordLength;
      end++;
    }
    if (end === start) end = start + 1;
    chunks.push(words.slice(start, end).join(' '));
    if (end >= words.length) break;
    let nextStart = end;
    let overlapChars = 0;
    while (nextStart > start && overlapChars < overlap) {
      nextStart--;
      overlapChars += words[nextStart].length + 1;
    }
    start = Math.max(nextStart, start + 1);
  }
  return chunks;
}

function snapWindow(text, start, end) {
  const dotBefore = text.lastIndexOf('. ', start);
  const nlBefore = text.lastIndexOf('\n', start);
  const boundaryStart = Math.max(dotBefore, nlBefore);
  const effectiveStart = boundaryStart !== -1 ? boundaryStart + 2 : start;
  const dotAfter = text.indexOf('. ', end);
  const nlAfter = text.indexOf('\n', end);
  let effectiveEnd;
  if (dotAfter !== -1 && nlAfter !== -1) effectiveEnd = Math.min(dotAfter, nlAfter);
  else if (dotAfter !== -1) effectiveEnd = dotAfter;
  else if (nlAfter !== -1) effectiveEnd = nlAfter;
  else effectiveEnd = text.length;
  let snip = text.slice(effectiveStart, effectiveEnd).trim();
  if (effectiveStart > 0) snip = '…' + snip;
  if (effectiveEnd < text.length) snip = snip + '…';
  if (snip.length > SNIPPET_MAX) snip = snip.slice(0, SNIPPET_MAX);
  return snip;
}

function makeSnippet(text, queryTokens, idf) {
  const lower = String(text || '').toLowerCase();
  let bestToken = null;
  let bestIdf = -1;
  let bestIdx = -1;
  queryTokens.forEach(function(token) {
    const idx = lower.indexOf(token);
    if (idx !== -1) {
      const w = idf[token] || 1;
      if (w > bestIdf) {
        bestIdf = w;
        bestToken = token;
        bestIdx = idx;
      }
    }
  });
  if (bestToken === null) {
    return String(text || '').slice(0, SNIPPET_MAX).trim();
  }
  const start = Math.max(0, bestIdx - SNIPPET_RADIUS);
  const end = Math.min(text.length, bestIdx + bestToken.length + SNIPPET_RADIUS);
  return snapWindow(text, start, end);
}

async function doBuild() {
  const start = Date.now();
  try {
    require('../models/Tag');
    const Article = require('../models/Article');
    const docs = await Article.find({ status: 'published' })
      .select('title slug excerpt content publishedAt tags')
      .populate('tags', 'name')
      .lean();

    const chunks = [];
    const titles = {};
    const tags = {};
    const publishedAt = {};
    const df = {};

    docs.forEach(function(doc) {
      const articleId = String(doc._id);
      const title = doc.title;
      const rawText = stripHtml(doc.content);
      if (!title || !rawText) return;
      const text = rawText || doc.excerpt || '';
      const titleParams = new Set(tokenize(String(title) + ' ' + String(doc.excerpt || '')));
      titles[articleId] = titleParams;
      const tagNames = (doc.tags || []).map(function(t) { return t && t.name; }).filter(Boolean).join(' ');
      const tagParams = tokenize(tagNames);
      tags[articleId] = new Set(tagParams);
      publishedAt[articleId] = doc.publishedAt ? new Date(doc.publishedAt).getTime() : 0;

      splitChunks(text, CHUNK_SIZE, CHUNK_OVERLAP).forEach(function(chunkText) {
        const tokens = tokenize(chunkText).concat(tagParams);
        const seen = {};
        tokens.forEach(function(token) {
          if (!seen[token]) {
            seen[token] = true;
            df[token] = (df[token] || 0) + 1;
          }
        });
        chunks.push({
          articleId: articleId,
          title: title,
          slug: doc.slug,
          text: chunkText,
          tokens: tokens
        });
      });
    });

    const nChunks = chunks.length;
    const idf = {};
    Object.keys(df).forEach(function(term) {
      idf[term] = 1 + Math.log((1 + nChunks) / (1 + df[term]));
    });

    index = {
      builtAt: Date.now(),
      articleCount: docs.length,
      chunks: chunks,
      idf: idf,
      titles: titles,
      tags: tags,
      publishedAt: publishedAt
    };

    stats.corpusSize = docs.length;
    stats.chunkCount = chunks.length;
    stats.builtAt = index.builtAt;
    stats.lastBuildMs = Date.now() - start;
    stats.lastError = null;

    return index;
  } catch (e) {
    index = { builtAt: 0, articleCount: 0, chunks: [], idf: {}, titles: {}, tags: {}, publishedAt: {} };
    stats.lastError = e && e.message ? e.message : String(e);
    stats.lastBuildMs = Date.now() - start;
    throw e;
  }
}

function init() {
  if (!buildingPromise) {
    buildingPromise = doBuild()
      .catch(function() { return null; })
      .finally(function() { buildingPromise = null; });
  }
  return buildingPromise;
}

function rebuildInBackground() {
  init().then(function() {
    console.log('[rag] background rebuild complete');
  }).catch(function(e) {
    console.warn('[rag] background rebuild failed', e && e.message ? e.message : String(e));
  });
}

function withTimeout(promise, ms) {
  let timer;
  const timeoutPromise = new Promise(function(_, reject) {
    timer = setTimeout(function() {
      reject(new Error('[rag] build timed out after ' + ms + 'ms'));
    }, ms);
  });
  return Promise.race([Promise.resolve(promise), timeoutPromise])
    .finally(function() { clearTimeout(timer); });
}

async function retrieve(query, k) {
  const limit = k || 4;
  const queryTokens = tokenize(query);
  try {
    stats.stale = (index.builtAt + INDEX_TTL < Date.now());
    const now = Date.now();
    const coldStart = index.articleCount === 0;
    const stale = now - index.builtAt > INDEX_TTL;

    if (coldStart) {
      try {
        await withTimeout(init(), INIT_TIMEOUT);
      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        console.warn(msg);
        stats.lastError = msg;
        return [];
      }
    } else if (stale) {
      rebuildInBackground();
    } else {
      const Article = require('../models/Article');
      try {
        const count = await withTimeout(Article.countDocuments({ status: 'published' }), INIT_TIMEOUT);
        if (typeof count === 'number' && count !== index.articleCount) {
          try {
            await withTimeout(init(), INIT_TIMEOUT);
          } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            console.warn(msg);
            stats.lastError = msg;
          }
        }
      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        console.warn(msg);
        stats.lastError = msg;
      }
    }

    if (!queryTokens.length || !index.chunks.length) return [];

    const idf = index.idf;
    const scored = [];
    index.chunks.forEach(function(chunk) {
      const counts = {};
      chunk.tokens.forEach(function(token) {
        counts[token] = (counts[token] || 0) + 1;
      });
      let tfidf = 0;
      queryTokens.forEach(function(token) {
        if (counts[token]) tfidf += counts[token] * (idf[token] || 1);
      });

      const titleParams = index.titles[chunk.articleId] || new Set();
      const seenTitle = {};
      let titleMatch = 0;
      queryTokens.forEach(function(token) {
        if (!seenTitle[token] && titleParams.has(token)) {
          seenTitle[token] = true;
          titleMatch++;
        }
      });
      const titleBoost = Math.min(TITLE_BOOST_CAP, titleMatch * TITLE_BOOST);

      const tagParams = index.tags[chunk.articleId] || new Set();
      const seenTag = {};
      let tagMatch = 0;
      queryTokens.forEach(function(token) {
        if (!seenTag[token] && tagParams.has(token)) {
          seenTag[token] = true;
          tagMatch++;
        }
      });
      const tagBoost = Math.min(TAG_BOOST_CAP, tagMatch * TAG_BOOST);

      const score = tfidf + titleBoost + tagBoost;
      if (score > 0) {
        scored.push({
          articleId: chunk.articleId,
          title: chunk.title,
          slug: chunk.slug,
          text: chunk.text,
          score: score,
          publishedAt: index.publishedAt[chunk.articleId] || 0
        });
      }
    });

    scored.sort(function(a, b) {
      return b.score - a.score;
    });

    const perArticle = {};
    scored.forEach(function(item) {
      if (!perArticle[item.articleId]) perArticle[item.articleId] = [];
      if (perArticle[item.articleId].length < 2) perArticle[item.articleId].push(item);
    });

    const results = [];
    Object.keys(perArticle).forEach(function(articleId) {
      const pair = perArticle[articleId];
      const best = pair[0];
      let score = best.score;
      if (pair.length > 1) score += SECOND_CHUNK_BONUS;
      results.push({
        title: best.title,
        slug: best.slug,
        url: BASE_URL + best.slug,
        snippet: makeSnippet(best.text, queryTokens, idf),
        score: round2(score),
        chunkCount: pair.length,
        publishedAt: best.publishedAt
      });
    });

    results.sort(function(a, b) {
      return b.score - a.score || (b.publishedAt || 0) - (a.publishedAt || 0);
    });

    return results.slice(0, limit).map(function(r) {
      return {
        title: r.title,
        slug: r.slug,
        url: r.url,
        snippet: r.snippet,
        score: r.score,
        chunkCount: r.chunkCount
      };
    });
  } catch (e) {
    stats.lastError = e && e.message ? e.message : String(e);
    return [];
  }
}

function getStats() {
  return {
    corpusSize: stats.corpusSize,
    chunkCount: stats.chunkCount,
    builtAt: stats.builtAt,
    stale: stats.stale,
    lastError: stats.lastError,
    lastBuildMs: stats.lastBuildMs
  };
}

init().catch(function(e) {
  console.warn('[rag] prewarm failed', e && e.message ? e.message : String(e));
});

module.exports = { init: init, retrieve: retrieve, getStats: getStats };
