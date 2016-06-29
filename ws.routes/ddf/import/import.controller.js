'use strict';

var express = require('express');
var service = require('./import.service');

module.exports = serviceLocator => {
  let app = serviceLocator.getApplication();
  var router = express.Router();

  router.get('/api/importer/concepts', sendDataResponseConcepts);

  router.get('/api/importer/data-points', sendDataResponseDataPoints);

  router.get('/api/importer/dataset-transactions', sendDataResponseDatasetTransactions);

  router.get('/api/importer/datasets', sendDataResponseDatasets);

  router.get('/api/importer/entities', sendDataResponseEntities);

  return app.use(router);
};

function sendDataResponseConcepts(req, res) {
  service.getConcepts(req.query, function (err, result) {
    if (err) {
      return res.json({success: !err, error: err});
    }
    res.json(result);
  });
}

function sendDataResponseDataPoints(req, res) {
  service.getDataPoints(req.query, function (err, result) {
    if (err) {
      return res.json({success: !err, error: err});
    }
    res.json(result);
  });
}

function sendDataResponseDatasetTransactions(req, res) {
  service.getDatasetTransactions(req.query, function (err, result) {
    if (err) {
      return res.json({success: !err, error: err});
    }
    res.json(result);
  });
}

function sendDataResponseDatasets(req, res) {
  service.getDatasets(req.query, function (err, result) {
    if (err) {
      return res.json({success: !err, error: err});
    }
    res.json(result);
  });
}

function sendDataResponseEntities(req, res) {
  service.getEntities(req.query, function (err, result) {
    if (err) {
      return res.json({success: !err, error: err});
    }
    res.json(result);
  });
}
