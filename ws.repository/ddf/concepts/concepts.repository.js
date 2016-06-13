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

function ConceptsRepository(versionQueryFragment) {
  this.versionQueryFragment = versionQueryFragment;
}

ConceptsRepository.prototype.findConceptProperties = function (select, where, onPropertiesFound) {
  const projection = makePositiveProjectionFor(select);
  const conceptQuery = _.merge({}, this.versionQueryFragment, prefixWithProperties(where));

  return Concepts.find(conceptQuery, projection).lean().exec(onPropertiesFound);
};

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  ConceptsRepository.prototype[actionName] = utils.actionFactory(actionName)(Concepts, this);
});

//TODO: Move this in utils that should be common across all repositories
function makePositiveProjectionFor(properties) {
  const positiveProjectionValues = _.fill(new Array(_.size(properties)), 1);
  return prefixWithProperties(_.chain(properties).zipObject(positiveProjectionValues).value());
}

function prefixWithProperties(object) {
  return _.mapKeys(object, (value, property) => `properties.${property}`);
}

module.exports = ConceptsRepositoryWrapper;
