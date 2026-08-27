/**
 * Cache Service — Upstash Redis abstraction layer
 *
 * Provides a clean interface for caching operations so application code
 * never calls Redis directly. Falls back gracefully when Redis is
 * unavailable, ensuring the app continues to work without cache.
 *
 * Environment variables required:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

const { Redis } = require('@upstash/redis');

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

let redis = null;
let redisAvailable = false;

function getClient() {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('[REDIS] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set — cache disabled');
    redisAvailable = false;
    return null;
  }

  try {
    redis = new Redis({ url, token });
    redisAvailable = true;
    console.log('[REDIS] Client initialized');
  } catch (err) {
    console.error('[REDIS] Failed to initialize client:', err.message);
    redisAvailable = false;
    redis = null;
  }

  return redis;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(action, key, extra = '') {
  const ts = new Date().toISOString();
  console.log(`[REDIS] ${ts} ${action} key=${key} ${extra}`.trim());
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get a cached value (auto-parses JSON if stored as JSON).
 * @param {string} key
 * @returns {Promise<*|null>}
 */
async function get(key) {
  const client = getClient();
  if (!client) return null;

  try {
    const value = await client.get(key);
    if (value === null || value === undefined) {
      log('MISS', key);
      return null;
    }
    log('HIT', key);
    // @upstash/redis auto-deserializes JSON, so value is already parsed
    return value;
  } catch (err) {
    console.error(`[REDIS] GET error key=${key}:`, err.message);
    return null;
  }
}

/**
 * Set a cached value with optional TTL.
 * Objects/arrays are automatically JSON-serialized by @upstash/redis.
 * @param {string}  key
 * @param {*}       value
 * @param {number}  [ttlSeconds]  — time-to-live in seconds
 * @returns {Promise<boolean>}
 */
async function set(key, value, ttlSeconds) {
  const client = getClient();
  if (!client) return false;

  try {
    if (ttlSeconds && ttlSeconds > 0) {
      await client.set(key, value, { ex: ttlSeconds });
    } else {
      await client.set(key, value);
    }
    log('SET', key, ttlSeconds ? `ttl=${ttlSeconds}s` : '');
    return true;
  } catch (err) {
    console.error(`[REDIS] SET error key=${key}:`, err.message);
    return false;
  }
}

/**
 * Delete one or more keys.
 * @param  {...string} keys
 * @returns {Promise<number>}  — number of keys removed
 */
async function del(...keys) {
  const client = getClient();
  if (!client) return 0;

  try {
    const removed = await client.del(...keys);
    keys.forEach(k => log('DEL', k));
    return removed;
  } catch (err) {
    console.error(`[REDIS] DEL error:`, err.message);
    return 0;
  }
}

/**
 * Check if a key exists.
 * @param {string} key
 * @returns {Promise<boolean>}
 */
async function exists(key) {
  const client = getClient();
  if (!client) return false;

  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (err) {
    console.error(`[REDIS] EXISTS error key=${key}:`, err.message);
    return false;
  }
}

/**
 * Get remaining TTL for a key (in seconds).
 * Returns -1 if key has no expiry, -2 if key does not exist, null on error.
 * @param {string} key
 * @returns {Promise<number|null>}
 */
async function ttl(key) {
  const client = getClient();
  if (!client) return null;

  try {
    return await client.ttl(key);
  } catch (err) {
    console.error(`[REDIS] TTL error key=${key}:`, err.message);
    return null;
  }
}

/**
 * Set a new TTL on an existing key.
 * @param {string} key
 * @param {number} seconds
 * @returns {Promise<boolean>}
 */
async function expire(key, seconds) {
  const client = getClient();
  if (!client) return false;

  try {
    const result = await client.expire(key, seconds);
    return result === 1;
  } catch (err) {
    console.error(`[REDIS] EXPIRE error key=${key}:`, err.message);
    return false;
  }
}

/**
 * Get-or-set: returns cached value if it exists, otherwise calls the
 * factory function, caches the result, and returns it.
 * @param {string}   key
 * @param {Function} factory      — async function that produces the value
 * @param {number}   [ttlSeconds] — TTL for the cached value
 * @returns {Promise<*>}
 */
async function getOrSet(key, factory, ttlSeconds) {
  const cached = await get(key);
  if (cached !== null) return cached;

  const value = await factory();
  if (value !== null && value !== undefined) {
    await set(key, value, ttlSeconds);
  }
  return value;
}

/**
 * Check if the Redis connection is healthy.
 * @returns {Promise<boolean>}
 */
async function ping() {
  const client = getClient();
  if (!client) return false;

  try {
    const result = await client.ping();
    return result === 'PONG';
  } catch (err) {
    console.error('[REDIS] PING failed:', err.message);
    return false;
  }
}

/**
 * Whether Redis is configured and available.
 * @returns {boolean}
 */
function isAvailable() {
  getClient(); // ensure init attempted
  return redisAvailable;
}

// ---------------------------------------------------------------------------
// TTL presets (seconds) — centralised so they stay consistent
// ---------------------------------------------------------------------------

const TTL = {
  LIVE:       30,       // live match data — very short
  FIXTURES:   300,      // 5 minutes
  STANDINGS:  600,      // 10 minutes
  SCOREBOARD: 180,      // 3 minutes
  LEAGUE_META: 86400,   // 24 hours — static data
  TEAM_META:  86400,    // 24 hours
  MATCH_DETAIL: 120,    // 2 minutes for individual match
};

// ---------------------------------------------------------------------------
// Key builders — namespaced keys for organisation
// ---------------------------------------------------------------------------

const KEYS = {
  live:           ()                => 'football:live',
  liveByLeague:   (league)          => `football:live:${league}`,
  matchesToday:   ()                => 'football:matches:today',
  matchesTomorrow:()                => 'football:matches:tomorrow',
  matchesByDate:  (date)            => `football:matches:${date}`,
  fixture:        (id)              => `football:fixture:${id}`,
  standings:      (league, season)  => `football:standings:${league}:${season}`,
  scoreboard:     (league, date)    => `football:scoreboard:${league}:${date}`,
  leagueMeta:     (league)          => `football:league:${league}`,
  teamMeta:       (teamId)          => `football:team:${teamId}`,
  clubs:          (league)          => `football:clubs:${league}`,
  matchSummary:   (league, eventId) => `football:summary:${league}:${eventId}`,
  apiQuota:       ()                => 'football:api-football:quota',
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  get,
  set,
  del,
  exists,
  ttl,
  expire,
  getOrSet,
  ping,
  isAvailable,
  TTL,
  KEYS,
};
