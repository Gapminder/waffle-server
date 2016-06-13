'use strict';
var _ = require('lodash');
var async = require('async');

const mongoose = require('mongoose');

const Concepts = mongoose.model('Concepts');
const Entities = mongoose.model('Entities');
const DataPoints = mongoose.model('DataPoints');

const ConceptsRepositoryFactory = require('../../../ws.repository/ddf/concepts/concepts.repository');

module.exports = {
  getConcepts
};

function getConcepts(pipe, cb) {
  const ConceptsRepository = new ConceptsRepositoryFactory({
    datasetId: pipe.dataset._id,
    version: pipe.version
  });

  ConceptsRepository
    .currentVersion()
    .findConceptProperties(pipe.select, pipe.where, (error, concepts) => {
      if (error) {
        return cb(error);
      }

      pipe.concepts = concepts;

      return mapResult(pipe, cb);
    });
}

function mapResult(pipe, cb) {
  return cb(null, {
    headers: pipe.select,
    rows: _.map(pipe.concepts, concept => toWsJson(pipe.select, concept))
  });
}

function toWsJson(select, concept) {
  return _.map(select, property => concept.properties[property]);
}
