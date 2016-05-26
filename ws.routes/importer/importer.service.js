'use strict';

let mongoose = require('mongoose');

let Concepts = mongoose.model('Concepts');
let DataPoints = mongoose.model('DataPoints');
let DatasetTransactions = mongoose.model('DatasetTransactions');
let Datasets = mongoose.model('Datasets');
let Entities = mongoose.model('Entities');
let OriginalEntities = mongoose.model('OriginalEntities');

module.exports = {
  getConcepts: getConcepts,
  getDataPoints: getDataPoints,
  getDatasetTransactions: getDatasetTransactions,
  getDatasets: getDatasets,
  getEntities: getEntities,
  getOriginalEntities: getOriginalEntities
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

function getOriginalEntities(query, cb) {
  OriginalEntities.find(query, cb);
}
