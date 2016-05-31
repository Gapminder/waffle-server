'use strict';

const mongoose = require('mongoose');

const Concepts = mongoose.model('Concepts');
const DataPoints = mongoose.model('DataPoints');
const DatasetTransactions = mongoose.model('DatasetTransactions');
const Datasets = mongoose.model('Datasets');
const Entities = mongoose.model('Entities');

module.exports = {
  getConcepts: getConcepts,
  getDataPoints: getDataPoints,
  getDatasetTransactions: getDatasetTransactions,
  getDatasets: getDatasets,
  getEntities: getEntities
};

function getConcepts(query, cb) {
  Concepts.find(query, cb);
}

function getDataPoints(query, cb) {
  DataPoints.find(query, cb);
}

function getDatasetTransactions(query, cb) {
  DatasetTransactions.find(query, cb);
}

function getDatasets(query, cb) {
  Datasets.find(query, cb);
}

function getEntities(query, cb) {
  Entities.find(query, cb);
}
