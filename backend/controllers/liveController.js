/**
 * Live Scores Express Controller (Phase 7 + 9)
 *
 * Mounts public endpoints for live scores served directly from Redis cache:
 *   GET /api/live          — all currently live matches
 *   GET /api/live/stream   — SSE stream for real-time push updates
 *   GET /api/live/status   — live worker & quota health status
 *   GET /api/live/:league  — live matches filtered by league slug
 *
 * All requests are served from Redis cache.
 * Frontend polling calls these endpoints — NEVER API-Football directly.
 */

const express = require('express');
const router = express.Router();
const liveScoreService = require('../services/liveScoreService');

const LEAGUE_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

function validateLeagueSlug(req, res, next) {
  const league = String(req.params.league || '').toLowerCase();
  if (!LEAGUE_PATTERN.test(league)) {
    return res.status(400).json({ error: 'Invalid league slug' });
  }
  req.params.league = league;
  next();
}

/**
 * @swagger
 * /api/live:
 *   get:
 *     summary: Get all currently live matches from Redis cache
 *     tags: [Live Scores]
 *     responses:
 *       200:
 *         description: Array of normalized live matches
 */
router.get('/', async (req, res) => {
  try {
    const result = await liveScoreService.getLive();

    res.set('Cache-Control', 'public, max-age=10');
    return res.json({
      meta: {
        count: result.fixtures?.length || 0,
        source: result.source,
        stale: result.stale || false,
        quotaExhausted: result.quotaExhausted || false,
        generatedAt: new Date().toISOString(),
      },
      matches: result.fixtures || [],
    });
  } catch (err) {
    console.error('Error serving /api/live:', err);
    return res.status(500).json({ error: 'Failed to fetch live matches' });
  }
});

/**
 * @swagger
 * /api/live/stream:
 *   get:
 *     summary: SSE stream for real-time live score push updates
 *     tags: [Live Scores]
 *     description: |
 *       Server-Sent Events endpoint. Connect from the browser with EventSource.
 *       Events: `live-update` (match data changes), `heartbeat` (keep-alive every 30s).
 *     responses:
 *       200:
 *         description: SSE event stream
 */
router.get('/stream', (req, res) => {
  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // for nginx
  });

  // Send initial connection confirmation
  res.write(`event: connected\ndata: ${JSON.stringify({
    message: 'SSE connected',
    serverTime: new Date().toISOString(),
  })}\n\n`);

  // Register client
  liveScoreService.addSSEClient(res);

  // Heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({
        time: new Date().toISOString(),
        clients: liveScoreService.getSSEClientCount(),
      })}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

/**
 * @swagger
 * /api/live/status:
 *   get:
 *     summary: Get live worker health and API-Football quota state
 *     tags: [Live Scores]
 */
router.get('/status', (req, res) => {
  const workerStatus = liveScoreService.getWorkerStatus();
  res.set('Cache-Control', 'no-store');
  return res.json({
    worker: workerStatus,
    serverTime: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /api/live/finished:
 *   get:
 *     summary: Get today's finished matches (FT/AET/PEN) from Redis cache
 *     tags: [Live Scores]
 *     responses:
 *       200:
 *         description: Array of normalized finished matches
 */
router.get('/finished', async (req, res) => {
  try {
    const result = await liveScoreService.getFinishedToday();

    res.set('Cache-Control', 'public, max-age=60');
    return res.json({
      meta: {
        count: result.fixtures?.length || 0,
        source: result.source,
        stale: result.stale || false,
        generatedAt: new Date().toISOString(),
      },
      matches: result.fixtures || [],
    });
  } catch (err) {
    console.error('Error serving /api/live/finished:', err);
    return res.status(500).json({ error: 'Failed to fetch finished matches' });
  }
});

/**
 * @swagger
 * /api/live/{league}:
 *   get:
 *     summary: Get live matches for a specific league
 *     tags: [Live Scores]
 *     parameters:
 *       - in: path
 *         name: league
 *         required: true
 *         schema: { type: string }
 */
router.get('/:league', validateLeagueSlug, async (req, res) => {
  try {
    const result = await liveScoreService.getLiveByLeague(req.params.league);

    res.set('Cache-Control', 'public, max-age=10');
    return res.json({
      meta: {
        league: req.params.league,
        count: result.fixtures?.length || 0,
        source: result.source,
        stale: result.stale || false,
        generatedAt: new Date().toISOString(),
      },
      matches: result.fixtures || [],
    });
  } catch (err) {
    console.error(`Error serving /api/live/${req.params.league}:`, err);
    return res.status(500).json({ error: 'Failed to fetch league live matches' });
  }
});

module.exports = app => app.use('/api/live', router);
