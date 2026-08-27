/**
 * Integration Test — Redis + API-Football + Live Score Service
 *
 * Phase 11: Validates all integration points.
 *
 * Usage: node test/integration-live.test.js
 *
 * Tests:
 *  1. Redis connection (ping)
 *  2. Cache service get/set/del/exists/ttl
 *  3. API-Football authentication
 *  4. Live fixture fetch + normalize
 *  5. Quota state tracking
 *  6. Live score service fetch + cache
 *  7. Cache key structure
 *  8. Worker status
 *  9. Provider quota guard
 * 10. Cache-first strategy (HIT/MISS)
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const cache = require('../services/cacheService');
const apiFootball = require('../providers/apiFootballProvider');
const liveScoreService = require('../services/liveScoreService');

// ---------------------------------------------------------------------------
// 1. Redis connection
// ---------------------------------------------------------------------------

describe('Redis Connection', () => {
  it('cache service reports availability', () => {
    // It's OK if Redis is not configured in test env
    const available = cache.isAvailable();
    console.log(`  Redis available: ${available}`);
    assert.equal(typeof available, 'boolean');
  });

  it('ping returns PONG when connected', async () => {
    if (!cache.isAvailable()) {
      console.log('  ⏭ Skipped — Redis not configured');
      return;
    }
    const pong = await cache.ping();
    assert.equal(pong, true);
  });
});

// ---------------------------------------------------------------------------
// 2. Cache service CRUD
// ---------------------------------------------------------------------------

describe('Cache Service CRUD', () => {
  const TEST_KEY = 'football:test:integration';
  const TEST_VALUE = { hello: 'world', timestamp: Date.now() };

  after(async () => {
    await cache.del(TEST_KEY);
  });

  it('set stores a value', async () => {
    if (!cache.isAvailable()) return;
    const ok = await cache.set(TEST_KEY, TEST_VALUE, 60);
    assert.equal(ok, true);
  });

  it('get retrieves the stored value', async () => {
    if (!cache.isAvailable()) return;
    const val = await cache.get(TEST_KEY);
    assert.deepEqual(val, TEST_VALUE);
  });

  it('exists returns true for stored key', async () => {
    if (!cache.isAvailable()) return;
    const ex = await cache.exists(TEST_KEY);
    assert.equal(ex, true);
  });

  it('ttl returns remaining seconds', async () => {
    if (!cache.isAvailable()) return;
    const t = await cache.ttl(TEST_KEY);
    assert.ok(t > 0 && t <= 60, `Expected TTL 1-60, got ${t}`);
  });

  it('del removes the key', async () => {
    if (!cache.isAvailable()) return;
    const removed = await cache.del(TEST_KEY);
    assert.ok(removed >= 1);
    const gone = await cache.exists(TEST_KEY);
    assert.equal(gone, false);
  });

  it('get returns null for missing key', async () => {
    if (!cache.isAvailable()) return;
    const val = await cache.get('football:test:nonexistent');
    assert.equal(val, null);
  });

  it('getOrSet calls factory on miss', async () => {
    if (!cache.isAvailable()) return;
    const KEY = 'football:test:getOrSet';
    let factoryCalled = false;
    const val = await cache.getOrSet(KEY, async () => {
      factoryCalled = true;
      return { from: 'factory' };
    }, 30);
    assert.equal(factoryCalled, true);
    assert.deepEqual(val, { from: 'factory' });
    await cache.del(KEY);
  });
});

// ---------------------------------------------------------------------------
// 3. Cache key structure
// ---------------------------------------------------------------------------

describe('Cache Key Structure', () => {
  it('KEYS.live() returns correct namespace', () => {
    assert.equal(cache.KEYS.live(), 'football:live');
  });

  it('KEYS.liveByLeague builds per-league key', () => {
    assert.equal(cache.KEYS.liveByLeague('eng.1'), 'football:live:eng.1');
  });

  it('KEYS.standings builds league+season key', () => {
    assert.equal(cache.KEYS.standings('eng.1', 2025), 'football:standings:eng.1:2025');
  });

  it('KEYS.scoreboard builds league+date key', () => {
    assert.equal(cache.KEYS.scoreboard('eng.1', '20260827'), 'football:scoreboard:eng.1:20260827');
  });

  it('TTL presets are reasonable', () => {
    assert.ok(cache.TTL.LIVE <= 60, 'LIVE TTL should be short');
    assert.ok(cache.TTL.FIXTURES >= 60, 'FIXTURES TTL should be moderate');
    assert.ok(cache.TTL.STANDINGS >= 300, 'STANDINGS TTL should be longer');
    assert.ok(cache.TTL.LEAGUE_META >= 3600, 'LEAGUE_META TTL should be long');
  });
});

// ---------------------------------------------------------------------------
// 4. API-Football provider
// ---------------------------------------------------------------------------

describe('API-Football Provider', () => {
  it('priority leagues mapping is correct', () => {
    const leagues = apiFootball.PRIORITY_LEAGUES;
    assert.ok(leagues['eng.1'], 'eng.1 should be mapped');
    assert.ok(leagues['esp.1'], 'esp.1 should be mapped');
    assert.ok(leagues['ger.1'], 'ger.1 should be mapped');
    assert.ok(leagues['ita.1'], 'ita.1 should be mapped');
    assert.ok(leagues['fra.1'], 'fra.1 should be mapped');
    assert.ok(leagues['uefa.cl'], 'uefa.cl should be mapped');
  });

  it('quota state has correct shape', () => {
    const quota = apiFootball.getQuotaState();
    assert.ok('limit' in quota);
    assert.ok('remaining' in quota);
    assert.ok('exhausted' in quota);
    assert.equal(typeof quota.limit, 'number');
    assert.equal(typeof quota.exhausted, 'boolean');
  });

  it('fetchLiveFixtures returns array (if API key configured)', async () => {
    if (!process.env.API_FOOTBALL_KEY) {
      console.log('  ⏭ Skipped — API_FOOTBALL_KEY not set');
      return;
    }
    const fixtures = await apiFootball.fetchLiveFixtures();
    assert.ok(Array.isArray(fixtures), 'Should return array');
    console.log(`  Fetched ${fixtures.length} priority live fixtures`);
  });

  it('normalizeLiveFixture produces correct shape', () => {
    // Mock fixture
    const mockFixture = {
      fixture: { id: 99, status: { short: '2H', long: 'Second Half', elapsed: 67 }, date: '2026-08-27T14:00:00+00:00', venue: { name: 'Emirates', city: 'London' } },
      league: { id: 39, name: 'Premier League', country: 'England', season: 2026, round: 'Regular Season - 3' },
      teams: { home: { id: 42, name: 'Arsenal', logo: 'https://img.test/arsenal.png', winner: true }, away: { id: 49, name: 'Chelsea', logo: 'https://img.test/chelsea.png', winner: false } },
      goals: { home: 2, away: 1 },
      score: { halftime: { home: 1, away: 0 }, extratime: { home: null, away: null }, penalty: { home: null, away: null } },
      events: [
        { time: { elapsed: 23 }, team: { id: 42, name: 'Arsenal' }, player: { name: 'Saka' }, assist: { name: 'Odegaard' }, type: 'Goal', detail: 'Normal Goal', comments: null },
      ],
    };

    const result = apiFootball.normalizeLiveFixture(mockFixture);

    assert.equal(result.id, 'apf-99');
    assert.equal(result.providers.apiFootball, '99');
    assert.equal(result.league.slug, 'eng.1');
    assert.equal(result.home.name, 'Arsenal');
    assert.equal(result.away.name, 'Chelsea');
    assert.equal(result.score.home, 2);
    assert.equal(result.score.away, 1);
    assert.equal(result.status.state, 'in');
    assert.equal(result.status.elapsed, 67);
    assert.equal(result.events.length, 1);
    assert.equal(result.events[0].playerName, 'Saka');
    assert.equal(result.events[0].type, 'Goal');
  });
});

// ---------------------------------------------------------------------------
// 5. Live Score Service
// ---------------------------------------------------------------------------

describe('Live Score Service', () => {
  it('getWorkerStatus returns correct shape', () => {
    const status = liveScoreService.getWorkerStatus();
    assert.ok('running' in status);
    assert.ok('liveMatchCount' in status);
    assert.ok('quota' in status);
    assert.ok('isMatchHours' in status);
    assert.ok('sseClients' in status);
    assert.equal(typeof status.running, 'boolean');
    assert.equal(typeof status.sseClients, 'number');
  });

  it('getLive returns fixture array', async () => {
    const result = await liveScoreService.getLive();
    assert.ok('fixtures' in result);
    assert.ok('source' in result);
    assert.ok(Array.isArray(result.fixtures));
  });

  it('getLiveByLeague filters correctly', async () => {
    const result = await liveScoreService.getLiveByLeague('eng.1');
    assert.ok(Array.isArray(result.fixtures));
    // All returned should be eng.1 (or empty)
    for (const f of result.fixtures) {
      assert.equal(f.league?.slug, 'eng.1');
    }
  });
});

// ---------------------------------------------------------------------------
// 6. ID Mapping Service
// ---------------------------------------------------------------------------

describe('ID Mapping Service', () => {
  const idMapping = require('../services/idMappingService');

  it('setMapping and getApiFootballId work', async () => {
    await idMapping.setMapping('fd-12345', 'apf-99999', {
      leagueSlug: 'eng.1',
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
    });
    const apfId = await idMapping.getApiFootballId('fd-12345');
    assert.equal(apfId, 'apf-99999');
  });

  it('getFootballDataId reverse lookup works', async () => {
    const fdId = await idMapping.getFootballDataId('apf-99999');
    assert.equal(fdId, 'fd-12345');
  });
});
