'use strict';
const _ = require('lodash');
const constants = require('../ws.utils/constants');

module.exports = VersionedModelRepositoryFactory;

function VersionedModelRepositoryFactory(Repository) {
  this.Repository = Repository;
}

VersionedModelRepositoryFactory.prototype.currentVersion = function (datasetId, version) {
  if (!datasetId) {
    throw new Error('datasetId must be given');
  }

  if (!version) {
    throw new Error('dataset version must be given');
  }

  const versionQueryFragment = {
    dataset: datasetId,
    from: {$lte: version},
    to: {$gt: version}
  };

  return new this.Repository(versionQueryFragment);
};
