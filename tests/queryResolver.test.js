const { resolveQuery } = require('../utils/queryResolver');

describe('queryResolver: anaphoric follow-ups resolve against prior topic', () => {
  const history = [
    { type: 'user', content: 'AI work' },
    { type: 'assistant', content: 'Himanshu is passionate about AI and LLMs, built an AI-powered analytics assistant.' }
  ];

  test('"is there article on it" -> carries the AI topic', () => {
    const resolved = resolveQuery('is there article on it', history);
    expect(resolved).not.toBeNull();
    expect(resolved).toMatch(/ai/);
    expect(resolved).toMatch(/work/);
  });

  test('"any posts on that" -> carries the AI topic', () => {
    const resolved = resolveQuery('any posts on that', history);
    expect(resolved).not.toBeNull();
    expect(resolved).toMatch(/ai/);
  });

  test('"is there one like this?" after an article turn -> carries prior topic', () => {
    const h = [
      { type: 'user', content: 'show me the distributed systems article' },
      { type: 'assistant', content: 'Here is the high-throughput monitoring platform article.' }
    ];
    const resolved = resolveQuery('is there one like this?', h);
    expect(resolved).not.toBeNull();
    expect(resolved).toMatch(/distribut/);
  });
});

describe('queryResolver: self-contained queries are untouched', () => {
  const history = [
    { type: 'user', content: 'AI work' },
    { type: 'assistant', content: 'Himanshu is passionate about AI.' }
  ];

  test('rich marker-free query -> null (no rewrite)', () => {
    expect(resolveQuery('summarize the AI agents article', history)).toBeNull();
    expect(resolveQuery('show me all ur projects', history)).toBeNull();
  });

  test('no history -> null (cannot resolve)', () => {
    expect(resolveQuery('is there article on it', [])).toBeNull();
  });

  test('history ends with same query (dup) is skipped', () => {
    const dupHistory = [...history, { type: 'user', content: 'is there article on it' }];
    const resolved = resolveQuery('is there article on it', dupHistory);
    expect(resolved).not.toBeNull();
    expect(resolved).toMatch(/ai/);
  });
});