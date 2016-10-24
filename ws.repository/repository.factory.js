'use strict';
const _ = require('lodash');
const constants = require('../ws.utils/constants');

module.exports = VersionedModelRepositoryFactory;

function VersionedModelRepositoryFactory(Repository) {
  this.Repository = Repository;
}

VersionedModelRepositoryFactory.prototype.currentVersion = function (datasetId, version) {
  checkPreconditions(datasetId, version);

  const versionQueryFragment = {
    dataset: datasetId,
    from: {$lte: version},
    to: {$gt: version}
  };

  return new this.Repository(versionQueryFragment);
};

VersionedModelRepositoryFactory.prototype.latestVersion = function (datasetId, version) {
  checkPreconditions(datasetId, version);

  const versionQueryFragment = {
    dataset: datasetId,
    from: {$lte: version},
    to: constants.MAX_VERSION
  };

  return new this.Repository(versionQueryFragment);
};

VersionedModelRepositoryFactory.prototype.previousVersion = function (datasetId, version) {
  checkPreconditions(datasetId, version);

  const versionQueryFragment = {
    dataset: datasetId,
    from: {$lt: version},
    to: version
  };

  return new this.Repository(versionQueryFragment);
};

function checkPreconditions(datasetId, version) {
  if (!datasetId) {
    throw new Error('datasetId must be given');
  }

  if (!version) {
    throw new Error('dataset version must be given');
  }
}
