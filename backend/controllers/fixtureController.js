/**
 * Fixture Detail Controller
 *
 *   GET /api/fixture/:apfId   — full fixture detail (meta, score, events,
 *                               lineups, statistics) from API-Football,
 *                               served via Redis cache.
 *
 * :apfId is numeric; an `apf-` prefix is accepted and stripped.
 */

const express = require('express');
const router = express.Router();
const fixtureDetailService = require('../services/fixtureDetailService');

function validateApfId(req, res, next) {
  const raw = String(req.params.apfId || '').replace(/^apf-/, '');
  if (!/^\d+$/.test(raw)) {
    return res.status(400).json({ error: 'Invalid fixture id' });
  }
  req.params.apfId = raw;
  next();
}

/**
 * @swagger
 * /api/fixture/{apfId}:
 *   get:
 *     summary: Get full fixture detail (events, lineups, statistics) by API-Football id
 *     tags: [Live Scores]
 *     parameters:
 *       - in: path
 *         name: apfId
 *         required: true
 *         schema: { type: string }
 *         description: API-Football fixture id (numeric, optional `apf-` prefix)
 *     responses:
 *       200:
 *         description: Normalized FixtureDetail
 *       404:
 *         description: Fixture not found
 */
router.get('/:apfId', validateApfId, async (req, res) => {
  try {
    const result = await fixtureDetailService.getFixtureDetail(req.params.apfId);
    if (!result || !result.detail) {
      res.set('Cache-Control', 'no-store');
      return res.status(404).json({ error: 'Fixture not found' });
    }

    res.set('Cache-Control', `public, max-age=${result.ttl}`);
    return res.json({
      meta: {
        source: result.source,
        ttl: result.ttl,
        generatedAt: new Date().toISOString(),
      },
      fixture: result.detail,
    });
  } catch (err) {
    console.error(`Error serving /api/fixture/${req.params.apfId}:`, err);
    return res.status(500).json({ error: 'Failed to fetch fixture detail' });
  }
});

module.exports = app => app.use('/api/fixture', router);
