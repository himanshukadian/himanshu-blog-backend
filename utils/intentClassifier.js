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

// ---------------------------------------------------------------------------
// Tier 1: exact (regex) intent rules. Anchored to real phrasings, with
// negative patterns that push elaboration/single-subject queries toward the
// LLM instead of a deterministic router. Contest between intents => LLM.
// ---------------------------------------------------------------------------

const WRITING_LIST_PATTERNS = [
  /(^|\b)(all|list|show|see|browse|view)\b[^?.]{0,50}\b(blogs?|articles?|writing|writings|posts?)\b/i,
  /^(what have you written|your blog posts|blog posts|all your writing|blogs you've written)$/i
];

const WRITING_LIST_EXCLUDES = /(explain|summar|tell me about|what is |what's |how |why |read|viewed|understood)/i;

const isWritingListIntent = (nq) => {
  const matched = WRITING_LIST_PATTERNS.some((re) => re.test(nq));
  return matched && !WRITING_LIST_EXCLUDES.test(nq);
};

const CONTACT_PATTERNS = /(email|e-?mail|contact|@|phone|number|linkedin|github|social|get in touch|reach (out |you )?|details|how (to|do|can) i (reach|contact|email|message)|message (him|himanshu))/i;

const CONTACT_EXCLUDES = /(article|blog|resume|job|role|explain|summar|writing)/i;

const isContactIntent = (nq) => {
  return CONTACT_PATTERNS.test(nq) && !CONTACT_EXCLUDES.test(nq);
};

// A "list my projects" request: plural collection listing. Elaborations about
// a SPECIFIC project (default-demonstrative "this/that/the project", "points
// /details/more about", architecture/tech-stack/deep-dive asks) are NOT list
// intents — they fall through to the LLM which answers from context/facts.
const PROJECTS_LIST_SIGNALS = /(list|show|see|view|all|portfolio|built|build|made|created|worked on|what)/i;

const PROJECTS_LIST_EXCLUDES = [
  /(this|that|the)\s+project(s)?\b/,
  /\b\d+\s+points?\b/,
  /\bpoints?\s+about\b/,
  /\bdetails?\s+(about|of|on)\b/,
  /\bmore\s+about\b/,
  /\bfeatures?\s+of\b/,
  /\bcomponents?\s+of\b/,
  /\barchitecture\b/,
  /\btech\s*stack\b/,
  /(explain|summar|article|blog|writing|how does|why i built|did you build)/i,
  /(main|key|top|important)\s+points?\b/
];

const isProjectsListIntent = (nq) => {
  if (!/\bproject(s)?\b/i.test(nq)) return false;
  if (!PROJECTS_LIST_SIGNALS.test(nq)) return false;
  if (PROJECTS_LIST_EXCLUDES.some((re) => re.test(nq))) return false;
  return true;
};

const MEETING_INTENT =
  /(?:let'?s?\s+(?:set\s*up|setup|meet|talk|connect|chat)|(?:set\s*up|setup|schedule|book|reserve|arrange|plan)\s+(?:a\s+)?(?:meeting|call|chat|session|appointment|slot|time)|wanna\s+(?:have\s+a\s+)?(?:talk|call|meeting)|let'?s?\s+catch\s+up|get\s+on\s+a\s+call|lock\s+in\s+a\s+slot|find\s+a\s+time|availab|avail|slot|slots|calendly|timezone|when\s+(?:are|is)\s+(?:you|he)\s+free|free\s+time|coordinat|how\s+can\s+i\s+(?:schedule|book|arrange)|get\s+in\s+touch|reach\s+out|want\s+(?:to\s+)?(?:meet|schedule|book)|need\s+(?:a\s+)?(?:meeting|call|time|slot))/i;

const MEETING_EXCLUDES =
  /(?:articles?|blog|writing|learned|explain|summar|price\s?iq|cli|agent|distributed|post|read|what did|how did|why did)/i;

const isMeetingIntent = (nq) => MEETING_INTENT.test(nq) && !MEETING_EXCLUDES.test(nq);

const isArticleRelated = (nq) => {
  return /(article|blog|writing|writings|write|posts?|published|summariz|explain|what .*learned|lessons|price ?iq|cli|distributed systems|ai agents|mcp|terminal|portfolio as a terminal)/i.test(nq);
};

const FUZZY_MEETING_GUARD =
  /(article|blog|writing|explain|summar|resume|job|price ?iq|cli|distributed|terminal|read)/i;

// Full routing: exact regex tier first (single uncontested hit wins),
// then fuzzy tier (meeting only), else null so the caller falls back to LLM.
const routeIntent = (query) => {
  const nq = normalizeQuery(query);
  if (!nq) return null;

  const hits = [];
  if (isWritingListIntent(nq)) hits.push('writing-list');
  if (isContactIntent(nq)) hits.push('contact');
  if (isProjectsListIntent(nq)) hits.push('projects');
  if (isMeetingIntent(nq)) hits.push('meeting');

  if (hits.length === 1) return { intent: hits[0], tier: 'exact' };
  if (hits.length > 1) return null;

  const fuzzy = classifyIntent(nq);
  if (fuzzy && fuzzy.intent === 'meeting' && !FUZZY_MEETING_GUARD.test(nq)) {
    return { intent: 'meeting', tier: 'fuzzy', score: fuzzy.score };
  }

  return null;
};

module.exports = {
  normalizeQuery,
  classifyIntent,
  routeIntent,
  isMeetingIntent,
  isContactIntent,
  isProjectsListIntent,
  isWritingListIntent,
  isArticleRelated,
  damerauLevenshtein,
  similarity,
  bestMatch
};