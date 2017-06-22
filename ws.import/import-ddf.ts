import * as _ from 'lodash';
import * as async from 'async';
import * as ddfImportUtils from './utils/import-ddf.utils';
import { createEntities } from './import-entities';
import { createConcepts } from './import-concepts';
import { createDatapoints } from './import-datapoints';
import { createTranslations } from './import-translations';
import { createDatasetSchema } from './import-dataset-schema';

const DATASET_IMPORT_LABEL = 'Dataset import';

export function importDdf(options: any, done: Function): void {
  const context = _.extend(_.pick(options, [
    'isDatasetPrivate',
    'github',
    'datasetName',
    'commit',
    'user',
    'lifecycleHooks'
  ]), { raw: {} });

  console.time(DATASET_IMPORT_LABEL);
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
    console.timeEnd(DATASET_IMPORT_LABEL);

    if (importError && _.get(externalContext, 'transaction')) {
      return done(importError, { transactionId: externalContext.transaction._id });
    }

    return done(importError, {
      datasetName: _.get(externalContext, 'datasetName'),
      version: _.get(externalContext, 'transaction.createdAt'),
      transactionId: _.get(externalContext, 'transaction._id')
    });
  });
}
