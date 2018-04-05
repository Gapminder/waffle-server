import * as _ from 'lodash';
import * as async from 'async';
import * as ddfImportUtils from './utils/import-ddf.utils';
import {createEntities} from './import-entities';
import {createConcepts} from './import-concepts';
import {createDatapoints} from './import-datapoints';
import {createTranslations} from './import-translations';
import {createDatasetSchema} from './import-dataset-schema';
import {DatasetTracker} from '../ws.services/datasets-tracker';
import * as os from 'os';
import {config} from '../ws.config/config';
import {logger} from '../ws.config/log';
import {cloneRepo, getRepoNameForDataset} from '../ws.services/repos.service';
import {importDataset} from '../ws.services/cli.service';
import {getCommitsByGithubUrl} from '../test/cli.utils';

const DATASET_IMPORT_LABEL = 'Dataset import';

export function importDdf(options: any, done: Function): void {
  const context = _.extend(_.pick(options, [
    'isDatasetPrivate',
    'github',
    'datasetName',
    'commit',
    'user',
    'lifecycleHooks'
  ]), {raw: {}});

  console.time(`${DATASET_IMPORT_LABEL}: ${context.github}`);
  DatasetTracker.track(_.get(context, 'datasetName'));

  async.waterfall([
    async.constant(context),
    ddfImportUtils.resolvePathToDdfFolder,
    ddfImportUtils.createTransaction,
    ddfImportUtils.createDataset,
    ddfImportUtils.establishTransactionForDataset,
    ddfImportUtils.activateLifecycleHook('onTransactionCreated'),
    ddfImportUtils.cloneDdfRepo,
    ddfImportUtils.validateDdfRepo,
    ddfImportUtils.getDatapackage,
    ddfImportUtils.updateTransactionLanguages,
    createConcepts,
    createEntities,
    createDatapoints,
    createTranslations,
    createDatasetSchema,
    ddfImportUtils.closeTransaction
  ], (importError: any, externalContext: any) => {
    console.timeEnd(`${DATASET_IMPORT_LABEL}: ${context.github}`);
    DatasetTracker.clean(_.get(externalContext, 'datasetName'));

    if (importError && _.get(externalContext, 'transaction')) {
      return done(importError, {transactionId: externalContext.transaction._id});
    }

    return done(importError, {
      datasetName: _.get(externalContext, 'datasetName'),
      version: _.get(externalContext, 'transaction.createdAt'),
      transactionId: _.get(externalContext, 'transaction._id')
    });
  });
}

export function importDdfRepos(): Promise<void> {
  if (!config.THRASHING_MACHINE) {
    return Promise.resolve();
  }

  const datasets = config.DEFAULT_DATASETS;

  return new Promise((resolve: Function) => {
    async.eachSeries(datasets, (github: any, onImported: Function) => {

      const context = {
        isDatasetPrivate: false,
        github,
        datasetName: getRepoNameForDataset(github),
        lifecycleHooks: _.noop
      };

      async.waterfall(
        [
          async.constant(context),
          (externalContext: any, done: Function) => getCommitsByGithubUrl(externalContext.github, (error: string, commitsList: string[]) => {
            externalContext.commit = _.last(commitsList);
            return done(error, externalContext);
          }),
          (externalContext: any, done: Function) => cloneRepo(externalContext.github, externalContext.commit, (error: string) => {
            return done(error, externalContext);
          }),
          importDataset
        ], (_error: string) => {
          if (_error) {
            logger.error(_error);
          }

          return onImported();
        }
      );
    }, () => resolve());
  });
}
