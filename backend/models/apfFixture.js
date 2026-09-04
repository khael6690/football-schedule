/**
 * API-Football fixture archive (collection: apf_fixtures)
 *
 * Durable store for fixtures fetched from API-Football, so past dates stay
 * available after Redis TTLs expire. One document per API-Football fixture id.
 *
 * Shape mirrors apiFootballProvider.normalizeLiveFixture() output plus query
 * fields (`date_key`, `last_synced_at`).
 *
 * NOTE: completely separate id space from `soccer_matches` (football-data.org).
 * Nothing here touches that collection.
 */

const mongoose = require('../database');

const ApfTeamSchema = new mongoose.Schema({
    id: { type: Number },
    name: { type: String, default: '' },
    logo: { type: String, default: '' },
    winner: { type: Boolean, default: null }
}, { _id: false });

const ApfPairSchema = new mongoose.Schema({
    home: { type: Number, default: null },
    away: { type: Number, default: null }
}, { _id: false });

const ApfFixtureSchema = new mongoose.Schema({
    fixture_id: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    // WIB (UTC+7) calendar date — consistent with fixturesByDateService
    date_key: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}-\d{2}$/
    },
    league: {
        id: { type: Number },
        name: { type: String, default: '' },
        slug: { type: String, default: '' },
        country: { type: String, default: '' },
        logo: { type: String, default: '' },
        season: { type: Number },
        round: { type: String, default: '' }
    },
    home: { type: ApfTeamSchema, default: () => ({}) },
    away: { type: ApfTeamSchema, default: () => ({}) },
    goals: { type: ApfPairSchema, default: () => ({}) },
    score: {
        halftime: { type: ApfPairSchema, default: () => ({}) },
        fulltime: { type: ApfPairSchema, default: () => ({}) },
        extratime: { type: ApfPairSchema, default: () => ({}) },
        penalty: { type: ApfPairSchema, default: () => ({}) }
    },
    status: {
        short: { type: String, default: '' },
        long: { type: String, default: '' },
        elapsed: { type: Number, default: null },
        state: {
            type: String,
            enum: ['pre', 'in', 'post', 'unknown'],
            default: 'unknown'
        }
    },
    venue: {
        name: { type: String, default: '' },
        city: { type: String, default: '' }
    },
    providers: {
        apiFootball: { type: String, default: '' },
        footballData: { type: String, default: null }
    },
    raw: {
        type: mongoose.Schema.Types.Mixed,
        select: false
    },
    // Internal provenance flags — manually seeded data (out of API-Football's
    // free-plan history window). Never exposed in API responses.
    manual: { type: Boolean, default: false },
    manual_source: { type: [String], default: undefined },
    last_synced_at: {
        type: Date,
        required: true
    }
}, {
    collection: 'apf_fixtures',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false
});

ApfFixtureSchema.index(
    { fixture_id: 1 },
    { name: 'apf_fixture_id_unique', unique: true }
);
ApfFixtureSchema.index(
    { date_key: 1, 'league.id': 1 },
    { name: 'apf_fixture_date_league' }
);
ApfFixtureSchema.index(
    { 'status.state': 1, date: 1 },
    { name: 'apf_fixture_state_date' }
);

const ApfFixture = mongoose.model('ApfFixture', ApfFixtureSchema);

module.exports = ApfFixture;
