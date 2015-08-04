'use strict';

var converter = require('json-2-csv');
var _ = require('lodash');

module.exports = function (app, serviceLocator) {
  var config = app.get('config');
  var optionsDefault = config.DEFAULT_OPTIONS_CONVERTING_JSON_TO_CSV;

  app.post('/api/import/json2csv', convertJson2Csv);

  function convertJson2Csv(req, res) {
    var json = req.body.data;
    var options = _.assign(optionsDefault, req.body.options);

    if (!_.isArray(json)) {
      return res.json({error: 'Data is not an array'});
    }

    converter.json2csv(json, callback, options);

    function callback(error, csv) {
      if (error) {
        return res.json({error: error});
      }

      return res.json({success: true, data: csv});
    }
  }
};
