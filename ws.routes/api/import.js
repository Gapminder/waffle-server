'use strict';

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var config = app.get('config');
  var utils = require('./import.service')(config);

  app.post('/api/import/json2csv', utils.convertJson2Csv);
};
