const { hasUsableHistory, buildRewritePrompt } = require('../utils/queryResolver');

describe('queryResolver: hasUsableHistory is the only LLM-rewrite gate', () => {
  test('empty / null / irrelevant history -> false', () => {
    expect(hasUsableHistory([])).toBe(false);
    expect(hasUsableHistory(null)).toBe(false);
    expect(hasUsableHistory(undefined)).toBe(false);
    expect(hasUsableHistory('not-an-array')).toBe(false);
  });

  test('history with a real user or assistant turn -> true', () => {
    expect(hasUsableHistory([{ type: 'user', content: 'hello' }])).toBe(true);
    expect(hasUsableHistory([{ type: 'assistant', content: 'Hi there!' }])).toBe(true);
  });

  test('whitespace-only turns are ignored', () => {
    expect(hasUsableHistory([{ type: 'user', content: '   ' }])).toBe(false);
  });
});

describe('queryResolver: buildRewritePrompt carries the follow-up input', () => {
  const history = [
    { type: 'user', content: 'projects' },
    { type: 'assistant', content: 'Here are some of Himanshu key projects: AI-powered analytics assistant, Lane Management System.' }
  ];

  test('prompt includes the current query as Follow Up Input', () => {
    const [system, user] = buildRewritePrompt('in 2 points', history);
    expect(user.content).toContain('Follow Up Input: in 2 points');
    expect(user.content).toContain('Standalone question:');
    expect(user.content).toContain('User: projects');
    expect(user.content).toContain('Assistant: Here are some of Himanshu key projects');
    expect(system.role).toBe('system');
  });

  test('prompt requires verbatim output for self-contained queries', () => {
    const [, user] = buildRewritePrompt('what is priceiq', history);
    expect(user.content).toContain('re-output it verbatim');
  });

  test('works with no history too', () => {
    const [, user] = buildRewritePrompt('in bullet points', []);
    expect(user.content).toContain('Follow Up Input: in bullet points');
  });
});