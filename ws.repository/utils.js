'use strict';
const _ = require('lodash');

module.exports = {
  VersionedModelRepositoryFactory,
  VersionedModelRepository
};

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
    from: {$lte: version},
    to: {$gt: version},
    dataset: datasetId
  };

  return new this.Repository(versionQueryFragment);
};

function VersionedModelRepository(versionQueryFragment) {
  this.versionQueryFragment = versionQueryFragment;
}

VersionedModelRepository.prototype._composeQuery = function () {
  return _.merge.bind(_, {}, this.versionQueryFragment).apply(undefined, arguments);
};
