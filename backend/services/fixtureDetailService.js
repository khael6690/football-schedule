/**
 * Fixture Detail Service
 *
 * Fetches a single fixture from API-Football (`GET /fixtures?id=`) which
 * returns meta + score + nested events/lineups/statistics/players in ONE
 * response, and normalizes it to the frontend FixtureDetail contract.
 *
 * Redis key: football:fixture:{apfId}
 * TTL:
 *   - finished / void (FT, AET, PEN, PST, CANC, ABD, AWD, WO) -> 24h
 *   - live (state 'in')                                       -> 30s
 *   - not started (NS/TBD)                                    -> 5min
 */

const cache = require('./cacheService');
const apiFootball = require('../providers/apiFootballProvider');
const apfStore = require('./apfStore');
const { isManualFixtureId } = require('./manualFixtureId');

const TTL_FINISHED = 86400;
const TTL_LIVE = 30;
const TTL_PRE = 300;

const FINAL_STATUSES = new Set(['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO']);

function toNumOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(v) {
  return v === null || v === undefined || v === '' ? null : String(v);
}

function pair(obj) {
  return {
    home: toNumOrNull(obj?.home),
    away: toNumOrNull(obj?.away),
  };
}

/**
 * Pick TTL (seconds) based on status.
 * @param {string} short   API-Football status.short
 * @param {string} state   internal state ('pre'|'in'|'post'|'unknown')
 */
function ttlForStatus(short, state) {
  if (FINAL_STATUSES.has(short)) return TTL_FINISHED;
  if (state === 'in') return TTL_LIVE;
  return TTL_PRE;
}

/**
 * Normalize raw API-Football fixture (with nested events/lineups/statistics)
 * into the FixtureDetail contract.
 */
function normalizeFixtureDetail(raw) {
  if (!raw || !raw.fixture) return null;

  const f = raw.fixture || {};
  const league = raw.league || {};
  const teams = raw.teams || {};
  const goals = raw.goals || {};
  const score = raw.score || {};
  const events = Array.isArray(raw.events) ? raw.events : [];
  const lineups = Array.isArray(raw.lineups) ? raw.lineups : [];
  const statistics = Array.isArray(raw.statistics) ? raw.statistics : [];

  const short = f.status?.short || null;
  const state = apiFootball.mapStatusState(short);

  const venue = f.venue && (f.venue.name || f.venue.city)
    ? { name: strOrNull(f.venue.name), city: strOrNull(f.venue.city) }
    : null;

  return {
    id: toNumOrNull(f.id),
    league: {
      id: toNumOrNull(league.id),
      name: strOrNull(league.name),
      logo: strOrNull(league.logo),
      country: strOrNull(league.country),
      season: toNumOrNull(league.season),
      round: strOrNull(league.round),
    },
    date: f.date || null,
    venue,
    referee: strOrNull(f.referee),
    status: {
      short,
      long: strOrNull(f.status?.long),
      elapsed: toNumOrNull(f.status?.elapsed),
      state,
    },
    home: {
      id: toNumOrNull(teams.home?.id),
      name: strOrNull(teams.home?.name),
      logo: strOrNull(teams.home?.logo),
      winner: typeof teams.home?.winner === 'boolean' ? teams.home.winner : null,
    },
    away: {
      id: toNumOrNull(teams.away?.id),
      name: strOrNull(teams.away?.name),
      logo: strOrNull(teams.away?.logo),
      winner: typeof teams.away?.winner === 'boolean' ? teams.away.winner : null,
    },
    goals: pair(goals),
    score: {
      halftime: pair(score.halftime),
      fulltime: pair(score.fulltime),
      extratime: pair(score.extratime),
      penalty: pair(score.penalty),
    },
    events: events.map(ev => ({
      minute: toNumOrNull(ev.time?.elapsed) ?? 0,
      extra: toNumOrNull(ev.time?.extra),
      teamId: toNumOrNull(ev.team?.id),
      teamName: strOrNull(ev.team?.name) || '',
      player: strOrNull(ev.player?.name),
      assist: strOrNull(ev.assist?.name),
      type: ev.type, // 'Goal' | 'Card' | 'subst' | 'Var'
      detail: strOrNull(ev.detail) || '',
      comments: strOrNull(ev.comments),
    })),
    lineups: lineups.map(lu => ({
      teamId: toNumOrNull(lu.team?.id),
      teamName: strOrNull(lu.team?.name) || '',
      teamLogo: strOrNull(lu.team?.logo),
      formation: strOrNull(lu.formation),
      coach: strOrNull(lu.coach?.name),
      startXI: (lu.startXI || []).map(p => ({
        id: toNumOrNull(p.player?.id),
        name: strOrNull(p.player?.name) || '',
        number: toNumOrNull(p.player?.number),
        pos: strOrNull(p.player?.pos),
        grid: strOrNull(p.player?.grid),
      })),
      substitutes: (lu.substitutes || []).map(p => ({
        id: toNumOrNull(p.player?.id),
        name: strOrNull(p.player?.name) || '',
        number: toNumOrNull(p.player?.number),
        pos: strOrNull(p.player?.pos),
      })),
    })),
    statistics: statistics.map(st => ({
      teamId: toNumOrNull(st.team?.id),
      teamName: strOrNull(st.team?.name) || '',
      stats: (st.statistics || []).map(s => ({
        type: String(s.type ?? ''),
        value: s.value === null || s.value === undefined ? null : s.value,
      })),
    })),
  };
}

/**
 * Get normalized fixture detail. Read-through: Redis -> Mongo (final only)
 * -> ONE API-Football request. Results are cached by status TTL and archived.
 *
 * @param {number|string} apfId
 * @returns {Promise<{detail:Object, source:'cache'|'db'|'api-football', ttl:number}|null>}
 */
async function getFixtureDetail(apfId) {
  const id = String(apfId).replace(/^apf-/, '');
  if (!/^\d+$/.test(id)) return null;

  const key = cache.KEYS.fixture(id);

  const cached = await cache.get(key);
  if (cached) {
    return { detail: cached, source: 'cache', ttl: ttlForStatus(cached.status?.short, cached.status?.state) };
  }

  // Redis miss -> durable archive. Final details never change, so serve
  // them directly without spending API quota.
  const archived = await apfStore.getFixtureDetail(id);
  if (archived && archived.isFinal) {
    const ttlDb = ttlForStatus(archived.detail.status?.short, archived.detail.status?.state);
    await cache.set(key, archived.detail, ttlDb);
    return { detail: archived.detail, source: 'db', ttl: ttlDb };
  }

  // Manually seeded ids exist only in Mongo — API-Football knows nothing about
  // them, so never spend quota on a lookup that cannot succeed.
  if (isManualFixtureId(id)) {
    if (archived) {
      const ttlDb = ttlForStatus(archived.detail.status?.short, archived.detail.status?.state);
      return { detail: archived.detail, source: 'db', ttl: ttlDb };
    }
    return null; // -> 404 Fixture not found
  }

  let raw;
  try {
    raw = await apiFootball.fetchFixtureById(id);
  } catch (err) {
    console.error(`[FIXTURE] fetchFixtureById(${id}) failed:`, err.message);
    return null;
  }
  if (!raw) return null; // empty response or quota exhausted

  const detail = normalizeFixtureDetail(raw);
  if (!detail) return null;

  const ttl = ttlForStatus(detail.status.short, detail.status.state);
  await cache.set(key, detail, ttl);

  // Write-through to the durable archive (best-effort, never throws)
  await apfStore.saveFixtureDetail(detail);

  return { detail, source: 'api-football', ttl };
}

module.exports = {
  getFixtureDetail,
  normalizeFixtureDetail,
  ttlForStatus,
};
