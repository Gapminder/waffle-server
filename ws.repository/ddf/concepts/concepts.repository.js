'use strict';

const _ = require('lodash');

const mongoose = require('mongoose');
const Concepts = mongoose.model('Concepts');

const utils = require('../../utils');
const constants = require('../../../ws.utils/constants');

function ConceptsRepositoryWrapper(options) {
  this.version = options.version;
  this.datasetId = options.datasetId;
}

ConceptsRepositoryWrapper.prototype.currentVersion = function () {
  const versionQueryFragment = {
    from: {$lte: this.version},
    to: {$gt: this.version},
    dataset: this.datasetId
  };
  return new ConceptsRepository(versionQueryFragment)
};

ConceptsRepositoryWrapper.prototype.previousVersionsLeftovers = function () {
  const versionQueryFragment = {
    from: {$lt: this.version},
    to: constants.MAX_VERSION,
    dataset: this.datasetId
  };
  return new ConceptsRepository(versionQueryFragment)
};

function ConceptsRepository(versionQueryFragment) {
  this.versionQueryFragment = versionQueryFragment;
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  ConceptsRepository.prototype[actionName] = utils.actionFactory(actionName)(Concepts, this);
});

ConceptsRepository.prototype.findPropertyValuesByGid = function (gid, properties, onPropertiesFound) {
  const query = _.merge({}, this.versionQueryFragment, {gid: conceptGid});
  const projection = makePositiveProjectionFor(properties);

  return Concepts.findOne(query, projection).lean().exec(onPropertiesFound);
};

ConceptsRepository.prototype.findPropertyValuesByGid = function (gid, properties, onPropertiesFound) {
  const query = _.merge({}, this.versionQueryFragment, {gid: conceptGid});
  const projection = makePositiveProjectionFor(properties);

  return Concepts.findOne(query, projection).lean().exec(onPropertiesFound);
};

function makePositiveProjectionFor(properties) {
  const positiveProjectionValues = _.fill(new Array(_.size(properties)), 1);
  return _.chain(properties)
    .zipObject(positiveProjectionValues)
    .mapKeys((value, property) => `properties.${property}`)
    .merge({gid: 1})
    .value();
}

module.exports = ConceptsRepositoryWrapper;
