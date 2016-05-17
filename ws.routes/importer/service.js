var mongoose = require('mongoose');
// mongoose.connect('mongodb://localhost/ws_ddf');
// var _ = require('lodash');
// var path = require('path');

var Concepts = mongoose.model('Concepts');
var DataPoints = mongoose.model('DataPoints');
var DatasetTransactions = mongoose.model('DatasetTransactions');
var DatasetVersions = mongoose.model('DatasetVersions');
var Datasets = mongoose.model('Datasets');
var Entities = mongoose.model('Entities');
var Translations = mongoose.model('Translations');

module.exports = serviceLocator => {
  var app = serviceLocator.getApplication();

  app.get('/api/importer/concepts', getConcepts);
  function getConcepts(req, res) {
    Concepts.find({}, (err, items) => {
      if (err) {
        console.log('ErrorSchemaModel');
      }
      return res.json(items);
    });
  }

  app.get('/api/importer/dataPoints', getDataPoints);
  function getDataPoints(req, res) {
    DataPoints.find({}, (err, items) => {
      if (err) {
        console.log('ErrorSchemaModel');
      }
      return res.json(items);
    });
  }

  app.get('/api/importer/datasetTransactions', getDatasetTransactions);
  function getDatasetTransactions(req, res) {
    DatasetTransactions.find({}, (err, items) => {
      if (err) {
        console.log('ErrorSchemaModel');
      }
      return res.json(items);
    });
  }

  app.get('/api/importer/datasetVersions', getDatasetVersions);
  function getDatasetVersions(req, res) {
    DatasetVersions.find({}, (err, items) => {
      if (err) {
        console.log('ErrorSchemaModel');
      }
      return res.json(items);
    });
  }

  app.get('/api/importer/datasets', getDatasets);
  function getDatasets(req, res) {
    Datasets.find({}, (err, items) => {
      if (err) {
        console.log('ErrorSchemaModel');
      }
      return res.json(items);
    });
  }

  app.get('/api/importer/entities', getEntities);
  function getEntities(req, res) {
    Entities.find({}, (err, items) => {
      if (err) {
        console.log('ErrorSchemaModel');
      }
      return res.json(items);
    });
  }

  app.get('/api/importer/translations', getTranslations);
  function getTranslations(req, res) {
    Translations.find({}, (err, items) => {
      if (err) {
        console.log('ErrorSchemaModel');
      }
      return res.json(items);
    });
  }
};

