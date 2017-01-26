import * as _ from 'lodash';
import * as async from 'async';
import * as ddfImportUtils from './utils/import-ddf.utils';
import {createEntities} from './import-entities';
import {createConcepts} from './import-concepts';
import {createDatapoints} from './import-datapoints';
import {createTranslations} from './import-translations';
import {createDatasetSchema} from './import-dataset-schema';

const DATASET_IMPORT_LABEL = 'Dataset import';

export {
  importDdf
};

function importDdf(options, done) {
  const pipe = _.extend(_.pick(options, [
    'isDatasetPrivate',
    'github',
    'datasetName',
    'commit',
    'user',
    'lifecycleHooks'
  ]), {raw: {}});

  console.time(DATASET_IMPORT_LABEL);
  async.waterfall([
    async.constant(pipe),
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
  ], (importError, pipe: any) => {
    console.timeEnd(DATASET_IMPORT_LABEL);

    if (importError && _.get(pipe, 'transaction')) {
      return done(importError, {transactionId: pipe.transaction._id});
    }

    return done(importError, {
      datasetName: pipe.datasetName,
      version: _.get(pipe.transaction, 'createdAt'),
      transactionId: _.get(pipe.transaction, '_id')
    });
  });
}

