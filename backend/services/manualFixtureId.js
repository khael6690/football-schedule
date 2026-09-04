/**
 * Deterministic id allocation for manually seeded fixtures.
 *
 * API-Football fixture ids are small (currently ~1.0-1.6 million). Manual
 * fixtures are mapped into a reserved high range so the two id spaces can
 * never collide inside `apf_fixtures.fixture_id` (Number, unique).
 *
 *   MANUAL_ID_MIN = 900000000
 *   MANUAL_ID_MAX = 999999999
 *
 * The id is a pure function of (date_key, home name, away name), so re-running
 * the seed script upserts the same document instead of creating duplicates.
 */

const crypto = require('crypto');

const MANUAL_ID_MIN = 900000000;
const MANUAL_ID_MAX = 999999999;
const MANUAL_RANGE = MANUAL_ID_MAX - MANUAL_ID_MIN + 1; // 100000000

/** Normalize a team name so trivial formatting differences map to one id. */
function normName(name) {
    return String(name || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/**
 * Deterministic manual fixture id.
 * @param {string} dateKey   YYYY-MM-DD (WIB)
 * @param {string} homeName
 * @param {string} awayName
 * @returns {number} id in [MANUAL_ID_MIN, MANUAL_ID_MAX]
 */
function manualFixtureId(dateKey, homeName, awayName) {
    const seed = `${String(dateKey || '').trim()}|${normName(homeName)}|${normName(awayName)}`;
    const digest = crypto.createHash('sha1').update(seed).digest();
    // Take 6 bytes (48 bits) — far below Number.MAX_SAFE_INTEGER
    const n = digest.readUIntBE(0, 6);
    return MANUAL_ID_MIN + (n % MANUAL_RANGE);
}

/**
 * True when an id belongs to the reserved manual range.
 * @param {number|string} id
 */
function isManualFixtureId(id) {
    const n = Number(String(id).replace(/^apf-/, ''));
    return Number.isFinite(n) && n >= MANUAL_ID_MIN && n <= MANUAL_ID_MAX;
}

module.exports = {
    manualFixtureId,
    isManualFixtureId,
    normName,
    MANUAL_ID_MIN,
    MANUAL_ID_MAX,
};
