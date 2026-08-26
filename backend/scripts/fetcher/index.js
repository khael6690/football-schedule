const path = require('path');
const dotenv = require('dotenv');

// Load environment variables (.env in backend or local scripts/fetcher/.env)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const API_BASE = 'https://api.football-data.org/v4';
const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const REQUEST_DELAY_MS = 7000;

const LEAGUE_MAPPING = [
  { code: 'PL', slug: 'eng.1', name: 'English Premier League', country: 'England' },
  { code: 'PD', slug: 'esp.1', name: 'La Liga', country: 'Spain' },
  { code: 'BL1', slug: 'ger.1', name: 'Bundesliga', country: 'Germany' },
  { code: 'SA', slug: 'ita.1', name: 'Serie A', country: 'Italy' },
  { code: 'FL1', slug: 'fra.1', name: 'Ligue 1', country: 'France' },
  { code: 'CL', slug: 'uefa.cl', name: 'UEFA Champions League', country: 'Europe' }
];

// --- HTTP status classification ---

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function isClientConfigError(status) {
  return status === 400 || status === 401 || status === 403;
}

function clientErrorAdvice(status) {
  switch (status) {
    case 400:
      return 'Check API key format. football-data.org returns 400 for malformed or empty X-Auth-Token. '
           + 'Ensure FOOTBALL_DATA_API_KEY in .env is a valid token, not a placeholder.';
    case 401:
      return 'API key rejected. Register at https://www.football-data.org/client/register and set FOOTBALL_DATA_API_KEY.';
    case 403:
      return 'Access denied. Free tier does not include this competition/endpoint. '
           + 'Check your plan at https://www.football-data.org/client/home';
    default:
      return '';
  }
}

// --- Safe diagnostic logging ---

function redactHeaders(headers) {
  const safe = {};
  for (const [k, v] of Object.entries(headers)) {
    const lower = k.toLowerCase();
    if (lower === 'x-auth-token' || lower === 'authorization') {
      safe[k] = v ? `***${v.slice(-4)}` : '(empty)';
    } else {
      safe[k] = v;
    }
  }
  return safe;
}

function truncate(str, max = 500) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...(truncated)' : str;
}

async function logResponseDiagnostic(res, url, requestHeaders) {
  let body = '';
  try {
    body = await res.text();
  } catch { /* ignore read errors */ }

  console.error('[API Diagnostic]');
  console.error(`  URL:         ${url}`);
  console.error(`  Status:      ${res.status} ${res.statusText}`);
  console.error(`  Req Headers: ${JSON.stringify(redactHeaders(requestHeaders))}`);
  if (body) {
    console.error(`  Body:        ${truncate(body)}`);
  }
}

// --- API key validation ---

function requireApiKey() {
  if (!API_KEY || !API_KEY.trim()) {
    console.error(
      '[Fatal] FOOTBALL_DATA_API_KEY is not set or empty.\n'
      + '  1. Register at https://www.football-data.org/client/register\n'
      + '  2. Copy your API token\n'
      + '  3. Set it in backend/.env or backend/scripts/fetcher/.env:\n'
      + '     FOOTBALL_DATA_API_KEY=your_token_here\n'
      + '  4. Re-run: npm run fetcher:seed'
    );
    process.exit(1);
  }
}

// --- Core fetch with retry/fail-fast ---

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(endpoint, retries = 3, backoffMs = 10000) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { 'X-Auth-Token': API_KEY };

  for (let attempt = 1; attempt <= retries; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers });
    } catch (err) {
      // Network error (DNS, timeout, etc.) — retryable
      if (attempt === retries) {
        console.error(`[Network Error] ${err.message} on ${url} after ${retries} attempts.`);
        throw err;
      }
      console.warn(`[Network Error] ${err.message} on ${url}. Retrying in ${backoffMs / 1000}s (${attempt}/${retries})...`);
      await sleep(backoffMs);
      backoffMs *= 2;
      continue;
    }

    if (res.ok) {
      return await res.json();
    }

    // Client config errors: fail immediately, never retry
    if (isClientConfigError(res.status)) {
      await logResponseDiagnostic(res, url, headers);
      const advice = clientErrorAdvice(res.status);
      throw new Error(
        `HTTP ${res.status} on ${endpoint} — not retryable. ${advice}`
      );
    }

    // 429 rate limit: always retry with backoff
    if (res.status === 429) {
      console.warn(`[429 Rate Limit] on ${endpoint}. Backing off ${backoffMs / 1000}s (${attempt}/${retries})...`);
      await sleep(backoffMs);
      backoffMs *= 2;
      continue;
    }

    // Other 5xx: retry with backoff
    if (RETRYABLE_STATUS.has(res.status)) {
      if (attempt === retries) {
        await logResponseDiagnostic(res, url, headers);
        throw new Error(`HTTP ${res.status} on ${endpoint} after ${retries} attempts.`);
      }
      console.warn(`[HTTP ${res.status}] on ${endpoint}. Retrying in ${backoffMs / 1000}s (${attempt}/${retries})...`);
      await sleep(backoffMs);
      backoffMs *= 2;
      continue;
    }

    // Any other unexpected status: log and fail
    await logResponseDiagnostic(res, url, headers);
    throw new Error(`HTTP ${res.status}: ${res.statusText} on ${endpoint}`);
  }
}

// --- Check mode: validate API key without DB ---

async function runCheck() {
  requireApiKey();
  console.log('[Check] Testing football-data.org API connectivity...');
  console.log(`[Check] API base: ${API_BASE}`);
  console.log(`[Check] Token:    ***${API_KEY.slice(-4)} (${API_KEY.length} chars)`);

  const url = `${API_BASE}/competitions`;
  const headers = { 'X-Auth-Token': API_KEY };

  let res;
  try {
    res = await fetch(url, { headers });
  } catch (err) {
    console.error(`[Check FAIL] Network error: ${err.message}`);
    console.error('  Verify internet connectivity and DNS resolution for api.football-data.org');
    process.exit(1);
  }

  if (!res.ok) {
    await logResponseDiagnostic(res, url, headers);
    if (isClientConfigError(res.status)) {
      console.error(`[Check FAIL] ${clientErrorAdvice(res.status)}`);
    } else {
      console.error(`[Check FAIL] Unexpected HTTP ${res.status}`);
    }
    process.exit(1);
  }

  const data = await res.json();
  const count = data.count || (data.competitions || []).length;
  console.log(`[Check OK] API key valid. ${count} competitions available.`);
  const free = (data.competitions || []).filter(c => ['PL', 'PD', 'BL1', 'SA', 'FL1', 'CL'].includes(c.code));
  if (free.length > 0) {
    console.log(`[Check OK] Configured leagues found: ${free.map(c => c.code).join(', ')}`);
  } else {
    console.warn('[Check WARN] None of the configured league codes found in response. Check your plan tier.');
  }
  process.exit(0);
}

// --- Helpers ---

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function formatScoreboardDate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function mapMatchStatus(status) {
  switch (status) {
    case 'SCHEDULED':
    case 'TIMED':
      return { state: 'pre', name: status, description: 'Scheduled', completed: false, suspended: false };
    case 'IN_PLAY':
      return { state: 'in', name: 'STATUS_IN_PROGRESS', description: 'In Play', completed: false, suspended: false };
    case 'PAUSED':
      return { state: 'in', name: 'STATUS_HALFTIME', description: 'Half Time', completed: false, suspended: false };
    case 'FINISHED':
    case 'AWARDED':
      return { state: 'post', name: 'STATUS_FINAL', description: 'Final', completed: true, suspended: false };
    case 'POSTPONED':
      return { state: 'unknown', name: 'STATUS_POSTPONED', description: 'Postponed', completed: true, suspended: true };
    case 'CANCELLED':
      return { state: 'unknown', name: 'STATUS_CANCELLED', description: 'Cancelled', completed: true, suspended: true };
    case 'SUSPENDED':
      return { state: 'unknown', name: 'STATUS_SUSPENDED', description: 'Suspended', completed: true, suspended: true };
    default:
      return { state: 'unknown', name: status || 'UNKNOWN', description: status || 'Unknown', completed: false, suspended: false };
  }
}

// --- Sync functions (require DB) ---

async function syncLeagues(mongoose, SoccerLeague) {
  console.log('--- Syncing Leagues ---');
  const data = await fetchWithRetry('/competitions');
  const competitions = data.competitions || [];

  for (const leagueConfig of LEAGUE_MAPPING) {
    const comp = competitions.find((c) => c.code === leagueConfig.code);
    const seasonData = comp?.currentSeason ? {
      year: new Date(comp.currentSeason.startDate).getFullYear(),
      display_name: `${comp.name} ${new Date(comp.currentSeason.startDate).getFullYear()}`,
      current: true,
      type_id: '1',
      type_name: 'Regular Season'
    } : undefined;

    const leagueDoc = {
      slug: leagueConfig.slug,
      name: comp?.name || leagueConfig.name,
      abbreviation: comp?.code || leagueConfig.code,
      country: comp?.area?.name || leagueConfig.country,
      kind: 'club',
      logo: comp?.emblem || '',
      active: true,
      source: {
        provider: 'football-data.org',
        source_id: comp ? String(comp.id) : leagueConfig.code
      },
      season: seasonData,
      last_synced_at: new Date()
    };

    await SoccerLeague.updateOne(
      { slug: leagueConfig.slug },
      { $set: leagueDoc, $setOnInsert: { created_at: new Date() } },
      { upsert: true }
    );
    console.log(`[League] Upserted ${leagueConfig.slug} (${leagueConfig.name})`);
  }
  await sleep(REQUEST_DELAY_MS);
}

async function syncClubsForLeague(SoccerClub, leagueConfig) {
  console.log(`--- Syncing Clubs for ${leagueConfig.name} (${leagueConfig.code}) ---`);
  try {
    const data = await fetchWithRetry(`/competitions/${leagueConfig.code}/teams`);
    const teams = data.teams || [];

    for (const team of teams) {
      const clubId = String(team.id);
      const clubDoc = {
        name: team.name,
        display_name: team.name,
        short_display_name: team.shortName || team.name,
        abbreviation: team.tla || '',
        country: team.area?.name || leagueConfig.country,
        city: team.venue || '',
        logo: team.crest || '',
        founded_year: team.founded || undefined,
        venue: team.venue ? { name: team.venue } : undefined,
        coach: team.coach ? { name: team.coach.name } : undefined,
        active: true,
        last_synced_at: new Date()
      };

      await SoccerClub.updateOne(
        { 'source.provider': 'football-data.org', 'source.club_id': clubId },
        {
          $set: {
            ...clubDoc,
            'source.provider': 'football-data.org',
            'source.club_id': clubId
          },
          $addToSet: { league_slugs: leagueConfig.slug },
          $setOnInsert: { created_at: new Date() }
        },
        { upsert: true }
      );
    }
    console.log(`[Clubs] Upserted ${teams.length} clubs for ${leagueConfig.slug}`);
  } catch (err) {
    console.error(`[Clubs Error] Failed to sync clubs for ${leagueConfig.code}: ${err.message}`);
  }
  await sleep(REQUEST_DELAY_MS);
}

async function syncMatchesForLeague(SoccerMatch, leagueConfig, dateFrom, dateTo) {
  console.log(`--- Syncing Matches for ${leagueConfig.name} (${dateFrom} to ${dateTo}) ---`);
  try {
    const data = await fetchWithRetry(`/competitions/${leagueConfig.code}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`);
    const matches = data.matches || [];

    for (const match of matches) {
      const matchDate = new Date(match.utcDate);
      const scoreboardDate = formatScoreboardDate(matchDate);
      const eventId = String(match.id);
      const homeScore = match.score?.fullTime?.home ?? (match.score?.regularTime?.home ?? undefined);
      const awayScore = match.score?.fullTime?.away ?? (match.score?.regularTime?.away ?? undefined);

      const statusMapped = mapMatchStatus(match.status);
      if (match.status === 'IN_PLAY' || match.status === 'PAUSED') {
        statusMapped.detail = match.minute ? `${match.minute}'` : '';
        statusMapped.clock = statusMapped.detail;
      }

      const matchDoc = {
        league_slug: leagueConfig.slug,
        scoreboard_date: scoreboardDate,
        date: matchDate,
        name: `${match.homeTeam?.name || 'Home'} vs ${match.awayTeam?.name || 'Away'}`,
        short_name: `${match.homeTeam?.tla || 'H'} vs ${match.awayTeam?.tla || 'A'}`,
        season: match.season ? {
          year: new Date(match.season.startDate).getFullYear(),
          type_id: String(match.matchday || 1),
          name: `Matchday ${match.matchday || ''}`
        } : undefined,
        status: statusMapped,
        home: {
          source_id: String(match.homeTeam?.id || ''),
          name: match.homeTeam?.name || '',
          display_name: match.homeTeam?.name || '',
          abbreviation: match.homeTeam?.tla || '',
          logo: match.homeTeam?.crest || '',
          score: typeof homeScore === 'number' ? homeScore : undefined,
          winner: match.score?.winner === 'HOME_TEAM'
        },
        away: {
          source_id: String(match.awayTeam?.id || ''),
          name: match.awayTeam?.name || '',
          display_name: match.awayTeam?.name || '',
          abbreviation: match.awayTeam?.tla || '',
          logo: match.awayTeam?.crest || '',
          score: typeof awayScore === 'number' ? awayScore : undefined,
          winner: match.score?.winner === 'AWAY_TEAM'
        },
        venue: match.venue ? { name: match.venue } : undefined,
        last_synced_at: new Date()
      };

      await SoccerMatch.updateOne(
        {
          'source.provider': 'football-data.org',
          league_slug: leagueConfig.slug,
          'source.event_id': eventId
        },
        {
          $set: {
            ...matchDoc,
            'source.provider': 'football-data.org',
            'source.event_id': eventId,
            'source.competition_id': leagueConfig.code
          },
          $setOnInsert: { created_at: new Date() }
        },
        { upsert: true }
      );
    }
    console.log(`[Matches] Upserted ${matches.length} matches for ${leagueConfig.slug}`);
  } catch (err) {
    console.error(`[Matches Error] Failed to sync matches for ${leagueConfig.code}: ${err.message}`);
  }
  await sleep(REQUEST_DELAY_MS);
}

async function syncStandingsForLeague(SoccerStanding, leagueConfig) {
  console.log(`--- Syncing Standings for ${leagueConfig.name} ---`);
  try {
    const data = await fetchWithRetry(`/competitions/${leagueConfig.code}/standings`);
    const standings = data.standings || [];
    const seasonYear = data.season?.startDate ? new Date(data.season.startDate).getFullYear() : new Date().getFullYear();

    for (const st of standings) {
      const groupId = st.group ? st.group.toLowerCase().replace(/[^a-z0-9]/g, '_') : (st.type ? st.type.toLowerCase() : 'overall');
      const groupName = st.group || (st.type === 'TOTAL' ? 'League Table' : (st.type || 'Overall'));

      const entries = (st.table || []).map((row) => {
        const stats = new Map();
        if (typeof row.playedGames === 'number') stats.set('gamesPlayed', row.playedGames);
        if (typeof row.won === 'number') stats.set('wins', row.won);
        if (typeof row.draw === 'number') stats.set('ties', row.draw);
        if (typeof row.lost === 'number') stats.set('losses', row.lost);
        if (typeof row.points === 'number') stats.set('points', row.points);
        if (typeof row.goalsFor === 'number') stats.set('goalsFor', row.goalsFor);
        if (typeof row.goalsAgainst === 'number') stats.set('goalsAgainst', row.goalsAgainst);
        if (typeof row.goalDifference === 'number') stats.set('goalDifference', row.goalDifference);

        return {
          rank: row.position,
          club: {
            source_id: String(row.team?.id || ''),
            display_name: row.team?.name || '',
            abbreviation: row.team?.tla || '',
            logo: row.team?.crest || ''
          },
          stats
        };
      });

      await SoccerStanding.updateOne(
        {
          league_slug: leagueConfig.slug,
          season_year: seasonYear,
          group_id: groupId
        },
        {
          $set: {
            league_slug: leagueConfig.slug,
            season_year: seasonYear,
            group_id: groupId,
            group_name: groupName,
            entries,
            last_synced_at: new Date()
          },
          $setOnInsert: { created_at: new Date() }
        },
        { upsert: true }
      );
    }
    console.log(`[Standings] Upserted standings for ${leagueConfig.slug}`);
  } catch (err) {
    console.error(`[Standings Error] Failed to sync standings for ${leagueConfig.code}: ${err.message}`);
  }
  await sleep(REQUEST_DELAY_MS);
}

// --- Modes ---

async function runSeed() {
  const mongoose = require('../../database');
  const SoccerLeague = require('../../models/soccerLeague');
  const SoccerClub = require('../../models/soccerClub');
  const SoccerMatch = require('../../models/soccerMatch');
  const SoccerStanding = require('../../models/soccerStanding');

  console.log('=== Starting Full Seed ===');
  const today = new Date();
  const next7Days = new Date();
  next7Days.setDate(today.getDate() + 7);

  const dateFrom = formatDate(today);
  const dateTo = formatDate(next7Days);

  await syncLeagues(mongoose, SoccerLeague);

  for (const league of LEAGUE_MAPPING) {
    await syncClubsForLeague(SoccerClub, league);
    await syncMatchesForLeague(SoccerMatch, league, dateFrom, dateTo);
    await syncStandingsForLeague(SoccerStanding, league);
  }

  console.log('=== Seed Complete ===');
  await mongoose.disconnect();
}

async function runLiveOnce(SoccerMatch) {
  console.log(`=== Running Live Match Sync at ${new Date().toISOString()} ===`);
  const todayStr = formatDate(new Date());

  for (const league of LEAGUE_MAPPING) {
    await syncMatchesForLeague(SoccerMatch, league, todayStr, todayStr);
  }
  console.log('=== Live Sync Finished ===');
}

async function main() {
  const args = process.argv.slice(2);
  const modeIndex = args.indexOf('--mode');
  const mode = modeIndex !== -1 ? args[modeIndex + 1] : 'seed';

  // Check mode — no DB required
  if (mode === 'check') {
    await runCheck();
    return; // runCheck calls process.exit
  }

  // All other modes require a valid API key
  requireApiKey();

  try {
    if (mode === 'live') {
      const mongoose = require('../../database');
      const SoccerMatch = require('../../models/soccerMatch');

      console.log('Mode: LIVE. Syncing matches every 5 minutes.');
      await runLiveOnce(SoccerMatch);
      setInterval(async () => {
        try {
          await runLiveOnce(SoccerMatch);
        } catch (err) {
          console.error('[Live Sync Error]', err);
        }
      }, 5 * 60 * 1000);
    } else {
      console.log('Mode: SEED. Running full ingestion once.');
      await runSeed();
      process.exit(0);
    }
  } catch (err) {
    console.error('[Fatal Error]', err);
    try {
      const mongoose = require('../../database');
      await mongoose.disconnect();
    } catch { /* already disconnected or never connected */ }
    process.exit(1);
  }
}

main();
