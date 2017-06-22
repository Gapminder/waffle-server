import * as _ from 'lodash';
import { constants } from '../ws.utils/constants';
import * as NodeCache from 'node-cache';
import { VersionedModelRepository } from './versioned-model-repository';

const FOREVER = 0;
const HOUR = 60 * 60;
const FIVE_HOURS = 5 * HOUR;

const repositoriesCache = new NodeCache({ checkperiod: HOUR });

export class VersionedModelRepositoryFactory<REPO extends VersionedModelRepository> {
  private Repository: new (name: string) => REPO;

  private static checkPreconditions(datasetId: any, version: number): void {
    if (!datasetId) {
      throw new Error('datasetId must be given');
    }

    if (!version) {
      throw new Error('dataset version must be given');
    }
  }

  public constructor(Repository: new (name: string) => REPO) {
    this.Repository = Repository;
  }

  public makeRepository(factoryName: string, versionQueryFragment: any, datasetId?: any, version?: number): REPO {
    const key = `${(this.Repository as any).name}:${factoryName}:${datasetId}:${version}`;

    let repository = repositoriesCache.get(key);
    if (!repository) {
      let ttl = FIVE_HOURS;

      if (_.isEmpty(versionQueryFragment)) {
        ttl = FOREVER;
        repository = new (this.Repository as any)({});
      } else {
        repository = new (this.Repository as any)(versionQueryFragment, datasetId, version);
      }

      repositoriesCache.set(key, repository, ttl);
    }

    return repository;
  }

  public currentVersion(datasetId: any, version: number): REPO {
    VersionedModelRepositoryFactory.checkPreconditions(datasetId, version);

    const versionQueryFragment = {
      dataset: datasetId,
      from: { $lte: version },
      to: { $gt: version }
    };

    return this.makeRepository('currentVersion', versionQueryFragment, datasetId, version);
  }

  public latestVersion(datasetId: any, version: number): REPO {
    VersionedModelRepositoryFactory.checkPreconditions(datasetId, version);

    const versionQueryFragment = {
      dataset: datasetId,
      from: { $lte: version },
      to: constants.MAX_VERSION
    };

    return this.makeRepository('latestVersion', versionQueryFragment, datasetId, version);
  }

  public allOpenedInGivenVersion(datasetId: any, version: number): REPO {
    VersionedModelRepositoryFactory.checkPreconditions(datasetId, version);

    const versionQueryFragment = {
      dataset: datasetId,
      from: version
    };

    return this.makeRepository('allOpenedInGivenVersion', versionQueryFragment, datasetId, version);
  }

  public latestExceptCurrentVersion(datasetId: any, version: number): REPO {
    VersionedModelRepositoryFactory.checkPreconditions(datasetId, version);

    const versionQueryFragment = {
      dataset: datasetId,
      from: { $lt: version },
      to: constants.MAX_VERSION
    };

    return this.makeRepository('latestExceptCurrentVersion', versionQueryFragment, datasetId, version);
  }

  public closedOrOpenedInGivenVersion(datasetId: any, version: number): REPO {
    VersionedModelRepositoryFactory.checkPreconditions(datasetId, version);

    const versionQueryFragment = { $or: [{ from: version }, { to: version }], dataset: datasetId };

    return this.makeRepository('closedOrOpenedInGivenVersion', versionQueryFragment, datasetId, version);
  }

  public versionAgnostic(): REPO {
    return this.makeRepository('versionAgnostic', {});
  }
}
