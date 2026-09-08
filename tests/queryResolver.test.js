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

  test('OpenAI-style {role} entries are accepted too', () => {
    expect(hasUsableHistory([{ role: 'user', content: 'hello' }])).toBe(true);
    expect(hasUsableHistory([{ role: 'assistant', content: 'Hey!' }])).toBe(true);
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

  test('OpenAI-style {role} history is included', () => {
    const [, user] = buildRewritePrompt('more details', [{ role: 'assistant', content: 'The Lane Management System optimizes routing across 50-70 parameters.' }]);
    expect(user.content).toContain('Assistant: The Lane Management System optimizes routing');
  });

  test('client compaction summary (system message) is preserved', () => {
    const [, user] = buildRewritePrompt('in two lines', [
      { type: 'system', content: '[Earlier conversation summary] User: explain lms Assistant: routed logistics' },
      { type: 'assistant', content: 'The Lane Management System optimizes routing.' }
    ]);
    expect(user.content).toContain('Summary of earlier conversation:');
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