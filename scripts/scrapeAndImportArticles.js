const axios = require('axios');
const Parser = require('rss-parser');

const API_BASE = 'https://api.buildwithhimanshu.com/api';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MWYxNjQ3MTQ3MmY1NmMyNGFjZTQzMyIsImlhdCI6MTc0Njg3ODMxMCwiZXhwIjoxNzU0NjU0MzEwfQ.4JLeCMUmWVfojBW2UYUvx-xXJL41zTq8J7kRf9SCgfY';

async function fetchArticleLinks() {
  const parser = new Parser();
  const feed = await parser.parseURL('https://dev.to/feed');
  // Each item is an article
  return feed.items.slice(0, 10); // Limit to 10 articles for demo
}

function mapTypeFromTags(tags) {
  const technicalTags = ['javascript', 'python', 'webdev', 'react', 'programming', 'code', 'tutorial', 'devops', 'typescript', 'css', 'html', 'node', 'api', 'database'];
  const newsTags = ['news', 'announcement', 'update', 'release'];
  const storytellingTags = ['story', 'life', 'career', 'journey', 'experience', 'personal'];

  const lowerTags = tags.map(t => t.toLowerCase());

  if (lowerTags.some(tag => technicalTags.includes(tag))) return 'technical';
  if (lowerTags.some(tag => newsTags.includes(tag))) return 'news';
  if (lowerTags.some(tag => storytellingTags.includes(tag))) return 'storytelling';
  return 'other';
}

async function fetchArticleData(item) {
  // item is already parsed from RSS
  const title = item.title;
  const content = item['content:encoded'] || item.content || '';
  const tags = (item.categories || []).map(tag => tag.trim());
  const type = mapTypeFromTags(tags);
  return { title, content, tags, type };
}

async function ensureTag(tag) {
  try {
    const res = await axios.post(
      `${API_BASE}/tags`,
      { name: tag },
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    return res.data.data?._id || res.data.data?.id;
  } catch (err) {
    // Handle duplicate key error even if backend returns 500
    const msg = err.response && err.response.data && err.response.data.message;
    if ((msg && msg.includes('duplicate')) || (err.response && err.response.status === 500)) {
      // Fetch existing tag
      const res = await axios.get(`${API_BASE}/tags?name=${encodeURIComponent(tag)}`);
      if (res.data.data && res.data.data.length > 0) {
        return res.data.data[0]._id;
      }
    }
    throw err;
  }
}

async function ensureType(type) {
  try {
    const res = await axios.post(
      `${API_BASE}/types`,
      { name: type },
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    return res.data.data?._id || res.data.data?.id;
  } catch (err) {
    // Handle duplicate key error even if backend returns 500
    const msg = err.response && err.response.data && err.response.data.message;
    if ((msg && msg.includes('duplicate')) || (err.response && err.response.status === 500)) {
      // Fetch existing type
      const res = await axios.get(`${API_BASE}/types?name=${encodeURIComponent(type)}`);
      if (res.data.data && res.data.data.length > 0) {
        return res.data.data[0]._id;
      }
    }
    throw err;
  }
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^a-z0-9\-]/g, '')    // Remove all non-alphanumeric except -
    .replace(/-+/g, '-')             // Replace multiple - with single -
    .replace(/^-+|-+$/g, '');        // Trim - from start/end
}

async function articleExists(slug) {
  const res = await axios.get(`${API_BASE}/articles?slug=${encodeURIComponent(slug)}`);
  return res.data.data && res.data.data.length > 0;
}

function getExcerpt(html, maxLength = 200) {
  // Remove HTML tags and trim to maxLength (including '...')
  const text = html.replace(/<[^>]+>/g, '').trim();
  if (text.length > maxLength) {
    return text.slice(0, maxLength - 3) + '...';
  }
  return text;
}

async function createArticle(article) {
  const tagIds = [];
  for (const tag of article.tags) {
    tagIds.push(await ensureTag(tag));
  }
  const typeId = await ensureType(article.type);
  const payload = {
    title: article.title,
    slug: slugify(article.title),
    content: article.content,
    tags: tagIds,
    type: typeId,
    excerpt: getExcerpt(article.content, 200),
    // Add other fields as needed
  };
  const res = await axios.post(
    `${API_BASE}/articles`,
    payload,
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
  );
  return res.data;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  try {
    const items = await fetchArticleLinks();
    console.log(`Found ${items.length} articles.`);
    for (const item of items) {
      console.log('Importing:', item.link);
      const article = await fetchArticleData(item);
      const slug = slugify(article.title);
      if (await articleExists(slug)) {
        console.log(`Skipped: Article with slug "${slug}" already exists.`);
        continue;
      }
      const result = await createArticle(article);
      console.log('Imported:', result.data?.title || article.title);
      await sleep(1500); // Wait 1.5 seconds between each article
    }
    console.log('All articles imported!');
  } catch (err) {
    if (err.response) {
      console.error('Error:', {
        status: err.response.status,
        data: err.response.data
      });
    } else {
      console.error('Error:', err.message);
    }
  }
})(); 