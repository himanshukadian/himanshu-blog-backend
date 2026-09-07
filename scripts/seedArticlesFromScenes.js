require('dotenv').config();
const mongoose = require('mongoose');
const slugify = require('slugify');

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.useDb('test');

  const users = await db.collection('users').find().toArray();
  const author = users.find((u) => ['admin', 'author'].includes(u.role)) || users[0];
  if (!author) throw new Error('No users in DB to author articles');

  const type = (await db.collection('types').findOne({ slug: 'technical' })) ||
    (await db.collection('types').findOne({ name: { $regex: /^technical$/i } }));
  const tag = await db.collection('tags').findOne({ slug: 'system-design' });

  const chapters = await db.collection('chapters').find({}).sort({ order: 1 }).toArray();
  const scenes = await db.collection('scenes').find({}).sort({ _id: 1 }).toArray();

  const articles = [];
  const seen = new Set();
  for (const c of chapters) {
    const chScenes = scenes.filter((s) => String(s.chapterId) === String(c._id));
    for (const s of chScenes) {
      const title = s.title || c.title;
      const dialogue = String(s.dialogue || '').trim();
      if (!title || !dialogue) continue;
      const content = `# ${title}\n\n${dialogue}\n\n*(From the "${c.title}" chapter of the System Design course.)*`;
      let slug = slugify(`${c.title} ${title}`, { lower: true, strict: true });
      if (seen.has(slug)) slug += `-${s._id.toString().slice(-4)}`;
      seen.add(slug);
      const words = content.split(/\s+/).length;
      const created = s.createdAt || c.createdAt || new Date();
      articles.push({
        title,
        slug,
        content,
        excerpt: dialogue.length > 200 ? dialogue.slice(0, 200) + '…' : dialogue,
        coverImage: { url: '', alt: title, caption: '' },
        author: author._id,
        tags: tag ? [tag._id] : [],
        type: type ? type._id : null,
        status: 'published',
        featured: false,
        seo: { title, description: (dialogue || '').slice(0, 160), keywords: ['system design'], ogImage: '' },
        readingTime: Math.max(1, Math.ceil(words / 200)),
        stats: { views: (s.stats && s.stats.views) || 0, likes: 0, shares: 0, comments: 0 },
        likedBy: [],
        publishedAt: created,
        createdAt: created,
        updatedAt: s.updatedAt || new Date(),
      });
    }
  }

  // Article-type-less fallback: seed from posts collection too
  for (const p of await db.collection('posts').find({}).toArray()) {
    if (!p.title || !p.content) continue;
    let slug = slugify(p.title, { lower: true, strict: true });
    if (seen.has(slug)) slug += `-post`;
    seen.add(slug);
    const words = String(p.content).split(/\s+/).length;
    const created = p.createdAt || new Date();
    articles.push({
      title: p.title,
      slug,
      content: `# ${p.title}\n\n${p.content}`,
      excerpt: p.summary || String(p.content).slice(0, 200),
      coverImage: p.coverImage ? { url: p.coverImage, alt: p.title, caption: '' } : { url: '', alt: p.title },
      author: author._id,
      tags: [],
      type: type ? type._id : null,
      status: 'published',
      featured: p.featured || false,
      seo: { title: p.title, description: (p.summary || ''), keywords: [], ogImage: '' },
      readingTime: Math.max(1, Math.ceil(words / 200)),
      stats: { views: p.views || 0, likes: 0, shares: 0, comments: 0 },
      likedBy: [],
      publishedAt: created,
      createdAt: created,
      updatedAt: p.updatedAt || new Date(),
    });
  }

  if (!articles.length) {
    console.log('Nothing to seed (no scenes/posts found)');
    return;
  }

  await db.collection('articles').deleteMany({});
  const res = await db.collection('articles').insertMany(articles, { ordered: false });
  console.log('inserted articles:', res.insertedCount);

  if (type) {
    await db.collection('types').updateOne(
      { _id: type._id },
      { $set: { 'stats.articles': res.insertedCount } }
    );
    console.log('type stats updated:', type.slug);
  }
  await mongoose.disconnect();
  console.log('done');
}

main().catch((e) => { console.error('ERR', e); process.exit(1); });