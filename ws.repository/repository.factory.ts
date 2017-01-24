import * as _ from 'lodash';
import { constants } from '../ws.utils/constants';
import * as NodeCache from 'node-cache';

const FOREVER = 0;
const HOUR = 60 * 60;
const FIVE_HOURS = 5 * HOUR;

const repositoriesCache = new NodeCache({ checkperiod: HOUR });

VersionedModelRepositoryFactory.prototype.makeRepository = function (factoryName, versionQueryFragment, datasetId, version) {
  const key = `${this.Repository.name}:${factoryName}:${datasetId}:${version}`;

  let repository = repositoriesCache.get(key);
  if (!repository) {
    let ttl = FIVE_HOURS;

    if(_.isEmpty(versionQueryFragment)) {
      ttl = FOREVER;
      repository = new this.Repository({});
    } else {
      repository = new this.Repository(versionQueryFragment, datasetId, version);
    }

    repositoriesCache.set(key, repository, ttl);
  }

  return repository;
};

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

  return this.makeRepository('currentVersion', versionQueryFragment, datasetId, version);
};

VersionedModelRepositoryFactory.prototype.latestVersion = function (datasetId, version) {
  checkPreconditions(datasetId, version);

  const versionQueryFragment = {
    dataset: datasetId,
    from: {$lte: version},
    to: constants.MAX_VERSION
  };

  return this.makeRepository('latestVersion', versionQueryFragment, datasetId, version);
};

VersionedModelRepositoryFactory.prototype.allOpenedInGivenVersion = function (datasetId, version) {
  checkPreconditions(datasetId, version);

  const versionQueryFragment = {
    dataset: datasetId,
    from: version,
  };

  return this.makeRepository('allOpenedInGivenVersion', versionQueryFragment, datasetId, version);
};

VersionedModelRepositoryFactory.prototype.latestExceptCurrentVersion = function (datasetId, version) {
  checkPreconditions(datasetId, version);

  const versionQueryFragment = {
    dataset: datasetId,
    from: {$lt: version},
    to: constants.MAX_VERSION
  };

  return this.makeRepository('latestExceptCurrentVersion', versionQueryFragment, datasetId, version);
};

VersionedModelRepositoryFactory.prototype.closedOrOpenedInGivenVersion = function (datasetId, version) {
  checkPreconditions(datasetId, version);

  const versionQueryFragment = {$or: [{from: version}, {to: version}], dataset: datasetId};

  return this.makeRepository('closedOrOpenedInGivenVersion', versionQueryFragment, datasetId, version);
};

VersionedModelRepositoryFactory.prototype.versionAgnostic = function () {
  return this.makeRepository('versionAgnostic', {});
};

function checkPreconditions(datasetId, version) {
  if (!datasetId) {
    throw new Error('datasetId must be given');
  }

  if (!version) {
    throw new Error('dataset version must be given');
  }
}

export {VersionedModelRepositoryFactory as RepositoryFactory};
