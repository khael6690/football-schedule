/**
 * Fixtures-by-date Controller
 *
 *   GET /api/fixtures/date/:date   — all priority-league fixtures for a date
 *                                    (YYYY-MM-DD) from API-Football, via Redis.
 *
 * Response: { date, count, fixtures, source: 'cache'|'db'|'api'|'stale' }
 *   cache — Redis hit
 *   db    — Mongo archive (apf_fixtures), no API quota spent
 *   api   — fresh API-Football call
 *   stale — quota guard / fetch failure; fixtures may be empty or archive-only
 */

const express = require('express');
const router = express.Router();
const fixturesByDateService = require('../services/fixturesByDateService');

function validateDate(req, res, next) {
  const date = String(req.params.date || '');
  if (!fixturesByDateService.DATE_RE.test(date)) {
    return res.status(400).json({ error: 'Invalid date, expected YYYY-MM-DD' });
  }
  next();
}

/**
 * @swagger
 * /api/fixtures/date/{date}:
 *   get:
 *     summary: Get API-Football fixtures for a date (priority leagues only)
 *     tags: [Live Scores]
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema: { type: string, example: "2026-09-03" }
 *     responses:
 *       200:
 *         description: Normalized fixtures (same shape as /api/live). `source` is one of cache|db|api|stale.
 *       400:
 *         description: Invalid date format
 */
router.get('/date/:date', validateDate, async (req, res) => {
  try {
    const result = await fixturesByDateService.getFixturesByDate(req.params.date);
    if (!result) {
      return res.status(400).json({ error: 'Invalid date, expected YYYY-MM-DD' });
    }

    if (result.stale) {
      res.set('Cache-Control', 'no-store');
    } else {
      res.set('Cache-Control', `public, max-age=${result.ttl}`);
    }

    return res.json({
      date: result.date,
      count: result.fixtures.length,
      fixtures: result.fixtures,
      source: result.source,
    });
  } catch (err) {
    console.error(`Error serving /api/fixtures/date/${req.params.date}:`, err);
    return res.status(500).json({ error: 'Failed to fetch fixtures for date' });
  }
});

module.exports = app => app.use('/api/fixtures', router);
