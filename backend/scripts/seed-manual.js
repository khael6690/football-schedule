/**
 * Seed manually researched fixtures into MongoDB.
 *
 * API-Football's free plan only serves roughly the last 3 days of fixtures.
 * Older results have to be entered by hand. This script validates a JSON file
 * of fixtures written in the existing `FixtureDetail` contract and upserts
 * them into `apf_fixtures` (summary) and `apf_fixture_details` (full detail),
 * flagged `manual: true` so API syncs cannot clobber them.
 *
 * MANUAL ONLY — never wired into the server or any worker. Zero API calls.
 *
 * Usage:
 *   npm run seed:manual -- --date=2026-09-01 --dry-run
 *   npm run seed:manual -- --date=2026-09-01
 *   npm run seed:manual -- --file=data/manual/2026-09-01.json
 *   npm run seed:manual -- --all --dry-run
 *
 * Options:
 *   --date=YYYY-MM-DD   Read backend/data/manual/{date}.json
 *   --file=path         Read an explicit file (relative to cwd or backend/)
 *   --all               Read every *.json in backend/data/manual (skips *.example.json)
 *   --dry-run           Validate and report only. No writes.
 *
 * Env required: MONGODB_URL (or MONGODB_URI). No API key needed.
 */

const fs = require('fs');
const path = require('path');

const { loadEnvConfig } = require('../config/env');

loadEnvConfig();

const mongoose = require('../database');
const apfStore = require('../services/apfStore');
const cache = require('../services/cacheService');
const { manualFixtureId, isManualFixtureId } = require('../services/manualFixtureId');

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** WIB calendar date a kickoff belongs to — same rule apfStore uses to store `date_key`. */
function wibDateKey(iso) {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return null;
    return new Date(ms + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

const MANUAL_DIR = path.join(__dirname, '..', 'data', 'manual');
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const STATE_BY_SHORT = {
    TBD: 'pre', NS: 'pre',
    '1H': 'in', HT: 'in', '2H': 'in', ET: 'in', BT: 'in', P: 'in', SUSP: 'in', INT: 'in', LIVE: 'in',
    FT: 'post', AET: 'post', PEN: 'post',
    PST: 'unknown', CANC: 'unknown', ABD: 'unknown', AWD: 'unknown', WO: 'unknown',
};
const FINAL_SHORTS = new Set(['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO']);
const EVENT_TYPES = new Set(['Goal', 'Card', 'subst', 'Var']);

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
    const args = { date: null, file: null, all: false, dryRun: false };
    for (const a of argv.slice(2)) {
        if (a === '--dry-run') args.dryRun = true;
        else if (a === '--all') args.all = true;
        else if (a.startsWith('--date=')) args.date = a.slice(7);
        else if (a.startsWith('--file=')) args.file = a.slice(7);
    }
    return args;
}

function resolveFiles(args) {
    if (args.file) {
        const candidates = [
            path.resolve(process.cwd(), args.file),
            path.resolve(__dirname, '..', args.file),
            path.resolve(__dirname, '..', '..', args.file),
        ];
        const found = candidates.find(p => fs.existsSync(p));
        if (!found) throw new Error(`File not found: ${args.file}`);
        return [found];
    }

    if (args.date) {
        if (!DATE_RE.test(args.date)) throw new Error(`Invalid --date: ${args.date}`);
        const p = path.join(MANUAL_DIR, `${args.date}.json`);
        if (!fs.existsSync(p)) throw new Error(`File not found: ${p}`);
        return [p];
    }

    if (args.all) {
        if (!fs.existsSync(MANUAL_DIR)) throw new Error(`Directory not found: ${MANUAL_DIR}`);
        const files = fs.readdirSync(MANUAL_DIR)
            .filter(f => f.endsWith('.json') && !f.endsWith('.example.json'))
            .sort()
            .map(f => path.join(MANUAL_DIR, f));
        if (files.length === 0) throw new Error(`No seed files in ${MANUAL_DIR}`);
        return files;
    }

    throw new Error('Provide one of --date=YYYY-MM-DD, --file=path, or --all');
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isNumOrNull = v => v === null || isNum(v);
const isStrOrNull = v => v === null || typeof v === 'string';

function pairOk(p) {
    return p && typeof p === 'object' && isNumOrNull(p.home) && isNumOrNull(p.away);
}

/**
 * Validate one fixture item.
 * @returns {{errors: string[], warnings: string[]}}
 */
function validateFixture(item, index, fileDateKey) {
    const errors = [];
    const warnings = [];
    const label = () => {
        const h = item?.home?.name || '?';
        const a = item?.away?.name || '?';
        return `[${index}] ${h} vs ${a}`;
    };
    const err = m => errors.push(`${label()}: ${m}`);
    const warn = m => warnings.push(`${label()}: ${m}`);

    if (!item || typeof item !== 'object') {
        errors.push(`[${index}]: item is not an object`);
        return { errors, warnings };
    }

    // fixture_id (optional)
    if (item.fixture_id !== undefined && item.fixture_id !== null) {
        if (!isNum(item.fixture_id)) err('fixture_id must be a number or null');
        else if (isManualFixtureId(item.fixture_id)) err(`fixture_id ${item.fixture_id} is inside the reserved manual range — omit it and let the script derive one`);
    }

    // sources (optional)
    if (item.sources !== undefined) {
        if (!Array.isArray(item.sources) || item.sources.some(s => typeof s !== 'string')) {
            err('sources must be an array of strings');
        }
    }

    // Unknown top-level keys
    const allowed = new Set([
        'fixture_id', 'sources', 'league', 'date', 'venue', 'referee', 'status',
        'home', 'away', 'goals', 'score', 'events', 'lineups', 'statistics', 'id',
    ]);
    for (const k of Object.keys(item)) {
        if (!allowed.has(k)) warn(`unknown field "${k}" will be ignored`);
    }

    // league
    if (!item.league || typeof item.league !== 'object') err('league is required');
    else {
        if (!isNumOrNull(item.league.id)) err('league.id must be a number or null');
        if (!item.league.name) err('league.name is required');
        if (item.league.season !== undefined && !isNumOrNull(item.league.season)) err('league.season must be a number or null');
    }

    // date — must be ISO, and its WIB calendar day must match the file's date_key,
    // because that is the key the fixture is stored and looked up under.
    if (typeof item.date !== 'string' || Number.isNaN(Date.parse(item.date))) {
        err('date must be a valid ISO 8601 string');
    } else if (fileDateKey) {
        const dk = wibDateKey(item.date);
        if (dk !== fileDateKey) {
            err(`date ${item.date} falls on WIB day ${dk}, but the file's date_key is ${fileDateKey} — move it to ${dk}.json or fix the timestamp`);
        }
    }

    // venue / referee
    if (item.venue !== undefined && item.venue !== null && typeof item.venue !== 'object') {
        err('venue must be an object or null');
    }
    if (item.referee !== undefined && !isStrOrNull(item.referee)) err('referee must be a string or null');

    // status
    if (!item.status || typeof item.status !== 'object') err('status is required');
    else {
        const short = item.status.short;
        if (!short || typeof short !== 'string') err('status.short is required');
        else if (!STATE_BY_SHORT[short]) err(`status.short "${short}" is not a known API-Football status`);
        else if (item.status.state !== STATE_BY_SHORT[short]) {
            err(`status.state "${item.status.state}" does not match status.short "${short}" (expected "${STATE_BY_SHORT[short]}")`);
        }
        if (!isNumOrNull(item.status.elapsed === undefined ? null : item.status.elapsed)) {
            err('status.elapsed must be a number or null');
        }
        if (item.status.long !== undefined && !isStrOrNull(item.status.long)) err('status.long must be a string or null');
    }

    // teams
    for (const side of ['home', 'away']) {
        const t = item[side];
        if (!t || typeof t !== 'object') { err(`${side} is required`); continue; }
        if (!isNumOrNull(t.id)) err(`${side}.id must be a number or null`);
        if (!t.name || typeof t.name !== 'string') err(`${side}.name is required`);
        if (t.winner !== undefined && t.winner !== null && typeof t.winner !== 'boolean') {
            err(`${side}.winner must be true, false, or null`);
        }
    }

    // goals + score
    if (!pairOk(item.goals)) err('goals must be { home: number|null, away: number|null }');
    if (!item.score || typeof item.score !== 'object') err('score is required');
    else {
        for (const k of ['halftime', 'fulltime', 'extratime', 'penalty']) {
            if (!pairOk(item.score[k])) err(`score.${k} must be { home: number|null, away: number|null }`);
        }
    }

    // goals vs score.fulltime consistency (fatal — they describe the same thing)
    if (pairOk(item.goals) && item.score && pairOk(item.score.fulltime)) {
        const ft = item.score.fulltime;
        const isFinalStatus = FINAL_SHORTS.has(item.status?.short);
        if (isFinalStatus && (ft.home !== item.goals.home || ft.away !== item.goals.away)) {
            err(`goals ${item.goals.home}-${item.goals.away} does not match score.fulltime ${ft.home}-${ft.away}`);
        }
    }

    // events
    if (!Array.isArray(item.events)) err('events must be an array');
    else {
        item.events.forEach((ev, i) => {
            if (!ev || typeof ev !== 'object') { err(`events[${i}] is not an object`); return; }
            if (!isNum(ev.minute)) err(`events[${i}].minute must be a number`);
            if (ev.extra !== undefined && !isNumOrNull(ev.extra)) err(`events[${i}].extra must be a number or null`);
            if (!EVENT_TYPES.has(ev.type)) err(`events[${i}].type "${ev.type}" must be one of Goal, Card, subst, Var`);
            if (!isNumOrNull(ev.teamId === undefined ? null : ev.teamId)) err(`events[${i}].teamId must be a number or null`);
            if (typeof ev.teamName !== 'string') err(`events[${i}].teamName must be a string`);
            if (ev.player !== undefined && !isStrOrNull(ev.player)) err(`events[${i}].player must be a string or null`);
            if (ev.assist !== undefined && !isStrOrNull(ev.assist)) err(`events[${i}].assist must be a string or null`);
            if (typeof ev.detail !== 'string') err(`events[${i}].detail must be a string`);
        });

        // Goal-count cross-check (warning only — own goals / missing events happen)
        if (pairOk(item.goals) && isNum(item.goals.home) && isNum(item.goals.away)) {
            const goalEvents = item.events.filter(e => e && e.type === 'Goal');
            const total = item.goals.home + item.goals.away;
            if (goalEvents.length !== total) {
                warn(`${goalEvents.length} Goal event(s) but scoreline totals ${total} goal(s)`);
            }
        }
    }

    // lineups
    if (!Array.isArray(item.lineups)) err('lineups must be an array');
    else {
        item.lineups.forEach((lu, i) => {
            if (!lu || typeof lu !== 'object') { err(`lineups[${i}] is not an object`); return; }
            if (typeof lu.teamName !== 'string') err(`lineups[${i}].teamName must be a string`);
            if (!isNumOrNull(lu.teamId === undefined ? null : lu.teamId)) err(`lineups[${i}].teamId must be a number or null`);
            if (!Array.isArray(lu.startXI)) err(`lineups[${i}].startXI must be an array`);
            else if (lu.startXI.length !== 11) warn(`lineups[${i}] (${lu.teamName}) has ${lu.startXI.length} startXI players, expected 11`);
            if (lu.substitutes !== undefined && !Array.isArray(lu.substitutes)) err(`lineups[${i}].substitutes must be an array`);
        });
        if (item.lineups.length > 0 && item.lineups.length !== 2) {
            warn(`${item.lineups.length} lineup block(s), expected 2 (one per team)`);
        }
    }

    // statistics
    if (!Array.isArray(item.statistics)) err('statistics must be an array');
    else {
        item.statistics.forEach((st, i) => {
            if (!st || typeof st !== 'object') { err(`statistics[${i}] is not an object`); return; }
            if (typeof st.teamName !== 'string') err(`statistics[${i}].teamName must be a string`);
            if (!Array.isArray(st.stats)) err(`statistics[${i}].stats must be an array`);
            else st.stats.forEach((s, j) => {
                if (!s || typeof s.type !== 'string') err(`statistics[${i}].stats[${j}].type must be a string`);
                if (s && s.value !== null && typeof s.value !== 'number' && typeof s.value !== 'string') {
                    err(`statistics[${i}].stats[${j}].value must be a number, string, or null`);
                }
            });
        });
        if (item.statistics.length > 0 && item.statistics.length !== 2) {
            warn(`${item.statistics.length} statistics block(s), expected 2 (one per team)`);
        }
    }

    return { errors, warnings };
}

function validateFile(payload, filePath) {
    const errors = [];
    const warnings = [];

    if (!payload || typeof payload !== 'object') {
        return { errors: [`${filePath}: root is not an object`], warnings };
    }
    if (!DATE_RE.test(String(payload.date_key || ''))) {
        errors.push(`${filePath}: date_key must be "YYYY-MM-DD"`);
    }
    if (!Array.isArray(payload.fixtures) || payload.fixtures.length === 0) {
        errors.push(`${filePath}: fixtures must be a non-empty array`);
    }

    if (errors.length > 0) return { errors, warnings };

    payload.fixtures.forEach((item, i) => {
        const r = validateFixture(item, i, payload.date_key);
        errors.push(...r.errors);
        warnings.push(...r.warnings);
    });

    return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

/** Resolve (or derive) the numeric fixture id for an item. */
function resolveFixtureId(item, dateKey) {
    if (isNum(item.fixture_id)) return item.fixture_id;
    return manualFixtureId(dateKey, item.home?.name, item.away?.name);
}

/** FixtureDetail item -> the exact FixtureDetail contract object (no extras). */
function toDetail(item, fixtureId) {
    return {
        id: fixtureId,
        league: {
            id: item.league.id ?? null,
            name: item.league.name ?? null,
            logo: item.league.logo ?? null,
            country: item.league.country ?? null,
            season: item.league.season ?? null,
            round: item.league.round ?? null,
        },
        date: item.date,
        venue: item.venue
            ? { name: item.venue.name ?? null, city: item.venue.city ?? null }
            : null,
        referee: item.referee ?? null,
        status: {
            short: item.status.short,
            long: item.status.long ?? null,
            elapsed: item.status.elapsed ?? null,
            state: item.status.state,
        },
        home: {
            id: item.home.id ?? null,
            name: item.home.name ?? null,
            logo: item.home.logo ?? null,
            winner: item.home.winner ?? null,
        },
        away: {
            id: item.away.id ?? null,
            name: item.away.name ?? null,
            logo: item.away.logo ?? null,
            winner: item.away.winner ?? null,
        },
        goals: { home: item.goals.home ?? null, away: item.goals.away ?? null },
        score: {
            halftime: { home: item.score.halftime.home ?? null, away: item.score.halftime.away ?? null },
            fulltime: { home: item.score.fulltime.home ?? null, away: item.score.fulltime.away ?? null },
            extratime: { home: item.score.extratime.home ?? null, away: item.score.extratime.away ?? null },
            penalty: { home: item.score.penalty.home ?? null, away: item.score.penalty.away ?? null },
        },
        events: (item.events || []).map(ev => ({
            minute: ev.minute,
            extra: ev.extra ?? null,
            teamId: ev.teamId ?? null,
            teamName: ev.teamName ?? '',
            player: ev.player ?? null,
            assist: ev.assist ?? null,
            type: ev.type,
            detail: ev.detail ?? '',
            comments: ev.comments ?? null,
        })),
        lineups: (item.lineups || []).map(lu => ({
            teamId: lu.teamId ?? null,
            teamName: lu.teamName ?? '',
            teamLogo: lu.teamLogo ?? null,
            formation: lu.formation ?? null,
            coach: lu.coach ?? null,
            startXI: (lu.startXI || []).map(p => ({
                id: p.id ?? null,
                name: p.name ?? '',
                number: p.number ?? null,
                pos: p.pos ?? null,
                grid: p.grid ?? null,
            })),
            substitutes: (lu.substitutes || []).map(p => ({
                id: p.id ?? null,
                name: p.name ?? '',
                number: p.number ?? null,
                pos: p.pos ?? null,
            })),
        })),
        statistics: (item.statistics || []).map(st => ({
            teamId: st.teamId ?? null,
            teamName: st.teamName ?? '',
            stats: (st.stats || []).map(s => ({
                type: String(s.type),
                value: s.value === undefined ? null : s.value,
            })),
        })),
    };
}

/** FixtureDetail -> normalizeLiveFixture-compatible summary for apf_fixtures. */
function toSummary(detail, sources) {
    return {
        id: `apf-${detail.id}`,
        providers: { apiFootball: String(detail.id), footballData: null },
        league: {
            id: detail.league.id != null ? String(detail.league.id) : null,
            name: detail.league.name,
            slug: null,
            logo: detail.league.logo,
            country: detail.league.country,
            season: detail.league.season,
            round: detail.league.round,
        },
        home: {
            id: detail.home.id != null ? String(detail.home.id) : null,
            name: detail.home.name,
            logo: detail.home.logo,
            score: detail.goals.home,
            winner: detail.home.winner,
        },
        away: {
            id: detail.away.id != null ? String(detail.away.id) : null,
            name: detail.away.name,
            logo: detail.away.logo,
            score: detail.goals.away,
            winner: detail.away.winner,
        },
        score: {
            home: detail.goals.home,
            away: detail.goals.away,
            halfTimeHome: detail.score.halftime.home,
            halfTimeAway: detail.score.halftime.away,
            extraTimeHome: detail.score.extratime.home,
            extraTimeAway: detail.score.extratime.away,
            penaltyHome: detail.score.penalty.home,
            penaltyAway: detail.score.penalty.away,
        },
        status: {
            state: detail.status.state,
            short: detail.status.short,
            long: detail.status.long,
            elapsed: detail.status.elapsed,
        },
        kickoff: detail.date,
        venue: { name: detail.venue?.name || '', city: detail.venue?.city || '' },
        events: [],
        sources: Array.isArray(sources) ? sources : undefined,
        fetchedAt: new Date().toISOString(),
        source: 'manual',
        stale: false,
    };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed() {
    const args = parseArgs(process.argv);
    const files = resolveFiles(args);

    console.log(`[SEED-MANUAL] ${files.length} file(s)${args.dryRun ? '  (DRY RUN — validation only, no writes)' : ''}`);

    // Parse + validate everything first; abort the whole run on any fatal error
    const parsed = [];
    let fatal = 0;

    for (const file of files) {
        let payload;
        try {
            payload = JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch (e) {
            console.error(`[SEED-MANUAL] ${path.basename(file)} — invalid JSON: ${e.message}`);
            fatal++;
            continue;
        }

        const { errors, warnings } = validateFile(payload, path.basename(file));
        warnings.forEach(w => console.warn(`[SEED-MANUAL] WARN  ${path.basename(file)} ${w}`));
        errors.forEach(e => console.error(`[SEED-MANUAL] ERROR ${path.basename(file)} ${e}`));

        if (errors.length > 0) {
            fatal += errors.length;
            continue;
        }

        console.log(`[SEED-MANUAL] ${path.basename(file)} — valid (${payload.fixtures.length} fixture(s), ${warnings.length} warning(s))`);
        parsed.push({ file, payload });
    }

    if (fatal > 0) {
        console.error(`[SEED-MANUAL] ABORTED — ${fatal} validation error(s). Nothing was written.`);
        process.exitCode = 1;
        return;
    }

    if (args.dryRun) {
        for (const { payload } of parsed) {
            for (const item of payload.fixtures) {
                const id = resolveFixtureId(item, payload.date_key);
                console.log(`[SEED-MANUAL] would seed id=${id}${isNum(item.fixture_id) ? ' (from file)' : ' (derived)'} ${item.home.name} ${item.goals.home}-${item.goals.away} ${item.away.name} events=${item.events.length} lineups=${item.lineups.length} stats=${item.statistics.length}`);
            }
        }
        console.log('[SEED-MANUAL] Dry run complete — no writes.');
        return;
    }

    try {
        await mongoose.connection.asPromise();
    } catch (err) {
        console.error('[SEED-MANUAL] MongoDB connection failed:', err.message);
        process.exitCode = 1;
        return;
    }

    let summaryWrites = 0;
    let detailWrites = 0;
    let skipped = 0;

    for (const { payload } of parsed) {
        for (const item of payload.fixtures) {
            const id = resolveFixtureId(item, payload.date_key);
            const detail = toDetail(item, id);
            const summary = toSummary(detail, item.sources);

            const sRes = await apfStore.saveFixtures([summary], { manual: true, sources: item.sources });
            const dRes = await apfStore.saveFixtureDetail(detail, { manual: true, sources: item.sources });

            const wroteSummary = sRes.upserted + sRes.modified;
            summaryWrites += wroteSummary;
            if (dRes) detailWrites++;
            if (wroteSummary === 0 && !dRes) skipped++;

            console.log(
                `[SEED-MANUAL] id=${id} ${detail.home.name} ${detail.goals.home}-${detail.goals.away} ${detail.away.name}`
                + ` events=${detail.events.length} lineups=${detail.lineups.length} stats=${detail.statistics.length}`
                + ` fixture[upserted=${sRes.upserted} modified=${sRes.modified}] detail=${dRes ? 'written' : 'unchanged'}`
            );
        }
    }

    // Invalidate the fixtures-by-date cache for every seeded date_key so the
    // next `/api/fixtures/date/:date` request re-reads Mongo (with the manual
    // rows in place) instead of serving a pre-seed empty/stale array for the
    // full TTL window (up to 7 days).
    const touchedDateKeys = new Set(parsed.map(p => p.payload.date_key));
    for (const dk of touchedDateKeys) {
        const key = `football:fixtures:date:${dk}`;
        try {
            await cache.del(key);
            console.log(`[SEED-MANUAL] invalidated cache ${key}`);
        } catch (err) {
            console.warn(`[SEED-MANUAL] cache invalidate failed for ${key}: ${err.message}`);
        }
    }

    console.log(`[SEED-MANUAL] Done — fixtures written=${summaryWrites} details written=${detailWrites} unchanged=${skipped}`);
}

seed()
    .then(() => mongoose.disconnect())
    .catch(async (err) => {
        console.error('[SEED-MANUAL] Failed:', err.message);
        await mongoose.disconnect().catch(() => {});
        process.exitCode = 1;
    });
