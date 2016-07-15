'use strict';

const _ = require('lodash');
const util = require('util');
const mongoose = require('mongoose');
const Concepts = mongoose.model('Concepts');

const utils = require('../../utils');
const constants = require('../../../ws.utils/constants');

util.inherits(ConceptsRepository, utils.VersionedModelRepository);

function ConceptsRepository() {
  utils.VersionedModelRepository.apply(this, arguments);
}

module.exports = new utils.VersionedModelRepositoryFactory(ConceptsRepository);

ConceptsRepository.prototype.findConceptProperties = function (select, where, onPropertiesFound) {
  const projection = makePositiveProjectionFor(select);
  const conceptQuery = this._composeQuery(prefixWithProperties(where));

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
  return prefixWithProperties(_.chain(properties).zipObject(positiveProjectionValues).value());
}

function prefixWithProperties(object) {
  return _.mapKeys(object, (value, property) => `properties.${property}`);
}
