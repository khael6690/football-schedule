/**
 * Fixtures-by-date Service
 *
 * Fetches all priority-league fixtures for a single date from API-Football
 * (`GET /fixtures?date=YYYY-MM-DD`), normalizes them to the same shape as
 * live/finished (`normalizeLiveFixture`) and caches in Redis.
 *
 * Purpose: give the frontend `providers.apiFootball` ids (apfId) for
 * fixtures on ANY date, not just today.
 *
 * Quota discipline (free tier: 100 req/day, 10 req/min):
 *   - exactly ONE API call per date per cache period
 *   - in-flight dedupe: concurrent requests for the same date share one call
 *   - low-quota guard: below LOW_QUOTA_THRESHOLD remaining, cache misses fall
 *     back to the Mongo archive and are flagged `stale` instead of calling the API
 *   - never loops over multiple dates
 *
 * Read-through order: Redis -> Mongo (`apf_fixtures`) -> API-Football.
 * Write-through: every API result is persisted via apfStore.saveFixtures().
 *
 * Dates older than API_FOOTBALL_HISTORY_DAYS are Mongo-only (the free plan
 * does not serve them), which is where manually seeded fixtures live.
 *
 * Redis key: football:fixtures:date:{YYYY-MM-DD}
 * TTL (relative to today in WIB, UTC+7):
 *   past   -> 7 days   (final data does not change)
 *   today  -> 5 min    (live results come from /api/live anyway)
 *   future -> 6 hours  (schedule may shift)
 */

const cache = require('./cacheService');
const apiFootball = require('../providers/apiFootballProvider');
const idMapping = require('./idMappingService');
const apfStore = require('./apfStore');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const TTL_PAST = 604800;   // 7d
const TTL_TODAY = 300;     // 5m
const TTL_FUTURE = 21600;  // 6h

// Mirrors the "very low" tier in liveScoreService.nextPollInterval
const LOW_QUOTA_THRESHOLD = 10;

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

// API-Football's free plan only serves roughly the last 3 days of fixtures.
// Older dates can only come from Mongo (API archive + manual seed), so we
// never waste a request on them.
const API_FOOTBALL_HISTORY_DAYS = 3;

/** @type {Map<string, Promise<Object>>} in-flight API calls keyed by date */
const inFlight = new Map();

function keyFor(date) {
  return `football:fixtures:date:${date}`;
}

/** Today's date string (YYYY-MM-DD) in WIB. */
function todayWib() {
  return new Date(Date.now() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * TTL in seconds for a given date relative to today (WIB).
 * @param {string} date  YYYY-MM-DD
 */
function ttlForDate(date) {
  const today = todayWib();
  if (date < today) return TTL_PAST;
  if (date > today) return TTL_FUTURE;
  return TTL_TODAY;
}

/**
 * True when `date` is older than the free plan's history window, i.e. the API
 * cannot return it and Mongo is the only possible source.
 * @param {string} date YYYY-MM-DD
 */
function isBeyondApiHistory(date) {
  const cutoffMs = Date.parse(`${todayWib()}T00:00:00Z`) - API_FOOTBALL_HISTORY_DAYS * 86400000;
  const cutoff = new Date(cutoffMs).toISOString().slice(0, 10);
  return date < cutoff;
}

/**
 * Merge API fixtures with archived (possibly manual) fixtures by fixture id.
 * Manual/archived entries win whenever the API entry is not final.
 */
function mergeByFixtureId(apiFixtures, archivedFixtures) {
  const merged = new Map();
  for (const a of archivedFixtures) merged.set(String(a.id), a);

  for (const f of apiFixtures) {
    const kept = merged.get(String(f.id));
    if (kept && f.status?.state !== 'post') {
      continue; // archived/manual data beats non-final API data
    }
    merged.set(String(f.id), f);
  }

  return Array.from(merged.values());
}

function isQuotaLow() {
  const q = apiFootball.getQuotaState();
  if (q.exhausted) return true;
  return q.remaining !== null && q.remaining !== undefined && q.remaining <= LOW_QUOTA_THRESHOLD;
}

async function fetchAndCache(date, archived = []) {
  const raw = await apiFootball.fetchFixturesByDate(date);

  // null => quota exhausted mid-request
  if (raw === null) {
    return { date, fixtures: archived, source: 'stale', stale: true, ttl: ttlForDate(date) };
  }

  const normalized = raw.map(apiFootball.normalizeLiveFixture);
  const enriched = await Promise.all(normalized.map(async (f) => {
    const fdId = await idMapping.getFootballDataId(f.providers.apiFootball);
    if (fdId) f.providers.footballData = fdId;
    return f;
  }));

  // Write-through to the durable archive (best-effort, never throws).
  // Manual documents are protected inside apfStore.saveFixtures().
  await apfStore.saveFixtures(enriched);

  // Serve API + archived (incl. manual) merged; manual wins on non-final API data
  const fixtures = mergeByFixtureId(enriched, archived);

  const ttl = ttlForDate(date);
  await cache.set(keyFor(date), fixtures, ttl);

  console.log(`[FIXTURES-BY-DATE] Cached ${fixtures.length} fixtures for ${date} (api=${enriched.length} archived=${archived.length} ttl=${ttl}s)`);

  return { date, fixtures, source: 'api', stale: false, ttl };
}

/**
 * Get normalized fixtures for a date. Read-through: Redis -> Mongo -> API.
 * @param {string} date  YYYY-MM-DD
 * @returns {Promise<{date:string, fixtures:Array, source:'cache'|'db'|'api'|'stale', stale:boolean, ttl:number}|null>}
 *          null when date format is invalid
 */
async function getFixturesByDate(date) {
  if (typeof date !== 'string' || !DATE_RE.test(date)) return null;

  const ttl = ttlForDate(date);

  const cached = await cache.get(keyFor(date));
  // Empty arrays are never a valid "hit" — they mask a subsequent write
  // (e.g. manual seed) for the full TTL window. Only serve non-empty caches.
  if (Array.isArray(cached) && cached.length > 0) {
    return { date, fixtures: cached, source: 'cache', stale: false, ttl };
  }

  // Redis miss -> try the durable Mongo archive (API archive + manual seed)
  // before spending API quota. Only trusted when the data can no longer
  // change: past date, or every fixture already final.
  const archived = await apfStore.getFixturesByDateKey(date);
  if (archived.length > 0) {
    const isPast = date < todayWib();
    const allFinal = archived.every(f => f.status?.state === 'post');
    if (isPast || allFinal) {
      await cache.set(keyFor(date), archived, ttl);
      console.log(`[FIXTURES-BY-DATE] Served ${archived.length} fixtures for ${date} from Mongo archive`);
      return { date, fixtures: archived, source: 'db', stale: false, ttl };
    }
  }

  // Beyond the free plan's history window the API has nothing to give —
  // Mongo-only, no request, even when the archive is empty.
  if (isBeyondApiHistory(date)) {
    console.log(`[FIXTURES-BY-DATE] ${date} is older than ${API_FOOTBALL_HISTORY_DAYS}d — Mongo only, no API call`);
    if (archived.length > 0) await cache.set(keyFor(date), archived, ttl);
    return { date, fixtures: archived, source: 'db', stale: false, ttl };
  }

  // Cache miss + low quota -> do not spend a request
  if (isQuotaLow()) {
    console.warn(`[FIXTURES-BY-DATE] Low quota — skipping API call for ${date}`);
    // Serve whatever the archive has rather than nothing
    return { date, fixtures: archived, source: 'stale', stale: true, ttl };
  }

  // In-flight dedupe
  if (inFlight.has(date)) {
    return inFlight.get(date);
  }

  const p = fetchAndCache(date, archived)
    .catch((err) => {
      console.error(`[FIXTURES-BY-DATE] fetch failed for ${date}:`, err.message);
      return { date, fixtures: archived, source: 'stale', stale: true, ttl };
    })
    .finally(() => inFlight.delete(date));

  inFlight.set(date, p);
  return p;
}

module.exports = {
  getFixturesByDate,
  ttlForDate,
  isBeyondApiHistory,
  API_FOOTBALL_HISTORY_DAYS,
  DATE_RE,
};
