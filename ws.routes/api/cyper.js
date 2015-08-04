'use strict';

var flatten = require('flat');
var _ = require('lodash');

module.exports = function (app, serviceLocator) {
  var db = app.get('neo4jDb');

  app.post('/api/admin/cyper', runCyperQuery);

  function runCyperQuery(req, res) {
    var query = _.trim(req.body.query);

    if (!query) {
      return res.json({error: 'TypeError: Query or queries required', data: {data: {}}});
    }

    db.cypher({
      query: query
    }, function (err, results) {
      if (err) {
        return res.json({error: err.message, data: {data: {}}});
      }

      if (results.length) {
        var _results = [];

        _.map(results, function (item) {
          _results.push(flatten(item));
        });

        return res.json({success: true, data: {data: _results, headers: _.keys(_results[0])}});
      }

      return res.json({success: true, data: {data: {}}});
    });
  }
};
