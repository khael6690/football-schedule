/**
 * Match ID Mapping Service (Phase 6)
 *
 * Bridges football-data.org match IDs with API-Football fixture IDs.
 *
 * Map schema (stored in Redis or in-memory fallback):
 * {
 *   footballDataId: "494834",
 *   apiFootballId: "987654",
 *   leagueSlug: "eng.1",
 *   homeTeam: "Arsenal",
 *   awayTeam: "Chelsea",
 *   kickoff: "2026-08-27T14:00:00Z"
 * }
 */

const cache = require('./cacheService');

// In-memory fallback if Redis unavailable
const localMap = new Map();

function buildMapKey(fdId) {
  return `football:map:${fdId}`;
}

/**
 * Register a mapping between football-data.org ID and API-Football fixture ID.
 * @param {string} fdId   — football-data.org match ID
 * @param {string} apfId  — API-Football fixture ID
 * @param {Object} [meta] — optional metadata (leagueSlug, homeTeam, awayTeam, kickoff)
 */
async function setMapping(fdId, apfId, meta = {}) {
  const payload = {
    footballDataId: String(fdId),
    apiFootballId: String(apfId),
    leagueSlug: meta.leagueSlug || null,
    homeTeam: meta.homeTeam || null,
    awayTeam: meta.awayTeam || null,
    kickoff: meta.kickoff || null,
    updatedAt: new Date().toISOString(),
  };

  localMap.set(String(fdId), payload);
  await cache.set(buildMapKey(fdId), payload, cache.TTL.LEAGUE_META);

  // Also store reverse mapping
  localMap.set(`rev:${apfId}`, String(fdId));
  await cache.set(`football:map:rev:${apfId}`, String(fdId), cache.TTL.LEAGUE_META);

  console.log(`[MAP] Linked football-data=${fdId} <-> api-football=${apfId}`);
}

/**
 * Get API-Football fixture ID for a given football-data.org match ID.
 * @param {string} fdId
 * @returns {Promise<string|null>}
 */
async function getApiFootballId(fdId) {
  const cached = await cache.get(buildMapKey(fdId));
  if (cached?.apiFootballId) return cached.apiFootballId;

  const local = localMap.get(String(fdId));
  return local?.apiFootballId || null;
}

/**
 * Get football-data.org match ID for a given API-Football fixture ID.
 * @param {string} apfId
 * @returns {Promise<string|null>}
 */
async function getFootballDataId(apfId) {
  const cached = await cache.get(`football:map:rev:${apfId}`);
  if (cached) return cached;

  return localMap.get(`rev:${apfId}`) || null;
}

/**
 * Automatically match fixtures by team names + kickoff date.
 * Useful for bootstrapping maps automatically from raw responses.
 * @param {Array} fdMatches  — Array of MongoDB/football-data matches
 * @param {Array} apfMatches — Array of API-Football fixtures
 */
async function autoMatch(fdMatches = [], apfMatches = []) {
  let matchedCount = 0;

  for (const fd of fdMatches) {
    const fdHome = (fd.home?.name || fd.home?.display_name || '').toLowerCase();
    const fdAway = (fd.away?.name || fd.away?.display_name || '').toLowerCase();
    const fdDate = fd.date ? new Date(fd.date).toISOString().slice(0, 10) : null;

    if (!fdHome || !fdAway || !fdDate) continue;

    for (const apf of apfMatches) {
      const apfHome = (apf.home?.name || '').toLowerCase();
      const apfAway = (apf.away?.name || '').toLowerCase();
      const apfDate = apf.kickoff ? new Date(apf.kickoff).toISOString().slice(0, 10) : null;

      // Match on date + home name fuzzy
      const homeMatch = apfHome.includes(fdHome) || fdHome.includes(apfHome);
      const awayMatch = apfAway.includes(fdAway) || fdAway.includes(apfAway);
      const dateMatch = apfDate === fdDate;

      if (homeMatch && awayMatch && dateMatch) {
        const fdId = fd.source?.event_id || fd._id;
        const apfId = apf.providers?.apiFootball || apf.id;

        if (fdId && apfId) {
          await setMapping(fdId, apfId, {
            leagueSlug: fd.league_slug,
            homeTeam: fd.home?.name,
            awayTeam: fd.away?.name,
            kickoff: fd.date,
          });
          matchedCount++;
        }
      }
    }
  }

  console.log(`[MAP] Auto-matched ${matchedCount} fixtures between providers`);
  return matchedCount;
}

module.exports = {
  setMapping,
  getApiFootballId,
  getFootballDataId,
  autoMatch,
};
