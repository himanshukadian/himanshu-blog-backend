const { classifyIntent, routeIntent, normalizeQuery } = require('../utils/intentClassifier');

const expectIntent = (query, intent) => {
  const result = classifyIntent(query);
  expect(result && result.intent).toBe(intent);
};

const expectRoute = (query, intent) => {
  const result = routeIntent(query);
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

describe('golden set: typos must resolve to the right intent (fuzzy tier)', () => {
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

describe('golden set: out-of-scope queries must NOT match fuzzy', () => {
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

describe('routing tier: single-article elaboration must NOT match projects list', () => {
  const regressions = [
    'list 4 main points about this project',
    'more about High-throughput monitoring & insights platform',
    'tell me 5 key points about the lane management system',
    'what is the architecture of the high-throughput platform'
  ];

  test.each(regressions)('%s -> NOT projects', (query) => {
    const r = routeIntent(query);
    expect(r === null || r.intent !== 'projects').toBe(true);
  });
});

describe('routing tier: genuine projects list still routes to projects', () => {
  const cases = [
    ['show me all your projects', 'projects'],
    ['list yor projects', 'projects'],
    ['wat projects have u built', 'projects'],
    ['what projects have you built so far', 'projects']
  ];

  test.each(cases)('%s -> %s', (query, intent) => {
    expectRoute(query, intent);
  });
});

describe('routing tier: regression queries route to the right intent', () => {
  const cases = [
    ['email address of himanshu', 'contact'],
    ['setuppppppp meeeetinggggg', 'meeting'],
    ['all your writing', 'writing-list'],
    ['summarize the AI agents article', null],
    ['invite', 'meeting'],
    ['connect', 'meeting'],
    ['collaborate', 'meeting'],
    ['collaboration', 'meeting'],
    ['touch base', 'meeting'],
    ['can we connect', 'meeting'],
    ['want to collaborate', 'meeting'],
    ['sending you an invite', 'meeting'],
    ['invite me to your github', 'contact'],
    ['connect with himanshu on linkedin', 'contact'],
    ['open to collab', 'meeting']
  ];

  test.each(cases)('%s -> %s', (query, intent) => {
    const r = routeIntent(query);
    expect(r ? r.intent : null).toBe(intent);
  });
});