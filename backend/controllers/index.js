const liveScoreService = require('../services/liveScoreService');

module.exports = app => {
    require('./healthController')(app);
    require('./soccerController')(app);
    require('./seoController')(app);
    require('./liveController')(app);
    require('./fixtureController')(app);
    require('./fixturesController')(app);

    // Start background live score worker
    liveScoreService.startWorker();
};

