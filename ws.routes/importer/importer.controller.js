'use strict';

var express = require('express');
var service = require('./importer.service');

module.exports = serviceLocator => {
  let app = serviceLocator.getApplication();
  var router = express.Router();

  router.get('/api/importer/concepts', sendDataResponse('Concepts'));
  router.get('/api/importer/dataPoints', sendDataResponse('DataPoint'));
  router.get('/api/importer/dataSetTransactions', sendDataResponse('DatasetTransactions'));
  router.get('/api/importer/dataSets', sendDataResponse('Datasets'));
  router.get('/api/importer/entities', sendDataResponse('Entities'));
  router.get('/api/importer/originalEntities', sendDataResponse('OriginalEntities'));
  return app.use(router);
};

function sendDataResponse(modelName) {
  return (req, res) => {
    service['get' + modelName](req.query, function (err, result) {
      if (err) {
        return res.json({success: !err, error: err});
      }

      return res.json(result);
    });
  };
}
