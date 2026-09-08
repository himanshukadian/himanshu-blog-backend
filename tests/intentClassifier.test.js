const { classifyIntent, normalizeQuery } = require('../utils/intentClassifier');

const expectIntent = (query, intent) => {
  const result = classifyIntent(query);
  expect(result && result.intent).toBe(intent);
};

describe('normalizeQuery', () => {
  test('collapses extra repeated letters and whitespace', () => {
    expect(normalizeQuery('setuppppppp   meeeetinggggg')).toBe('setupp meetingg');
  });

  test('lowercases and trims', () => {
    expect(normalizeQuery('  SHOW Me tHE prajjects  ')).toBe('show me the prajjects');
  });
});

describe('golden set: typos must resolve to the right intent', () => {
  const cases = [
    ['setuppppppp meeeetinggggg', 'meeting'],
    ['set up a metting', 'meeting'],
    ['schedule a cull with himanshu', 'meeting'],
    ['book a slot', 'meeting'],
    ['can we talk tomorow?', 'meeting'],
    ['wanna hav a call', 'meeting'],
    ['setupp a meteeng', 'meeting'],
    ['show me all ur projects', 'projects'],
    ['list yor projects', 'projects'],
    ['wat projects have u built', 'projects'],
    ['email address of himanshu', 'contact'],
    ['hows do i contact himanshu', 'contact'],
    ['his email?', 'contact']
  ];

  test.each(cases)('%s -> %s', (query, intent) => {
    expectIntent(query, intent);
  });
});

describe('golden set: out-of-scope queries must NOT match', () => {
  const cases = [
    'summarize the AI agents article',
    'what did you learn building priceiq',
    'tell me about the cli terminal',
    'why did you build the distributed system',
    'explain the mcp article'
  ];

  test.each(cases)('%s -> null', (query) => {
    expect(classifyIntent(query)).toBeNull();
  });
});