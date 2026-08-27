/**
 * API-Football Provider
 *
 * Handles all communication with v3.football.api-sports.io.
 * Enforces a request budget (Free Plan: 100 req/day).
 * API key is ONLY read from process.env — never exposed to clients.
 *
 * Required env vars:
 *   API_FOOTBALL_KEY
 */

const API_BASE = 'https://v3.football.api-sports.io';

// League IDs for priority competitions (API-Football IDs)
const PRIORITY_LEAGUES = {
  'eng.1':  39,   // Premier League
  'esp.1':  140,  // La Liga
  'ger.1':  78,   // Bundesliga
  'ita.1':  135,  // Serie A
  'fra.1':  61,   // Ligue 1
  'uefa.cl': 2,   // Champions League
};

const PRIORITY_LEAGUE_IDS = Object.values(PRIORITY_LEAGUES);

// ---------------------------------------------------------------------------
// Quota tracking (in-memory, resets on restart — good enough for server uptime)
// ---------------------------------------------------------------------------

const quotaState = {
  limit: 100,
  remaining: 100,
  lastChecked: null,
  exhausted: false,
};

function updateQuota(headers) {
  const limit     = parseInt(headers['x-ratelimit-requests-limit']   || headers['x-ratelimit-limit'])   || null;
  const remaining = parseInt(headers['x-ratelimit-requests-remaining'] || headers['x-ratelimit-remaining']) || null;

  if (limit !== null)     quotaState.limit = limit;
  if (remaining !== null) quotaState.remaining = remaining;
  quotaState.lastChecked = new Date().toISOString();
  quotaState.exhausted = (remaining !== null && remaining <= 0);

  if (quotaState.exhausted) {
    console.warn('[API-FOOTBALL] ⚠️  QUOTA EXHAUSTED — stopping further requests');
  } else if (remaining !== null && remaining <= 10) {
    console.warn(`[API-FOOTBALL] ⚠️  Low quota: ${remaining}/${limit} remaining`);
  }
}

function getQuotaState() {
  return { ...quotaState };
}

// ---------------------------------------------------------------------------
// Core HTTP client
// ---------------------------------------------------------------------------

async function request(endpoint, params = {}) {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('[API-FOOTBALL] API_FOOTBALL_KEY is not set');
  }

  if (quotaState.exhausted) {
    const err = new Error('[API-FOOTBALL] Quota exhausted — request blocked');
    err.code = 'QUOTA_EXHAUSTED';
    throw err;
  }

  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE}${endpoint}${query ? '?' + query : ''}`;

  console.log(`[API-FOOTBALL] REQUEST ${url} (quota remaining: ${quotaState.remaining})`);

  let res;
  try {
    res = await fetch(url, {
      headers: {
        'x-apisports-key': apiKey,
        'Accept': 'application/json',
      },
    });
  } catch (netErr) {
    console.error('[API-FOOTBALL] Network error:', netErr.message);
    throw netErr;
  }

  // Always update quota from response headers
  const headers = Object.fromEntries(res.headers.entries());
  updateQuota(headers);

  console.log(`[API-FOOTBALL] RESPONSE status=${res.status} remaining=${quotaState.remaining}`);

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`[API-FOOTBALL] HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();

  // API-Football embeds errors in 200 responses
  if (json.errors && Object.keys(json.errors).length > 0) {
    console.error('[API-FOOTBALL] API-level errors:', JSON.stringify(json.errors));
  }

  return json;
}

// ---------------------------------------------------------------------------
// Domain methods
// ---------------------------------------------------------------------------

/**
 * Fetch all currently live fixtures.
 * Optionally filtered to priority leagues only.
 * @returns {Promise<Array>} Array of fixture objects
 */
async function fetchLiveFixtures() {
  try {
    const data = await request('/fixtures', { live: 'all' });
    const fixtures = data.response || [];

    // Filter to priority leagues only to avoid wasting budget on obscure leagues
    const filtered = fixtures.filter(f =>
      PRIORITY_LEAGUE_IDS.includes(f.league?.id)
    );

    console.log(`[API-FOOTBALL] Live fixtures: ${fixtures.length} total → ${filtered.length} priority`);
    return filtered;
  } catch (err) {
    if (err.code === 'QUOTA_EXHAUSTED') return null; // signal: use cache
    console.error('[API-FOOTBALL] fetchLiveFixtures error:', err.message);
    throw err;
  }
}

/**
 * Fetch fixtures for a specific date (YYYY-MM-DD).
 * @param {string} date  — YYYY-MM-DD
 * @returns {Promise<Array>}
 */
async function fetchFixturesByDate(date) {
  try {
    const data = await request('/fixtures', { date });
    const fixtures = data.response || [];
    return fixtures.filter(f => PRIORITY_LEAGUE_IDS.includes(f.league?.id));
  } catch (err) {
    if (err.code === 'QUOTA_EXHAUSTED') return null;
    console.error('[API-FOOTBALL] fetchFixturesByDate error:', err.message);
    throw err;
  }
}

/**
 * Fetch a single fixture by its API-Football fixture ID.
 * Use sparingly — 1 request per match.
 * @param {number|string} fixtureId
 * @returns {Promise<Object|null>}
 */
async function fetchFixtureById(fixtureId) {
  try {
    const data = await request('/fixtures', { id: fixtureId });
    const results = data.response || [];
    return results[0] || null;
  } catch (err) {
    if (err.code === 'QUOTA_EXHAUSTED') return null;
    console.error('[API-FOOTBALL] fetchFixtureById error:', err.message);
    throw err;
  }
}

/**
 * Fetch standings for a league + season.
 * @param {number} leagueId
 * @param {number} season   — 4-digit year e.g. 2025
 */
async function fetchStandings(leagueId, season) {
  try {
    const data = await request('/standings', { league: leagueId, season });
    return data.response || [];
  } catch (err) {
    if (err.code === 'QUOTA_EXHAUSTED') return null;
    console.error('[API-FOOTBALL] fetchStandings error:', err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Normalizer — convert API-Football fixture to internal format
// ---------------------------------------------------------------------------

/**
 * Normalize an API-Football fixture object into the app's internal LiveMatch schema.
 * @param {Object} fixture   — raw fixture from API-Football response
 * @returns {Object}         — normalized LiveMatch
 */
function normalizeLiveFixture(fixture) {
  const f = fixture.fixture   || {};
  const league = fixture.league  || {};
  const teams  = fixture.teams   || {};
  const goals  = fixture.goals   || {};
  const score  = fixture.score   || {};
  const events = fixture.events  || [];

  // Map API-Football status to internal state
  const statusMap = {
    TBD: 'pre', NS: 'pre',
    '1H': 'in', HT: 'in', '2H': 'in', ET: 'in', BT: 'in', P: 'in', SUSP: 'in', INT: 'in', LIVE: 'in',
    FT: 'post', AET: 'post', PEN: 'post',
    PST: 'unknown', CANC: 'unknown', ABD: 'unknown', AWD: 'unknown', WO: 'unknown',
  };

  return {
    id: `apf-${f.id}`,
    providers: {
      apiFootball: String(f.id),
      footballData: null, // filled in by ID mapping service
    },
    league: {
      id: String(league.id),
      name: league.name,
      slug: getLeagueSlugById(league.id),
      logo: league.logo,
      country: league.country,
      season: league.season,
      round: league.round,
    },
    home: {
      id: String(teams.home?.id),
      name: teams.home?.name,
      logo: teams.home?.logo,
      score: goals.home,
      winner: teams.home?.winner,
    },
    away: {
      id: String(teams.away?.id),
      name: teams.away?.name,
      logo: teams.away?.logo,
      score: goals.away,
      winner: teams.away?.winner,
    },
    score: {
      home: goals.home,
      away: goals.away,
      halfTimeHome: score.halftime?.home,
      halfTimeAway: score.halftime?.away,
      extraTimeHome: score.extratime?.home,
      extraTimeAway: score.extratime?.away,
      penaltyHome: score.penalty?.home,
      penaltyAway: score.penalty?.away,
    },
    status: {
      state: statusMap[f.status?.short] || 'unknown',
      short: f.status?.short,
      long: f.status?.long,
      elapsed: f.status?.elapsed,
    },
    kickoff: f.date,
    venue: {
      name: f.venue?.name,
      city: f.venue?.city,
    },
    events: events.map(ev => ({
      time: ev.time?.elapsed,
      extraTime: ev.time?.extra,
      teamId: String(ev.team?.id),
      teamName: ev.team?.name,
      playerName: ev.player?.name,
      assistName: ev.assist?.name,
      type: ev.type,       // Goal, Card, subst, Var
      detail: ev.detail,   // Normal Goal, Yellow Card, etc.
      comments: ev.comments,
    })),
    fetchedAt: new Date().toISOString(),
    source: 'api-football',
    stale: false,
  };
}

function getLeagueSlugById(leagueId) {
  for (const [slug, id] of Object.entries(PRIORITY_LEAGUES)) {
    if (id === leagueId) return slug;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  fetchLiveFixtures,
  fetchFixturesByDate,
  fetchFixtureById,
  fetchStandings,
  normalizeLiveFixture,
  getQuotaState,
  PRIORITY_LEAGUES,
  PRIORITY_LEAGUE_IDS,
};
