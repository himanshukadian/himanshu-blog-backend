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

describe('cosine supplement tier: paraphrases Damerau misses route to meeting', () => {
  const cases = ['when would be a good time to connect', 'how about we meet up'];

  test.each(cases)('%s -> meeting (cosine)', (query) => {
    const r = routeIntent(query);
    expect(r).toMatchObject({ intent: 'meeting', tier: 'cosine' });
    expect(r.score).toBeGreaterThanOrEqual(0.3);
  });
});

describe('cosine supplement tier: must NOT create false positives', () => {
  const cases = [
    'summarize the AI agents article',
    'invite me to your github',
    'connect with himanshu on linkedin',
    'list 4 main points about this project',
    'what did you learn building priceiq',
    'discuss the mcp article',
    'explain the distributed system article',
    'tell me about the cli terminal',
    'what articles did you write about distributed systems'
  ];

  test.each(cases)('%s -> NOT meeting (no false positive)', (query) => {
    const r = routeIntent(query);
    expect(r ? r.intent : null).not.toBe('meeting');
  });
});

describe('writing-search intent: presence queries route to writing-search', () => {
  const cases = [
    'is there article on it',
    'is there an article about ai',
    'any posts on kafka',
    'do you have a blog about backups',
    'wrote anything about distributed systems',
    'have you written about mcp',
    'is there a post about the cli'
  ];

  test.each(cases)('%s -> writing-search', (query) => {
    const r = routeIntent(query);
    expect(r ? r.intent : null).toBe('writing-search');
  });
});

describe('writing-search intent: digest/list/out-of-scope must NOT match', () => {
  const cases = [
    ['summarize the AI agents article', null],
    ['explain the distributed system article', null],
    ['what did you learn building priceiq', null],
    ['tell me about the priceiq post', null],
    ['all your articles', 'writing-list'],
    ['list 4 main points about this project', null],
    ['email address of himanshu', 'contact']
  ];

  test.each(cases)('%s -> %s', (query, intent) => {
    const r = routeIntent(query);
    expect(r ? r.intent : null).toBe(intent);
  });
});