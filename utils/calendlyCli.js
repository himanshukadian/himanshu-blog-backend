const { execFile } = require('child_process');
const util = require('util');

const execFileAsync = util.promisify(execFile);

const CALENDLY_BIN = require.resolve('calendly-cli');

const CALENDLY_TOKEN = process.env.CALENDLY_TOKEN || '';
const IS_CONFIGURED = Boolean(CALENDLY_TOKEN);

function deriveUserUri(token) {
  try {
    const payload = token.split('.')[1];
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    const claims = JSON.parse(Buffer.from(padded, 'base64url').toString('utf8'));
    if (claims && claims.user_uuid) {
      return `https://api.calendly.com/users/${claims.user_uuid}`;
    }
  } catch (e) {
    // fall through
  }
  return '';
}

const USER_URI = deriveUserUri(CALENDLY_TOKEN);

// Get a listing of your active event types
async function listActiveEventTypes() {
  if (!IS_CONFIGURED) return { configured: false, eventTypes: [] };

  const args = [
    CALENDLY_BIN,
        '--token', CALENDLY_TOKEN,
    'event-types', 'list',
    '--active',
    '--count', '50',
    '--fields', 'uri,name,slug,active,duration,scheduling_url'
  ];
  if (USER_URI) args.push('--user', USER_URI);

  try {
    const { stdout } = await execFileAsync(process.execPath, args);

    const parsed = JSON.parse(stdout);
    const collection = (parsed && parsed.collection) || (parsed && parsed.data) || [];

    return {
      configured: true,
      eventTypes: collection.map((et) => ({
        uri: et.uri,
        name: et.name,
        slug: et.slug,
        active: et.active,
        duration: et.duration,
        schedulingUrl: et.scheduling_url || et.url || ''
      }))
    };
  } catch (err) {
    return { configured: true, error: err.message, eventTypes: [] };
  }
}

async function resolveEventType() {
  const result = await listActiveEventTypes();
  if (!result.configured) {
    return { configured: false, eventType: null, reason: 'CALENDLY_TOKEN not set' };
  }
  if (result.error) {
    return { configured: true, eventType: null, reason: result.error };
  }

  const eventType = result.eventTypes.find((et) => et.schedulingUrl) || result.eventTypes[0] || null;
  return { configured: true, eventType, reason: eventType ? null : 'No active event types found' };
}

// Calendly requires the availability window start_time to be strictly in the future and
// aligned to the slot grid (30-min). Otherwise it returns VALIDATION_ERROR / empty.
function alignFuture(date) {
  const aligned = new Date(date);
  aligned.setUTCSeconds(0, 0);
  if (aligned.getUTCMinutes() % 30 !== 0) {
    aligned.setUTCMinutes(aligned.getUTCMinutes() + (30 - (aligned.getUTCMinutes() % 30)));
  }
  if (aligned.getTime() <= Date.now() + 1000) {
    aligned.setUTCMinutes(aligned.getUTCMinutes() + 30);
  }
  return aligned;
}

// Resolve the event type and return real open slots formatted for the UI (max 7-day windows)
async function getEventTimesByDuration(days = 14) {
  if (!IS_CONFIGURED) return { configured: false, slots: [] };

  const resolved = await resolveEventType();
  if (!resolved.eventType) return { configured: true, slots: [], error: resolved.reason || 'No event type resolved' };

  const windows = [];
  const now = alignFuture(new Date());
  const capped = Math.min(days, 21); // max ~3 windows of 7 days
  for (let i = 0; i < capped; i += 7) {
    const start = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + (i + 7) * 24 * 60 * 60 * 1000);
    windows.push({ startTime: start.toISOString(), endTime: end.toISOString() });
  }

  const slots = [];
  for (const window of windows) {
    let result = await getEventTimes(resolved.eventType.uri, window);
    if ((!result.slots || !result.slots.length) && result.error) {
      result = await getEventTimes(resolved.eventType.uri, { ...window, startTime: alignFuture(new Date(now.getTime() + 30 * 60 * 1000)).toISOString() });
    }
    if (result.slots && result.slots.length) slots.push(...result.slots);
    if (slots.length >= 20) break;
  }

  return {
    configured: true,
    slots: slots.slice(0, 20).map((slot) => ({
      datetime: slot.startTime,
      display: formatSlotDisplay(new Date(slot.startTime)),
      timezone: 'Asia/Kolkata',
      available: true,
      uri: slot.uri
    }))
  };
}

function formatSlotDisplay(date) {
  const options = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata'
  };
  return date.toLocaleDateString('en-IN', options);
}

// Create a one-off event type for a single scheduling session (returns a booking URL)
async function getEventTimes(eventTypeUri, { startTime, endTime, timezone = 'Asia/Kolkata' } = {}) {
  if (!IS_CONFIGURED) return { configured: false, slots: [] };
  if (!eventTypeUri) return { configured: true, slots: [], error: 'No event type URI' };

  const now = new Date();
  const start = startTime || alignFuture(now).toISOString();
  const end = endTime || new Date(new Date(start).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days max

  const args = [
    CALENDLY_BIN,
        '--token', CALENDLY_TOKEN,
    'availability', 'event-times',
    '--event-type', eventTypeUri,
    '--start-time', start,
    '--end-time', end,
    '--timezone', timezone,
    '--fields', 'uri,start_time,end_time,status,slug,url'
  ];

  try {
    const { stdout } = await execFileAsync(process.execPath, args);
    const parsed = JSON.parse(stdout);
    const collection = (parsed && parsed.collection) || [];
    const slots = collection.map((item) => ({
      uri: item.uri,
      slug: item.slug,
      startTime: item.start_time,
      endTime: item.end_time,
      status: item.status,
      url: item.url || item.scheduling_url || ''
    }));
    return { configured: true, slots };
  } catch (err) {
    return { configured: true, slots: [], error: err.message };
  }
}

async function createInvitee(eventTypeUri, { startTime, name, email, timezone = 'Asia/Kolkata' }) {
  if (!IS_CONFIGURED) return { configured: false };
  if (!eventTypeUri || !startTime || !name || !email) return { configured: true, ok: false, error: 'Missing required fields' };

  try {
    const { default: axios } = require('axios');
    const res = await axios.post('https://api.calendly.com/invitees', {
      event_type: eventTypeUri,
      start_time: startTime,
      location: { kind: 'google_conference' },
      invitee: { name, email, timezone }
    }, {
      headers: { 'Authorization': `Bearer ${CALENDLY_TOKEN}`, 'Content-Type': 'application/json' },
      timeout: 20000
    });

    const invitee = (res.data && res.data.resource) || {};
    return {
      configured: true,
      ok: true,
      inviteeUri: invitee.uri || '',
      bookingUrl: invitee.cancel_url || '',
      scheduledEventUri: invitee.event || ''
    };
  } catch (err) {
    const detail = err.response && err.response.data ? JSON.stringify(err.response.data) : err.message;
    return { configured: true, ok: false, error: detail };
  }
}

module.exports = {
  IS_CONFIGURED,
  listActiveEventTypes,
  resolveEventType,
  getEventTimesByDuration,
  getEventTimes,
  createInvitee
};