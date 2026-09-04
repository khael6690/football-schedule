/**
 * Backfill API-Football fixtures into MongoDB (`apf_fixtures`).
 *
 * MANUAL ONLY — never wired into the server or any worker.
 *
 * Usage:
 *   npm run backfill:apf -- --days=30
 *   npm run backfill:apf -- --from=2026-08-01 --to=2026-08-31
 *   npm run backfill:apf -- --days=7 --dry-run
 *
 * Options:
 *   --days=N              Backfill the last N days ending yesterday (default 30).
 *                         Ignored when --from/--to are given.
 *   --from=YYYY-MM-DD     Start date (inclusive).
 *   --to=YYYY-MM-DD       End date (inclusive). Defaults to today (WIB).
 *   --dry-run             Plan only. Zero API calls, zero writes.
 *
 * Quota discipline (free tier: 100 req/day, 10 req/min):
 *   - 1 API call per date, only when Mongo has no data for that date
 *     (idempotent — safe to re-run)
 *   - 7s delay between calls
 *   - aborts when getQuotaState().remaining <= 5
 *
 * Env required: API_FOOTBALL_KEY, MONGODB_URL (or MONGODB_URI)
 */

const { loadEnvConfig } = require('../config/env');

loadEnvConfig();

const mongoose = require('../database');
const apiFootball = require('../providers/apiFootballProvider');
const idMapping = require('../services/idMappingService');
const apfStore = require('../services/apfStore');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DELAY_MS = 7000;          // 10 req/min limit -> ~8.5 req/min
const QUOTA_ABORT_AT = 5;

function parseArgs(argv) {
    const args = { days: 30, from: null, to: null, dryRun: false };
    for (const a of argv.slice(2)) {
        if (a === '--dry-run') args.dryRun = true;
        else if (a.startsWith('--days=')) args.days = parseInt(a.slice(7), 10);
        else if (a.startsWith('--from=')) args.from = a.slice(7);
        else if (a.startsWith('--to=')) args.to = a.slice(5);
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

/** Inclusive list of YYYY-MM-DD from `from` to `to`. */
function dateRange(from, to) {
    const out = [];
    let d = from;
    let guard = 0;
    while (d <= to && guard++ < 400) {
        out.push(d);
        d = shiftDate(d, 1);
    }
    return out;
}

function resolveDates(args) {
    if (args.from) {
        if (!DATE_RE.test(args.from)) throw new Error(`Invalid --from: ${args.from}`);
        const to = args.to || todayWib();
        if (!DATE_RE.test(to)) throw new Error(`Invalid --to: ${to}`);
        if (args.from > to) throw new Error(`--from (${args.from}) is after --to (${to})`);
        return dateRange(args.from, to);
    }

    const days = Number.isFinite(args.days) && args.days > 0 ? args.days : 30;
    const end = shiftDate(todayWib(), -1); // yesterday
    const start = shiftDate(end, -(days - 1));
    return dateRange(start, end);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function backfill() {
    const args = parseArgs(process.argv);
    const dates = resolveDates(args);

    console.log(`[BACKFILL] ${dates.length} date(s): ${dates[0]} .. ${dates[dates.length - 1]}${args.dryRun ? '  (DRY RUN — no API calls, no writes)' : ''}`);

    if (!args.dryRun && !process.env.API_FOOTBALL_KEY) {
        console.error('[BACKFILL] API_FOOTBALL_KEY is not set — aborting');
        process.exitCode = 1;
        return;
    }

    // Wait for Mongo so idempotency checks are meaningful
    try {
        await mongoose.connection.asPromise();
    } catch (err) {
        console.error('[BACKFILL] MongoDB connection failed:', err.message);
        process.exitCode = 1;
        return;
    }

    let fetched = 0;
    let skipped = 0;
    let stored = 0;

    for (const date of dates) {
        const existing = await apfStore.countFixturesByDateKey(date);

        if (existing > 0) {
            skipped++;
            console.log(`[BACKFILL] ${date} — skip (already in Mongo: ${existing} fixtures)`);
            continue;
        }

        if (args.dryRun) {
            console.log(`[BACKFILL] ${date} — would fetch (1 API call)`);
            continue;
        }

        const quota = apiFootball.getQuotaState();
        if (quota.exhausted || (quota.remaining !== null && quota.remaining <= QUOTA_ABORT_AT)) {
            console.warn(`[BACKFILL] STOPPING — quota remaining ${quota.remaining}/${quota.limit} (<= ${QUOTA_ABORT_AT}). Re-run tomorrow to continue; already-stored dates will be skipped.`);
            break;
        }

        let raw;
        try {
            raw = await apiFootball.fetchFixturesByDate(date);
        } catch (err) {
            console.error(`[BACKFILL] ${date} — fetch error: ${err.message}`);
            await sleep(DELAY_MS);
            continue;
        }

        if (raw === null) {
            console.warn(`[BACKFILL] STOPPING — quota exhausted while fetching ${date}`);
            break;
        }

        fetched++;
        const normalized = raw.map(apiFootball.normalizeLiveFixture);
        const enriched = await Promise.all(normalized.map(async (f) => {
            const fdId = await idMapping.getFootballDataId(f.providers.apiFootball);
            if (fdId) f.providers.footballData = fdId;
            return f;
        }));

        const res = await apfStore.saveFixtures(enriched);
        stored += res.upserted + res.modified;

        const q = apiFootball.getQuotaState();
        console.log(`[BACKFILL] ${date} — fixtures=${enriched.length} source=api upserted=${res.upserted} modified=${res.modified} quota=${q.remaining}/${q.limit}`);

        await sleep(DELAY_MS);
    }

    console.log(`[BACKFILL] Done — dates=${dates.length} fetched=${fetched} skipped=${skipped} stored=${stored}`);
}

backfill()
    .then(() => mongoose.disconnect())
    .catch(async (err) => {
        console.error('[BACKFILL] Failed:', err.message);
        await mongoose.disconnect().catch(() => {});
        process.exitCode = 1;
    });
