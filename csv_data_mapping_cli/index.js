const appStub = {
  get: function (moduleName) {
    return this[moduleName];
  },
  set: function (moduleName, module) {
    return this[moduleName] = module;
  }
};
const config = require('../ws.config/config')(appStub);
const logger = require('../ws.config/log')(appStub);

var mongoose = require('mongoose');
mongoose.set('debug', config.MONGOOSE_DEBUG);
mongoose.connect(config.MONGODB_URL);

// import models
require('../ws.repository/geo.model');
require('../ws.repository/dimensions/dimensions.model');
require('../ws.repository/dimension-values/dimension-values.model');
require('../ws.repository/translations.model');
require('../ws.repository/indicators/indicators.model');
require('../ws.repository/indicator-values/indicator-values.model');
require('../ws.repository/indexTree.model');
require('../ws.repository/indexDb.model');

require('./import')(appStub, (err) => {
  if (err) {
    logger.error(err);
  }

  mongoose.disconnect();
  process.exit(0);
});
