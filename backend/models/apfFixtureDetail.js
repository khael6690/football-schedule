/**
 * API-Football fixture detail archive (collection: apf_fixture_details)
 *
 * Durable copy of the normalized FixtureDetail contract produced by
 * fixtureDetailService.normalizeFixtureDetail() (meta + score + events +
 * lineups + statistics). Finished fixtures never change, so once `is_final`
 * is true the document can be served forever without spending API quota.
 */

const mongoose = require('../database');

const ApfFixtureDetailSchema = new mongoose.Schema({
    fixture_id: {
        type: Number,
        required: true
    },
    // Exactly the FixtureDetail contract shape
    detail: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    status_short: { type: String, default: '' },
    // short in FT/AET/PEN/PST/CANC/ABD/AWD/WO
    is_final: { type: Boolean, default: false },
    // Internal provenance flags — manually seeded data. Never exposed in
    // API responses (`detail` alone is returned to callers).
    manual: { type: Boolean, default: false },
    manual_source: { type: [String], default: undefined },
    last_synced_at: {
        type: Date,
        required: true
    }
}, {
    collection: 'apf_fixture_details',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false
});

ApfFixtureDetailSchema.index(
    { fixture_id: 1 },
    { name: 'apf_fixture_detail_id_unique', unique: true }
);
ApfFixtureDetailSchema.index(
    { is_final: 1 },
    { name: 'apf_fixture_detail_final' }
);

const ApfFixtureDetail = mongoose.model('ApfFixtureDetail', ApfFixtureDetailSchema);

module.exports = ApfFixtureDetail;
