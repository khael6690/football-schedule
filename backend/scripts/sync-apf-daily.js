/**
 * Daily API-Football Seeder & Match Result Synchronizer
 *
 * Fetches match results and fixtures from API-Football (v3.football.api-sports.io)
 * for a sliding window (default: yesterday, today, tomorrow) and updates both:
 *   1. apf_fixtures (API-Football durable collection in MongoDB)
 *   2. soccer_matches (football-data.org collection in MongoDB)
 *
 * Also registers ID mappings and invalidates affected Redis cache keys so the
 * frontend and public APIs immediately reflect final (FT) scores and match status.
 *
 * Quota discipline (free tier: 100 req/day, 10 req/min):
 *   - 1 API call per date -> default 3 dates = exactly 3 API requests per run
 *   - 7s delay between requests to stay under 10 req/min
 *   - Aborts safely if quota reaches threshold (<= 5 remaining)
 *
 * Usage:
 *   npm run sync:daily
 *   npm run sync:daily -- --dry-run
 *   npm run sync:daily -- --date=2026-09-22
 *   npm run sync:daily -- --days=5
 *   npm run sync:daily -- --from=2026-09-20 --to=2026-09-22
 *   npm run sync:daily -- --force
 *
 * Options:
 *   --date=YYYY-MM-DD     Sync a single specific date (WIB).
 *   --days=N              Sync past N days up to tomorrow (default 3: yesterday, today, tomorrow).
 *   --from=YYYY-MM-DD     Start date (inclusive).
 *   --to=YYYY-MM-DD       End date (inclusive).
 *   --force               Re-sync and overwrite even if all matches in date appear final.
 *   --dry-run             Plan only. Zero API calls, zero database/Redis writes.
 *
 * Env required:
 *   API_FOOTBALL_KEY
 *   MONGODB_URL (or MONGODB_URI)
 *   UPSTASH_REDIS_REST_URL (optional, for cache invalidation)
 *   UPSTASH_REDIS_REST_TOKEN (optional)
 */

const { loadEnvConfig } = require('../config/env');

loadEnvConfig();

const mongoose = require('../database');
const apiFootball = require('../providers/apiFootballProvider');
const idMapping = require('../services/idMappingService');
const apfStore = require('../services/apfStore');
const cache = require('../services/cacheService');
const SoccerMatch = require('../models/soccerMatch');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DELAY_MS = 7000;          // ~8.5 req/min, well under 10 req/min limit
const QUOTA_ABORT_AT = 5;

function parseArgs(argv) {
    const args = {
        days: null,
        date: null,
        from: null,
        to: null,
        force: false,
        dryRun: false,
    };

    for (const a of argv.slice(2)) {
        if (a === '--dry-run') args.dryRun = true;
        else if (a === '--force') args.force = true;
        else if (a.startsWith('--date=')) args.date = a.slice(7).trim();
        else if (a.startsWith('--days=')) args.days = parseInt(a.slice(7), 10);
        else if (a.startsWith('--from=')) args.from = a.slice(7).trim();
        else if (a.startsWith('--to=')) args.to = a.slice(5).trim();
    }
    return args;
}

function todayWib() {
    return new Date(Date.now() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

function shiftDate(dateStr, days) {
    const ms = Date.parse(`${dateStr}T00:00:00Z`) + days * 86400000;
    return new Date(ms).toISOString().slice(0, 10);
}

function dateRange(from, to) {
    const out = [];
    let d = from;
    let guard = 0;
    while (d <= to && guard++ < 30) {
        out.push(d);
        d = shiftDate(d, 1);
    }
    return out;
}

function resolveDates(args) {
    if (args.date) {
        if (!DATE_RE.test(args.date)) throw new Error(`Invalid --date: ${args.date}`);
        return [args.date];
    }
    if (args.from) {
        if (!DATE_RE.test(args.from)) throw new Error(`Invalid --from: ${args.from}`);
        const to = args.to || todayWib();
        if (!DATE_RE.test(to)) throw new Error(`Invalid --to: ${to}`);
        if (args.from > to) throw new Error(`--from (${args.from}) is after --to (${to})`);
        return dateRange(args.from, to);
    }

    // Default sliding window: yesterday, today, tomorrow (3 dates)
    const today = todayWib();
    const days = Number.isFinite(args.days) && args.days > 0 ? args.days : 3;

    if (days === 1) {
        return [today];
    }
    if (days === 2) {
        return [shiftDate(today, -1), today];
    }

    // Default 3 dates: yesterday, today, tomorrow
    const pastDays = days - 2; // e.g. for 3 days -> 1 past day (yesterday)
    const start = shiftDate(today, -pastDays);
    const end = shiftDate(today, 1); // tomorrow
    return dateRange(start, end);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function cleanTeamName(name) {
    return String(name || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\b(fc|cf|afc|bc|ac|sc|club|de|del|la)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Match a normalized API-Football fixture to an existing SoccerMatch document.
 * Checks via idMapping first, then team name matching within the same date.
 */
async function syncToSoccerMatch(apfFixture) {
    const apfId = String(apfFixture.providers?.apiFootball || apfFixture.id || '').replace(/^apf-/, '');
    if (!apfId) return false;

    let soccerMatchDoc = null;

    // 1. Try finding via existing ID mapping
    const fdId = await idMapping.getFootballDataId(apfId);
    if (fdId) {
        soccerMatchDoc = await SoccerMatch.findOne({ 'source.event_id': String(fdId) });
    }

    // 2. Fallback: Search in SoccerMatch by kickoff date (within ±14 hours) and matching team names
    if (!soccerMatchDoc && apfFixture.kickoff) {
        const kickoffTime = new Date(apfFixture.kickoff).getTime();
        const minDate = new Date(kickoffTime - 14 * 3600 * 1000);
        const maxDate = new Date(kickoffTime + 14 * 3600 * 1000);

        const candidates = await SoccerMatch.find({
            date: { $gte: minDate, $lte: maxDate }
        }).lean();

        const apfHomeClean = cleanTeamName(apfFixture.home?.name);
        const apfAwayClean = cleanTeamName(apfFixture.away?.name);

        for (const cand of candidates) {
            const candHomeClean = cleanTeamName(cand.home?.name || cand.home?.display_name);
            const candAwayClean = cleanTeamName(cand.away?.name || cand.away?.display_name);

            const homeMatch = apfHomeClean && candHomeClean && (
                apfHomeClean.includes(candHomeClean) || candHomeClean.includes(apfHomeClean)
            );
            const awayMatch = apfAwayClean && candAwayClean && (
                apfAwayClean.includes(candAwayClean) || candAwayClean.includes(apfAwayClean)
            );

            if (homeMatch && awayMatch) {
                soccerMatchDoc = cand;
                // Register mapping for future lookups
                if (cand.source?.event_id) {
                    await idMapping.setMapping(cand.source.event_id, apfId, {
                        leagueSlug: cand.league_slug,
                        homeTeam: cand.home?.name,
                        awayTeam: cand.away?.name,
                        kickoff: cand.date,
                    });
                }
                break;
            }
        }
    }

    if (!soccerMatchDoc) return false;

    // Build update fields for SoccerMatch
    const state = apfFixture.status?.state || 'unknown';
    const isFinished = state === 'post';
    const isLive = state === 'in';

    const statusName = isFinished
        ? 'STATUS_FINAL'
        : isLive
            ? 'STATUS_IN_PROGRESS'
            : (apfFixture.status?.short === 'HT' ? 'STATUS_HALFTIME' : 'SCHEDULED');

    const statusDescription = apfFixture.status?.long
        || (isFinished ? 'Final' : isLive ? 'In Play' : 'Scheduled');

    const shortDetail = apfFixture.status?.short || (isFinished ? 'FT' : '');

    const updateDoc = {
        'status.state': state,
        'status.name': statusName,
        'status.description': statusDescription,
        'status.detail': apfFixture.status?.elapsed ? `${apfFixture.status.elapsed}'` : shortDetail,
        'status.short_detail': shortDetail,
        'status.completed': isFinished,
        'status.clock': apfFixture.status?.elapsed ? `${apfFixture.status.elapsed}'` : (isFinished ? 'FT' : ''),
        last_synced_at: new Date(),
    };

    if (apfFixture.score?.home !== null && apfFixture.score?.home !== undefined) {
        updateDoc['home.score'] = apfFixture.score.home;
    }
    if (apfFixture.score?.away !== null && apfFixture.score?.away !== undefined) {
        updateDoc['away.score'] = apfFixture.score.away;
    }
    if (typeof apfFixture.home?.winner === 'boolean') {
        updateDoc['home.winner'] = apfFixture.home.winner;
    }
    if (typeof apfFixture.away?.winner === 'boolean') {
        updateDoc['away.winner'] = apfFixture.away.winner;
    }

    await SoccerMatch.updateOne(
        { _id: soccerMatchDoc._id },
        { $set: updateDoc }
    );

    return true;
}

/**
 * Invalidate Redis cache for a date to ensure visitors get fresh data immediately.
 */
async function invalidateDateCaches(dateStr) {
    try {
        const wibKey = dateStr.replace(/-/g, '');
        await cache.invalidateDate(dateStr);
        await cache.del(
            `football:finished:${wibKey}`,
            `football:fixtures:date:${dateStr}`,
            `football:matches:${dateStr}`,
            `football:matches:${wibKey}`
        );
        console.log(`[SYNC-APF] Invalidated Redis cache for date ${dateStr} (key: ${wibKey})`);
    } catch (err) {
        console.warn(`[SYNC-APF] Redis invalidation warning for ${dateStr}:`, err.message);
    }
}

async function runDailySync() {
    const args = parseArgs(process.argv);
    const dates = resolveDates(args);

    console.log(`=== API-Football Daily Sync ===`);
    console.log(`Dates: ${dates.join(', ')} (${dates.length} date${dates.length > 1 ? 's' : ''})`);
    console.log(`Options: dryRun=${args.dryRun} force=${args.force}`);

    if (!args.dryRun && !process.env.API_FOOTBALL_KEY) {
        console.error('[SYNC-APF] ❌ API_FOOTBALL_KEY is not set in environment or .env — aborting');
        process.exitCode = 1;
        return;
    }

    if (!args.dryRun) {
        try {
            if (mongoose.connection.readyState !== 1) {
                console.log('⏳ Connecting to MongoDB...');
                await mongoose.connection.asPromise();
            }
            console.log('✅ Connected to MongoDB');
        } catch (err) {
            console.error('[SYNC-APF] ❌ MongoDB connection failed:', err.message);
            process.exitCode = 1;
            return;
        }
    }

    let totalFetched = 0;
    let totalApfUpserted = 0;
    let totalSoccerMatchesUpdated = 0;

    for (const date of dates) {
        console.log(`\n📅 Processing date: ${date}`);

        // Check if all archived fixtures are already final (unless --force is passed)
        if (!args.force && !args.dryRun) {
            const archived = await apfStore.getFixturesByDateKey(date);
            const isPast = date < todayWib();
            if (archived.length > 0 && isPast) {
                const allFinal = archived.every(f => f.status?.state === 'post');
                if (allFinal) {
                    console.log(`  ⏩ Skipping ${date}: all ${archived.length} fixtures are already final (FT) in MongoDB.`);
                    continue;
                }
            }
        }

        if (args.dryRun) {
            console.log(`  [DRY RUN] Would fetch fixtures from API-Football for date ${date}`);
            continue;
        }

        // Quota safety check
        const quota = apiFootball.getQuotaState();
        if (quota.exhausted || (quota.remaining !== null && quota.remaining <= QUOTA_ABORT_AT)) {
            console.warn(`⚠️ [SYNC-APF] Quota remaining ${quota.remaining}/${quota.limit} is too low (<= ${QUOTA_ABORT_AT}). Stopping sync.`);
            break;
        }

        let rawFixtures;
        try {
            rawFixtures = await apiFootball.fetchFixturesByDate(date);
        } catch (err) {
            console.error(`❌ [SYNC-APF] Error fetching date ${date}:`, err.message);
            await sleep(DELAY_MS);
            continue;
        }

        if (rawFixtures === null) {
            console.warn(`⚠️ [SYNC-APF] Quota exhausted while fetching date ${date}`);
            break;
        }

        totalFetched += rawFixtures.length;
        console.log(`  📥 Fetched ${rawFixtures.length} priority fixtures for ${date}`);

        if (rawFixtures.length === 0) {
            await sleep(DELAY_MS);
            continue;
        }

        // Normalize
        const normalized = rawFixtures.map(apiFootball.normalizeLiveFixture);

        // Enrich with existing mapping if available
        const enriched = await Promise.all(normalized.map(async (f) => {
            const fdId = await idMapping.getFootballDataId(f.providers.apiFootball);
            if (fdId) f.providers.footballData = fdId;
            return f;
        }));

        // 1. Save to apf_fixtures
        const saveRes = await apfStore.saveFixtures(enriched);
        totalApfUpserted += (saveRes.upserted + saveRes.modified);
        console.log(`  💾 apf_fixtures: upserted=${saveRes.upserted}, modified=${saveRes.modified}`);

        // 2. Cross-sync to soccer_matches
        let smCount = 0;
        for (const f of enriched) {
            const updated = await syncToSoccerMatch(f);
            if (updated) smCount++;
        }
        totalSoccerMatchesUpdated += smCount;
        console.log(`  ⚽ soccer_matches: updated=${smCount} matches with FT score/status`);

        // 3. Invalidate Redis cache for this date
        await invalidateDateCaches(date);

        const currentQuota = apiFootball.getQuotaState();
        console.log(`  📊 Quota remaining: ${currentQuota.remaining}/${currentQuota.limit}`);

        await sleep(DELAY_MS);
    }

    console.log(`\n=== Sync Complete ===`);
    console.log(`Total fixtures fetched: ${totalFetched}`);
    console.log(`Total apf_fixtures saved: ${totalApfUpserted}`);
    console.log(`Total soccer_matches updated: ${totalSoccerMatchesUpdated}`);
}

runDailySync()
    .then(async () => {
        try {
            await mongoose.disconnect();
        } catch {}
        process.exit(0);
    })
    .catch(async (err) => {
        console.error('❌ [SYNC-APF] Fatal Error:', err.message);
        try {
            await mongoose.disconnect();
        } catch {}
        process.exit(1);
    });
