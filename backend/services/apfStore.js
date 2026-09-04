/**
 * API-Football durable store (MongoDB)
 *
 * Persists API-Football data so past fixtures survive Redis TTL expiry.
 * Collections: `apf_fixtures`, `apf_fixture_details`.
 *
 * DESIGN RULE: every operation here is best-effort and NEVER throws.
 * If Mongo is down / not connected, calls become no-ops (or return null/[])
 * so the HTTP request path degrades to Redis + API only.
 */

const mongoose = require('../database');
const ApfFixture = require('../models/apfFixture');
const ApfFixtureDetail = require('../models/apfFixtureDetail');
const { isManualFixtureId } = require('./manualFixtureId');

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

const FINAL_STATUSES = new Set(['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO']);

function isConnected() {
    return mongoose.connection.readyState === 1;
}

function toNum(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

/** WIB (UTC+7) calendar date key for a kickoff timestamp. */
function dateKeyFor(kickoff) {
    const ms = kickoff ? new Date(kickoff).getTime() : Date.now();
    if (!Number.isFinite(ms)) return new Date(Date.now() + WIB_OFFSET_MS).toISOString().slice(0, 10);
    return new Date(ms + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * normalizeLiveFixture() output -> apf_fixtures document fields.
 */
function toDoc(f) {
    const fixtureId = toNum(f.providers?.apiFootball ?? String(f.id || '').replace(/^apf-/, ''));
    if (!fixtureId) return null;

    return {
        fixture_id: fixtureId,
        date: f.kickoff ? new Date(f.kickoff) : new Date(),
        date_key: dateKeyFor(f.kickoff),
        league: {
            id: toNum(f.league?.id),
            name: f.league?.name || '',
            slug: f.league?.slug || '',
            country: f.league?.country || '',
            logo: f.league?.logo || '',
            season: toNum(f.league?.season),
            round: f.league?.round || '',
        },
        home: {
            id: toNum(f.home?.id),
            name: f.home?.name || '',
            logo: f.home?.logo || '',
            winner: typeof f.home?.winner === 'boolean' ? f.home.winner : null,
        },
        away: {
            id: toNum(f.away?.id),
            name: f.away?.name || '',
            logo: f.away?.logo || '',
            winner: typeof f.away?.winner === 'boolean' ? f.away.winner : null,
        },
        goals: { home: toNum(f.score?.home), away: toNum(f.score?.away) },
        score: {
            halftime: { home: toNum(f.score?.halfTimeHome), away: toNum(f.score?.halfTimeAway) },
            fulltime: { home: toNum(f.score?.home), away: toNum(f.score?.away) },
            extratime: { home: toNum(f.score?.extraTimeHome), away: toNum(f.score?.extraTimeAway) },
            penalty: { home: toNum(f.score?.penaltyHome), away: toNum(f.score?.penaltyAway) },
        },
        status: {
            short: f.status?.short || '',
            long: f.status?.long || '',
            elapsed: toNum(f.status?.elapsed),
            state: f.status?.state || 'unknown',
        },
        venue: { name: f.venue?.name || '', city: f.venue?.city || '' },
        providers: {
            apiFootball: String(fixtureId),
            footballData: f.providers?.footballData ?? null,
        },
        last_synced_at: new Date(),
    };
}

/**
 * apf_fixtures document -> normalizeLiveFixture()-compatible object,
 * so callers can treat DB reads and API reads identically.
 *
 * Built field-by-field on purpose: internal provenance fields (`manual`,
 * `manual_source`, `raw`) are never copied into API responses.
 */
function fromDoc(d) {
    return {
        id: `apf-${d.fixture_id}`,
        providers: {
            apiFootball: String(d.fixture_id),
            footballData: d.providers?.footballData ?? null,
        },
        league: {
            id: d.league?.id != null ? String(d.league.id) : null,
            name: d.league?.name,
            slug: d.league?.slug || null,
            logo: d.league?.logo,
            country: d.league?.country,
            season: d.league?.season,
            round: d.league?.round,
        },
        home: {
            id: d.home?.id != null ? String(d.home.id) : null,
            name: d.home?.name,
            logo: d.home?.logo,
            score: d.goals?.home ?? null,
            winner: d.home?.winner ?? null,
        },
        away: {
            id: d.away?.id != null ? String(d.away.id) : null,
            name: d.away?.name,
            logo: d.away?.logo,
            score: d.goals?.away ?? null,
            winner: d.away?.winner ?? null,
        },
        score: {
            home: d.goals?.home ?? null,
            away: d.goals?.away ?? null,
            halfTimeHome: d.score?.halftime?.home ?? null,
            halfTimeAway: d.score?.halftime?.away ?? null,
            extraTimeHome: d.score?.extratime?.home ?? null,
            extraTimeAway: d.score?.extratime?.away ?? null,
            penaltyHome: d.score?.penalty?.home ?? null,
            penaltyAway: d.score?.penalty?.away ?? null,
        },
        status: {
            state: d.status?.state || 'unknown',
            short: d.status?.short,
            long: d.status?.long,
            elapsed: d.status?.elapsed ?? null,
        },
        kickoff: d.date ? new Date(d.date).toISOString() : null,
        venue: { name: d.venue?.name, city: d.venue?.city },
        events: [],
        fetchedAt: d.last_synced_at ? new Date(d.last_synced_at).toISOString() : null,
        source: 'mongo',
        stale: false,
    };
}

/**
 * Upsert fixtures (normalizeLiveFixture shape) into `apf_fixtures`.
 *
 * Overwrite guards:
 *   1. a document already stored as final (`status.state === 'post'`) is never
 *      downgraded by non-final incoming data
 *   2. a manually seeded document (`manual: true`) is never overwritten by API
 *      data unless that API data is final AND carries a real API-Football
 *      fixture id (outside the reserved manual id range)
 *
 * @param {Array} fixtures
 * @param {{manual?: boolean, sources?: string[]}} [options]
 *        manual: mark the written documents as manually seeded
 * @returns {Promise<{upserted:number, modified:number, skipped:number}>}
 */
async function saveFixtures(fixtures, options = {}) {
    const result = { upserted: 0, modified: 0, skipped: 0 };
    if (!Array.isArray(fixtures) || fixtures.length === 0) return result;
    if (!isConnected()) {
        console.warn('[APF-STORE] Mongo not connected — skipping saveFixtures');
        return result;
    }

    const asManual = options.manual === true;

    try {
        const ops = [];
        for (const f of fixtures) {
            const doc = toDoc(f);
            if (!doc) { result.skipped++; continue; }

            if (asManual) {
                doc.manual = true;
                if (Array.isArray(options.sources) && options.sources.length > 0) {
                    doc.manual_source = options.sources;
                }
                if (Array.isArray(f.sources) && f.sources.length > 0) {
                    doc.manual_source = f.sources;
                }
            }

            const incomingFinal = doc.status.state === 'post';
            const filter = { fixture_id: doc.fixture_id };

            if (!incomingFinal) {
                // non-final incoming: only write when stored doc isn't already final
                filter['status.state'] = { $ne: 'post' };
            }
            if (!asManual && !(incomingFinal && !isManualFixtureId(doc.fixture_id))) {
                // API data may only replace a manual document when it is final
                // and uses a genuine API-Football id
                filter.manual = { $ne: true };
            }

            // Only upsert when the filter is a plain id lookup; otherwise a
            // non-matching guard would try to insert and hit the unique index.
            const upsert = Object.keys(filter).length === 1;

            ops.push({
                updateOne: {
                    filter,
                    update: { $set: doc, $setOnInsert: { created_at: new Date() } },
                    upsert,
                },
            });
        }

        if (ops.length === 0) return result;

        const res = await ApfFixture.bulkWrite(ops, { ordered: false });
        result.upserted = res.upsertedCount || 0;
        result.modified = res.modifiedCount || 0;
        return result;
    } catch (err) {
        // Duplicate-key races are expected under concurrency — not fatal
        console.error('[APF-STORE] saveFixtures failed:', err.message);
        return result;
    }
}

/**
 * Read all archived fixtures for a WIB date key.
 * @param {string} dateKey  YYYY-MM-DD
 * @returns {Promise<Array>}  normalizeLiveFixture-compatible objects ([] on failure)
 */
async function getFixturesByDateKey(dateKey) {
    if (!isConnected()) return [];
    try {
        const docs = await ApfFixture.find({ date_key: dateKey }).lean();
        return docs.map(fromDoc);
    } catch (err) {
        console.error('[APF-STORE] getFixturesByDateKey failed:', err.message);
        return [];
    }
}

/**
 * Upsert a normalized FixtureDetail.
 *
 * Guards:
 *   1. skips when a final version is already stored and the incoming one is not
 *   2. a manually seeded detail is never overwritten by API data unless that
 *      data is final AND uses a genuine API-Football id
 *
 * @param {Object} detail  FixtureDetail contract object
 * @param {{manual?: boolean, sources?: string[]}} [options]
 * @returns {Promise<boolean>} true when written
 */
async function saveFixtureDetail(detail, options = {}) {
    if (!detail || !detail.id) return false;
    if (!isConnected()) {
        console.warn('[APF-STORE] Mongo not connected — skipping saveFixtureDetail');
        return false;
    }

    try {
        const fixtureId = toNum(detail.id);
        if (!fixtureId) return false;

        const asManual = options.manual === true;
        const short = detail.status?.short || '';
        const isFinal = FINAL_STATUSES.has(short);

        const filter = { fixture_id: fixtureId };
        if (!isFinal) filter.is_final = { $ne: true };
        if (!asManual && !(isFinal && !isManualFixtureId(fixtureId))) {
            filter.manual = { $ne: true };
        }

        const set = {
            fixture_id: fixtureId,
            detail,
            status_short: short,
            is_final: isFinal,
            last_synced_at: new Date(),
        };
        if (asManual) {
            set.manual = true;
            if (Array.isArray(options.sources) && options.sources.length > 0) {
                set.manual_source = options.sources;
            }
        }

        // Only upsert on a plain id lookup, otherwise a blocked guard would
        // attempt an insert and hit the unique index.
        const upsert = Object.keys(filter).length === 1;

        const res = await ApfFixtureDetail.updateOne(filter, { $set: set }, { upsert });

        return (res.upsertedCount || 0) > 0 || (res.modifiedCount || 0) > 0;
    } catch (err) {
        console.error('[APF-STORE] saveFixtureDetail failed:', err.message);
        return false;
    }
}

/**
 * Read an archived fixture detail.
 *
 * Only `detail` (the FixtureDetail contract object) is returned to callers —
 * internal provenance fields stay inside Mongo.
 *
 * @param {number|string} fixtureId
 * @returns {Promise<{detail:Object, isFinal:boolean, isManual:boolean}|null>}
 */
async function getFixtureDetail(fixtureId) {
    if (!isConnected()) return null;
    try {
        const id = toNum(String(fixtureId).replace(/^apf-/, ''));
        if (!id) return null;

        const doc = await ApfFixtureDetail.findOne({ fixture_id: id }).lean();
        if (!doc || !doc.detail) return null;
        return { detail: doc.detail, isFinal: !!doc.is_final, isManual: !!doc.manual };
    } catch (err) {
        console.error('[APF-STORE] getFixtureDetail failed:', err.message);
        return null;
    }
}

/**
 * Count archived fixtures for a date key (used by the backfill script
 * for idempotency).
 * @param {string} dateKey
 * @returns {Promise<number>} -1 when Mongo is unavailable
 */
async function countFixturesByDateKey(dateKey) {
    if (!isConnected()) return -1;
    try {
        return await ApfFixture.countDocuments({ date_key: dateKey });
    } catch (err) {
        console.error('[APF-STORE] countFixturesByDateKey failed:', err.message);
        return -1;
    }
}

module.exports = {
    saveFixtures,
    getFixturesByDateKey,
    saveFixtureDetail,
    getFixtureDetail,
    countFixturesByDateKey,
    isConnected,
    dateKeyFor,
    FINAL_STATUSES,
};
