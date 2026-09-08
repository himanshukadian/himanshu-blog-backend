const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'for', 'to', 'of', 'in', 'on', 'with', 'at', 'i', 'you', 'he', 'she', 'it', 'is', 'are', 'was', 'were', 'be', 'has', 'have', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'should', 'this', 'that', 'these', 'those', 'my', 'your', 'about', 'how', 'what', 'why', 'when', 'where', 'from', 'by', 'as', 'into', 'over', 'then']);

const INDEX_TTL = 10 * 60 * 1000;
const INIT_TIMEOUT = 5 * 1000;
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;
const TITLE_BOOST = 4;
const SNIPPET_LENGTH = 280;
const BASE_URL = 'https://blog.buildwithhimanshu.com/';

let index = {
  builtAt: 0,
  articleCount: 0,
  chunks: [],
  idf: {},
  titles: {}
};

function tokenize(text) {
  const cleaned = String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
  return cleaned.split(/\s+/).filter(Boolean).filter(function(word) {
    return !STOPWORDS.has(word);
  });
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

async function init() {
  try {
    const Article = require('../models/Article');
    const docs = await Article.find({ status: 'published' })
      .select('title slug excerpt content publishedAt')
      .lean();

    const chunks = [];
    const titles = {};
    const df = {};

    docs.forEach(function(doc) {
      const articleId = String(doc._id);
      let text = stripHtml(doc.content);
      if (!text) text = doc.excerpt || '';
      const titleText = String(doc.title || '') + ' ' + String(doc.excerpt || '');
      titles[articleId] = new Set(tokenize(titleText));
      splitChunks(text, CHUNK_SIZE, CHUNK_OVERLAP).forEach(function(chunkText) {
        const tokens = tokenize(chunkText);
        const seen = {};
        tokens.forEach(function(token) {
          if (!seen[token]) {
            seen[token] = true;
            df[token] = (df[token] || 0) + 1;
          }
        });
        chunks.push({
          articleId: articleId,
          title: doc.title,
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
      titles: titles
    };

    return chunks;
  } catch (e) {
    index = { builtAt: 0, articleCount: 0, chunks: [], idf: {}, titles: {} };
    return [];
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    Promise.resolve(promise),
    new Promise(function(resolve) {
      setTimeout(function() { resolve([]); }, ms);
    })
  ]);
}

async function retrieve(query, k) {
  const limit = k || 4;
  try {
    if (index.articleCount === 0 || Date.now() - index.builtAt > INDEX_TTL) {
      await withTimeout(init(), INIT_TIMEOUT);
    } else {
      const Article = require('../models/Article');
      const count = await withTimeout(Article.countDocuments({ status: 'published' }), INIT_TIMEOUT);
      if (typeof count === 'number' && count !== index.articleCount) {
        await withTimeout(init(), INIT_TIMEOUT);
      }
    }

    const queryTokens = tokenize(query);
    if (!queryTokens.length || !index.chunks.length) return [];

    const scored = [];
    index.chunks.forEach(function(chunk) {
      const counts = {};
      chunk.tokens.forEach(function(token) {
        counts[token] = (counts[token] || 0) + 1;
      });
      const titleTokens = index.titles[chunk.articleId] || new Set();
      let score = 0;
      queryTokens.forEach(function(token) {
        if (counts[token]) score += counts[token] * (index.idf[token] || 1);
        if (titleTokens.has(token)) score += TITLE_BOOST;
      });
      if (score > 0) {
        scored.push({
          articleId: chunk.articleId,
          title: chunk.title,
          slug: chunk.slug,
          text: chunk.text,
          score: score
        });
      }
    });

    scored.sort(function(a, b) {
      return b.score - a.score;
    });

    const seen = {};
    const results = [];
    for (let i = 0; i < scored.length && results.length < limit; i++) {
      const item = scored[i];
      if (seen[item.articleId]) continue;
      seen[item.articleId] = true;
      results.push({
        title: item.title,
        slug: item.slug,
        url: BASE_URL + item.slug,
        snippet: String(item.text || '').slice(0, SNIPPET_LENGTH).trim(),
        score: item.score
      });
    }

    return results;
  } catch (e) {
    return [];
  }
}

module.exports = { init: init, retrieve: retrieve };