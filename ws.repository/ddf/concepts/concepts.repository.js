'use strict';

const _ = require('lodash');
const util = require('util');
const mongoose = require('mongoose');
const Concepts = mongoose.model('Concepts');

const RepositoryFactory = require('../../repository.factory');
const repositoryModel = require('../../repository.model');
const constants = require('../../../ws.utils/constants');

util.inherits(ConceptsRepository, repositoryModel);

function ConceptsRepository() {
  repositoryModel.apply(this, arguments);
}

module.exports = new RepositoryFactory(ConceptsRepository);

ConceptsRepository.prototype.findConceptProperties = function (select, where, onPropertiesFound) {
  const projection = makePositiveProjectionFor(select);
  if (!_.isEmpty(projection)) {
    projection.gid = 1;
    projection.originId = 1;
    projection['properties.concept_type'] = 1;
  }

  const normalizedWhereClause = this._normalizeWhereClause(where);
  const conceptQuery = this._composeQuery(prefixWithProperties(normalizedWhereClause));

  return Concepts.find(conceptQuery, projection).lean().exec(onPropertiesFound);
};

ConceptsRepository.prototype.countBy = function (where, onCounted) {
  const countQuery = this._composeQuery(where);
  return Concepts.count(countQuery, onCounted);
};

ConceptsRepository.prototype.findAll = function (onFound) {
  const countQuery = this._composeQuery();
  return Concepts.find(countQuery).lean().exec(onFound);
};

//TODO: Move this in utils that should be common across all repositories
function makePositiveProjectionFor(properties) {
  const positiveProjectionValues = _.fill(new Array(_.size(properties)), 1);
  return prefixWithProperties(_.zipObject(properties, positiveProjectionValues));
}

function prefixWithProperties(object) {
  return _.mapKeys(object, (value, property) => `properties.${property}`);
}
