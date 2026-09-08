const normalizeQuery = (query) => {
  return String(query || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/([a-z0-9])\1{2,}/g, '$1$1')
    .replace(/([!?.,])\1+/g, '$1')
    .replace(/[’']/g, "'")
    .trim();
};

function damerauLevenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
      }
    }
  }
  return d[m][n];
}

const similarity = (a, b) => {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - damerauLevenshtein(a, b) / maxLen;
};

const SEEDS = {
  meeting: [
    'set up a meeting', 'set up meeting', 'setup meeting', 'setup a meeting',
    'schedule a meeting', 'schedule meeting', 'book a meeting', 'book meeting',
    'schedule a call', 'book a call', 'set up a call', 'arrange a meeting',
    'wanna talk', 'i want to talk', 'let us catch up', "let's catch up",
    'get on a call', 'find a time', 'when are you free', 'free time',
    'are you available', 'book a slot', 'available slots', 'can we talk',
    'wanna have a call', 'can we talk tomorrow', 'i need a meeting',
    'lets have a call', 'set a meeting'
  ],
  contact: [
    'email address', 'your email', 'his email', 'contact details', 'contact info',
    'contact information', 'how to contact you', 'how do i contact',
    'how can i contact', 'how do i contact himanshu', 'get in touch with you',
    'your linkedin', 'your github', 'your phone number', 'reach you',
    'how to reach himanshu'
  ],
  projects: [
    'show me your projects', 'show your projects', 'list your projects',
    'list projects', 'all your projects', 'what projects have you built',
    'what projects have you built so far', 'projects you built', 'your projects',
    'view your projects', 'portfolio projects', 'what have you built',
    'what projects have you created', 'projects you have built'
  ]
};

const WINDOW = [2, 3, 4, 5, 6];

const bestMatch = (normQ) => {
  const tokens = normQ.split(' ').filter(Boolean);
  const results = { meeting: 0, contact: 0, projects: 0 };

  for (const size of WINDOW) {
    for (let i = 0; i + size <= tokens.length; i++) {
      const windowText = tokens.slice(i, i + size).join(' ');
      for (const intent of Object.keys(SEEDS)) {
        for (const seed of SEEDS[intent]) {
          const sim = similarity(windowText, seed);
          if (sim > results[intent]) results[intent] = sim;
        }
      }
    }
  }

  return results;
};

const classifyIntent = (query) => {
  const normQ = normalizeQuery(query);
  if (!normQ) return null;

  const scores = bestMatch(normQ);
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  const ACCEPT_THRESHOLD = 0.8;
  const MARGIN_THRESHOLD = 0.15;

  const best = sorted[0];
  const second = sorted[1];

  if (!best || best[1] < ACCEPT_THRESHOLD) return null;
  if (best[1] - second[1] < MARGIN_THRESHOLD) return null;

  return { intent: best[0], score: best[1], normalized: normQ };
};

module.exports = {
  normalizeQuery,
  classifyIntent,
  damerauLevenshtein,
  similarity,
  bestMatch
};