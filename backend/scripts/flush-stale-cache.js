/**
 * Flush Stale Redis Cache
 *
 * Removes stale or empty fixture/live keys from Upstash Redis so the app
 * can re-fetch fresh data from API-Football/MongoDB without waiting 7 days.
 *
 * Usage: node scripts/flush-stale-cache.js
 */

require('../config/env').loadEnvConfig();
const cache = require('../services/cacheService');
const { Redis } = require('@upstash/redis');

async function flushStaleCache() {
    console.log('🧹 Connecting to Redis...');
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        console.error('❌ UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured');
        process.exit(1);
    }

    const client = new Redis({ url, token });
    const allKeys = await client.keys('football:*');
    console.log(`Found ${allKeys.length} keys in Redis`);

    const keysToDelete = [];

    for (const key of allKeys) {
        // Target fixtures:date keys, finished keys, or empty arrays
        if (key.startsWith('football:fixtures:date:') || key.startsWith('football:finished:')) {
            const val = await client.get(key);
            // If empty array or past date locked
            if (!val || (Array.isArray(val) && val.length === 0)) {
                keysToDelete.push(key);
                console.log(`  Targeting empty key: ${key}`);
            } else if (key.includes('2026-09-06') || key.includes('2026-09-07') || key.includes('20260906') || key.includes('20260907')) {
                keysToDelete.push(key);
                console.log(`  Targeting recent date key: ${key}`);
            }
        }
    }

    if (keysToDelete.length === 0) {
        console.log('✅ No stale or empty keys need to be deleted.');
        process.exit(0);
    }

    console.log(`🗑️ Deleting ${keysToDelete.length} keys...`);
    const removed = await client.del(...keysToDelete);
    console.log(`✅ Successfully deleted ${removed} keys from Redis.`);
    process.exit(0);
}

flushStaleCache().catch(err => {
    console.error('❌ Failed to flush stale cache:', err.message);
    process.exit(1);
});
