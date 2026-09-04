/**
 * Live Score Service (Phase 5 + 9 + 10)
 *
 * Smart live score fetcher that:
 * - Only polls API-Football during likely match hours
 * - Uses Redis as shared cache — all visitors read same cached data
 * - Detects score/event changes and updates Redis
 * - Stops aggressive polling when no matches are live
 * - Supports SSE (Server-Sent Events) push to connected clients
 * - Tracks daily quota usage in Redis for persistence across restarts
 *
 * This service runs on the server-side only.
 * Frontend must NEVER call API-Football directly.
 */

const cache = require('./cacheService');
const apiFootball = require('../providers/apiFootballProvider');

// How often the worker polls (ms)
const POLL_INTERVAL_ACTIVE   = 60 * 1000;       // 60s  — matches are live
const POLL_INTERVAL_IDLE     = 15 * 60 * 1000;   // 15min — no matches, off-hours
const POLL_INTERVAL_UPCOMING = 5 * 60 * 1000;    // 5min  — match hours but nothing live
const POLL_INTERVAL_LOW_QUOTA = 10 * 60 * 1000;  // 10min — quota getting low

// Match hours (UTC) — most European football is ~11:00–22:00 UTC
const MATCH_HOUR_START = 10;  // 10:00 UTC = 17:00 WIB
const MATCH_HOUR_END   = 23;  // 23:00 UTC = 06:00 WIB

let workerTimer = null;
let workerRunning = false;
let lastLiveCount = 0;
let lastTotalLiveCount = 0; // includes non-priority
let consecutiveEmptyPolls = 0;

// ---------------------------------------------------------------------------
// SSE (Server-Sent Events) client management
// ---------------------------------------------------------------------------

const sseClients = new Set();

function addSSEClient(res) {
  sseClients.add(res);
  res.on('close', () => sseClients.delete(res));
}

function broadcastSSE(eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch { /* client gone */ }
  }
}

function getSSEClientCount() {
  return sseClients.size;
}

// ---------------------------------------------------------------------------
// Time-awareness: should we even poll right now?
// ---------------------------------------------------------------------------

function isLikelyMatchHours() {
  const hourUTC = new Date().getUTCHours();
  return hourUTC >= MATCH_HOUR_START && hourUTC <= MATCH_HOUR_END;
}

// ---------------------------------------------------------------------------
// Quota persistence: track daily usage across restarts
// ---------------------------------------------------------------------------

const QUOTA_KEY = 'football:api-football:daily-quota';

async function persistQuotaState() {
  const state = apiFootball.getQuotaState();
  await cache.set(QUOTA_KEY, {
    ...state,
    date: new Date().toISOString().slice(0, 10),
  }, 86400); // 24h TTL — auto-expires next day
}

async function loadPersistedQuota() {
  const saved = await cache.get(QUOTA_KEY);
  if (!saved) return;
  const today = new Date().toISOString().slice(0, 10);
  if (saved.date === today && saved.remaining !== undefined) {
    console.log(`[LIVE] Loaded persisted quota: ${saved.remaining}/${saved.limit} remaining`);
  }
}

// ---------------------------------------------------------------------------
// Fetch + cache live fixtures
// ---------------------------------------------------------------------------

/**
 * Fetch live fixtures from API-Football, normalize, store in Redis.
 * Returns the normalized live fixtures array, or cached data on error.
 * @returns {Promise<{fixtures: Array, source: string, stale: boolean}>}
 */
async function fetchAndCacheLive() {
  const quotaState = apiFootball.getQuotaState();

  // Quota exhausted — serve cached data
  if (quotaState.exhausted) {
    console.warn('[LIVE] Quota exhausted — returning cached live data');
    const cached = await cache.get(cache.KEYS.live());
    return {
      fixtures: cached || [],
      source: 'cache',
      stale: true,
      quotaExhausted: true,
    };
  }

  // Skip polling during off-hours if no matches were live recently
  if (!isLikelyMatchHours() && lastLiveCount === 0 && consecutiveEmptyPolls > 2) {
    console.log('[LIVE] Off-hours + no live matches — skipping API call');
    const cached = await cache.get(cache.KEYS.live());
    return {
      fixtures: cached || [],
      source: 'cache',
      stale: false,
      skipped: true,
    };
  }

  let rawFixtures;
  try {
    rawFixtures = await apiFootball.fetchLiveFixtures();
  } catch (err) {
    console.error('[LIVE] API-Football fetch failed:', err.message);
    // Fallback to cached data
    const cached = await cache.get(cache.KEYS.live());
    return {
      fixtures: cached || [],
      source: 'cache',
      stale: true,
      error: err.message,
    };
  }

  // null means quota exhausted mid-request
  if (rawFixtures === null) {
    const cached = await cache.get(cache.KEYS.live());
    return {
      fixtures: cached || [],
      source: 'cache',
      stale: true,
      quotaExhausted: true,
    };
  }

  // Track total vs filtered
  lastTotalLiveCount = rawFixtures.length;

  // Normalize and enrich with mapped football-data ID
  const idMapping = require('./idMappingService');
  const normalized = await Promise.all(rawFixtures.map(async (f) => {
    const norm = apiFootball.normalizeLiveFixture(f);
    const fdId = await idMapping.getFootballDataId(norm.providers.apiFootball);
    if (fdId) norm.providers.footballData = fdId;
    return norm;
  }));
  lastLiveCount = normalized.length;

  // Track empty polls
  if (normalized.length === 0) {
    consecutiveEmptyPolls++;
  } else {
    consecutiveEmptyPolls = 0;
  }

  // Detect score changes by comparing against previous cache
  const previous = await cache.get(cache.KEYS.live());
  const changes = [];
  if (previous && Array.isArray(previous)) {
    const detected = await detectChanges(previous, normalized);
    changes.push(...detected);
  }

  // Update Redis — all leagues
  await cache.set(cache.KEYS.live(), normalized, cache.TTL.LIVE);

  // Update per-league keys
  const byLeague = {};
  for (const fixture of normalized) {
    const slug = fixture.league?.slug;
    if (slug) {
      if (!byLeague[slug]) byLeague[slug] = [];
      byLeague[slug].push(fixture);
    }
  }
  for (const [slug, fixtures] of Object.entries(byLeague)) {
    await cache.set(cache.KEYS.liveByLeague(slug), fixtures, cache.TTL.LIVE);
  }

  // Persist quota
  await persistQuotaState();

  // Broadcast to SSE clients if there are changes or active matches
  if (sseClients.size > 0 && (changes.length > 0 || normalized.length > 0)) {
    broadcastSSE('live-update', {
      matches: normalized,
      changes,
      meta: {
        count: normalized.length,
        fetchedAt: new Date().toISOString(),
      },
    });
  }

  if (normalized.length > 0 || changes.length > 0) {
    console.log(`[LIVE] Updated Redis — ${normalized.length} live fixtures across ${Object.keys(byLeague).length} leagues, ${changes.length} changes, ${sseClients.size} SSE clients`);
  }

  return {
    fixtures: normalized,
    source: 'api-football',
    stale: false,
    fetchedAt: new Date().toISOString(),
    changes,
  };
}

// ---------------------------------------------------------------------------
// Change detection
// ---------------------------------------------------------------------------

async function detectChanges(previous, current) {
  const changes = [];
  const prevMap = new Map(previous.map(f => [f.id, f]));

  for (const curr of current) {
    const prev = prevMap.get(curr.id);
    if (!prev) {
      const change = {
        type: 'new_match',
        match: `${curr.home.name} vs ${curr.away.name}`,
        league: curr.league?.name,
      };
      changes.push(change);
      console.log(`[LIVE] NEW match: ${change.match}`);
      continue;
    }
    const prevScore = `${prev.score?.home}-${prev.score?.away}`;
    const currScore = `${curr.score?.home}-${curr.score?.away}`;
    if (prevScore !== currScore) {
      const change = {
        type: 'score_change',
        match: `${curr.home.name} ${curr.score.home}-${curr.score.away} ${curr.away.name}`,
        previousScore: prevScore,
        league: curr.league?.name,
      };
      changes.push(change);
      console.log(`[LIVE] ⚽ SCORE CHANGE: ${change.match} (was ${prevScore})`);
    }
    const prevEvents = prev.events?.length || 0;
    const currEvents = curr.events?.length || 0;
    if (currEvents > prevEvents) {
      const newEvents = curr.events.slice(prevEvents);
      for (const ev of newEvents) {
        changes.push({
          type: 'event',
          eventType: ev.type,
          match: `${curr.home.name} vs ${curr.away.name}`,
          player: ev.playerName,
          minute: ev.time,
          detail: ev.detail,
        });
      }
      console.log(`[LIVE] NEW EVENTS in ${curr.home.name} vs ${curr.away.name}: +${currEvents - prevEvents}`);
    }
  }

  // Detect finished matches and retain them in finished cache
  const finishedTodayKey = `football:finished:${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const existingFinished = (await cache.get(finishedTodayKey)) || [];
  const finishedMap = new Map(existingFinished.map(f => [f.id, f]));

  for (const prev of previous) {
    const still = current.find(c => c.id === prev.id);
    if (!still && prev.status?.state === 'in') {
      // Mark as finished (post)
      const finishedMatch = {
        ...prev,
        status: { state: 'post', short: 'FT', long: 'Match Finished', elapsed: prev.status?.elapsed ?? null },
      };
      finishedMap.set(finishedMatch.id, finishedMatch);

      changes.push({
        type: 'match_ended',
        match: `${prev.home.name} ${prev.score?.home}-${prev.score?.away} ${prev.away.name}`,
        league: prev.league?.name,
      });
      console.log(`[LIVE] MATCH ENDED: ${prev.home.name} vs ${prev.away.name} (retained as FT)`);
    }
  }

  const updatedFinished = Array.from(finishedMap.values());
  await cache.set(finishedTodayKey, updatedFinished, 86400); // 24h TTL

  return changes;
}

// ---------------------------------------------------------------------------
// Read from Redis (for controller endpoints)
// ---------------------------------------------------------------------------

/**
 * Get all live fixtures. Used by GET /api/live.
 * @returns {Promise<{fixtures: Array, source: string, stale: boolean}>}
 */
async function getLive() {
  // Only truly in-play matches belong in the live response.
  // Finished matches stay in the `football:finished:YYYYMMDD` cache
  // (used by syncTodayFinishedMatches etc.) but are NOT merged here.
  const isInPlay = m => m?.status?.state === 'in';

  const liveCached = await cache.get(cache.KEYS.live()) || [];
  if (liveCached.length > 0) {
    return { fixtures: liveCached.filter(isInPlay), source: 'cache', stale: false };
  }

  // Cache miss — fetch live immediately
  const liveResult = await fetchAndCacheLive();
  return {
    ...liveResult,
    fixtures: (liveResult.fixtures || []).filter(isInPlay),
  };
}

/**
 * Get today's finished matches from the finished cache.
 * Used by GET /api/live/finished. Kept separate from getLive() so the
 * live response stays strictly in-play.
 * @returns {Promise<{fixtures: Array, source: string, stale: boolean}>}
 */
async function getFinishedToday() {
  // Finished cache is written under both UTC-date keys (detectChanges)
  // and WIB-date keys (syncTodayFinishedMatches) — read both, dedupe.
  const utcKey = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const wibKey = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
  const keys = [...new Set([utcKey, wibKey])];

  const map = new Map();
  for (const k of keys) {
    const list = (await cache.get(`football:finished:${k}`)) || [];
    list.forEach(m => map.set(m.id, m));
  }

  return { fixtures: Array.from(map.values()), source: 'cache', stale: false };
}

/**
 * Get live fixtures for a specific league slug. Used by GET /api/live/:league.
 * @param {string} leagueSlug
 * @returns {Promise<{fixtures: Array, source: string, stale: boolean}>}
 */
async function getLiveByLeague(leagueSlug) {
  const cacheKey = cache.KEYS.liveByLeague(leagueSlug);
  const cached = await cache.get(cacheKey);
  if (cached !== null) {
    return { fixtures: cached, source: 'cache', stale: false };
  }
  // Fall back to full live data and filter
  const all = await getLive();
  const filtered = all.fixtures.filter(f => f.league?.slug === leagueSlug);
  return { ...all, fixtures: filtered };
}

// ---------------------------------------------------------------------------
// Smart polling worker
// ---------------------------------------------------------------------------

/**
 * Determine next poll interval based on current state.
 */
function nextPollInterval() {
  const quota = apiFootball.getQuotaState();

  // Quota critical (< 20%) — slow down dramatically
  if (quota.remaining !== null && quota.remaining <= 20) {
    return POLL_INTERVAL_LOW_QUOTA;
  }

  // Quota very low (< 10 left) — near-stop
  if (quota.remaining !== null && quota.remaining <= 10) {
    return 30 * 60 * 1000; // 30 minutes
  }

  // Quota exhausted
  if (quota.exhausted) return POLL_INTERVAL_IDLE;

  // Active live matches in priority leagues
  if (lastLiveCount > 0) return POLL_INTERVAL_ACTIVE;

  // Off-hours — sleep longer
  if (!isLikelyMatchHours()) return POLL_INTERVAL_IDLE;

  // Match hours but nothing live — moderate check
  return POLL_INTERVAL_UPCOMING;
}

async function workerTick() {
  try {
    const result = await fetchAndCacheLive();
    const liveCount = result.fixtures?.length || 0;
    const interval = nextPollInterval();
    const quota = apiFootball.getQuotaState();
    const ts = new Date().toISOString();

    console.log(
      `[LIVE] ${ts} — priority=${liveCount} total=${lastTotalLiveCount} source=${result.source}`
      + ` quota=${quota.remaining}/${quota.limit} next=${interval/1000}s`
      + ` sse_clients=${sseClients.size}`
      + (result.skipped ? ' (SKIPPED)' : '')
    );
  } catch (err) {
    console.error('[LIVE] Worker tick error:', err.message);
  }
}

/**
 * Start the background live score worker.
 * Should be called once at server startup.
 */
function startWorker() {
  if (workerRunning) {
    console.warn('[LIVE] Worker already running');
    return;
  }

  // Skip if API key not configured
  if (!process.env.API_FOOTBALL_KEY) {
    console.warn('[LIVE] API_FOOTBALL_KEY not set — live score worker disabled');
    return;
  }

  workerRunning = true;
  console.log('[LIVE] Starting live score worker');

  async function schedule() {
    if (!workerRunning) return;
    await workerTick();
    const delay = nextPollInterval();
    workerTimer = setTimeout(schedule, delay);
  }

  // Load persisted quota state and sync today's finished matches, then start worker
  loadPersistedQuota().then(async () => {
    await syncTodayFinishedMatches();
    workerTimer = setTimeout(schedule, 5000);
  });
}

/**
 * Fetch and cache all matches for today that have already finished (FT/AET/PEN).
 * Useful to catch matches that ended before worker startup (e.g. 02:00 WIB matches).
 */
async function syncTodayFinishedMatches() {
  const todayDate = new Date();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);

  const datesToFetch = [
    yesterdayDate.toISOString().slice(0, 10),
    todayDate.toISOString().slice(0, 10)
  ];

  console.log(`[LIVE] Syncing finished matches from API-Football for UTC dates: ${datesToFetch.join(', ')}...`);
  
  try {
    const allRaw = [];
    for (const d of datesToFetch) {
      const raw = await apiFootball.fetchFixturesByDate(d);
      if (raw && Array.isArray(raw)) {
        allRaw.push(...raw);
      }
    }

    const idMapping = require('./idMappingService');
    const finished = allRaw
      .filter(f => ['FT', 'AET', 'PEN'].includes(f.fixture?.status?.short))
      .map(apiFootball.normalizeLiveFixture);

    const enriched = await Promise.all(finished.map(async (f) => {
      const fdId = await idMapping.getFootballDataId(f.providers.apiFootball);
      if (fdId) f.providers.footballData = fdId;
      return f;
    }));

    // Group by WIB local date key (UTC + 7 hours)
    const grouped = {};
    for (const match of enriched) {
      const kickoff = match.kickoff || match.date;
      if (!kickoff) continue;
      const matchTimeMs = new Date(kickoff).getTime();
      const wibDate = new Date(matchTimeMs + 7 * 60 * 60 * 1000);
      const wibKey = wibDate.toISOString().slice(0, 10).replace(/-/g, '');
      
      if (!grouped[wibKey]) grouped[wibKey] = [];
      // Avoid duplicate matches in same group
      if (!grouped[wibKey].some(m => m.id === match.id)) {
        grouped[wibKey].push(match);
      }
    }

    // Save to Redis for each WIB group
    for (const [wibKey, matches] of Object.entries(grouped)) {
      const redisKey = `football:finished:${wibKey}`;
      await cache.set(redisKey, matches, 86400); // 24h TTL
      console.log(`[LIVE] Cached ${matches.length} finished matches under local date key ${redisKey}`);
    }
  } catch (err) {
    console.error('[LIVE] syncTodayFinishedMatches error:', err.message);
  }
}

/**
 * Stop the background worker (for graceful shutdown / testing).
 */
function stopWorker() {
  workerRunning = false;
  if (workerTimer) {
    clearTimeout(workerTimer);
    workerTimer = null;
  }
  console.log('[LIVE] Worker stopped');
}

/**
 * Get current worker status for health checks.
 */
function getWorkerStatus() {
  const quota = apiFootball.getQuotaState();
  return {
    running: workerRunning,
    liveMatchCount: lastLiveCount,
    totalLiveCount: lastTotalLiveCount,
    consecutiveEmptyPolls,
    isMatchHours: isLikelyMatchHours(),
    sseClients: sseClients.size,
    quota,
    nextInterval: workerRunning ? nextPollInterval() : null,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  fetchAndCacheLive,
  getLive,
  getFinishedToday,
  getLiveByLeague,
  startWorker,
  stopWorker,
  syncTodayFinishedMatches,
  getWorkerStatus,
  addSSEClient,
  getSSEClientCount,
};
