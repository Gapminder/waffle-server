import * as _ from 'lodash';
import * as async from 'async';
import * as ddfImportUtils from '../utils/import-ddf.utils';
import {updateConcepts} from './update-concepts';
import {updateEntities} from './update-entities';
import {updateDatapoints} from './update-datapoints';
import {createDatasetSchema} from '../import-dataset-schema';
import {updateEntitiesTranslation} from './translations/update-entity-translations';
import {updateConceptsTranslations} from './translations/update-concept-translations';
import {updateDatapointsTranslations} from './translations/update-datapoint-translations';

const DATASET_INCREMENTAL_UPDATE_LABEL = 'Dataset incremental update';

export {
  updateDdf
};

function updateDdf(options: any, done: Function): void {
  const pipe = _.pick(options, [
    'user',
    'github',
    'commit',
    'hashFrom',
    'hashTo',
    'datasetName',
    'lifecycleHooks'
  ]);

  console.time(DATASET_INCREMENTAL_UPDATE_LABEL);
  async.waterfall([
    async.constant(pipe),
    ddfImportUtils.resolvePathToDdfFolder,
    ddfImportUtils.createTransaction,
    ddfImportUtils.findDataset,
    ddfImportUtils.establishTransactionForDataset,
    ddfImportUtils.findPreviousTransaction,
    ddfImportUtils.activateLifecycleHook('onTransactionCreated'),
    ddfImportUtils.cloneDdfRepo,
    ddfImportUtils.validateDdfRepo,
    ddfImportUtils.getDatapackage,
    ddfImportUtils.generateDiffForDatasetUpdate,
    updateConcepts,
    ddfImportUtils.getAllConcepts,
    ddfImportUtils.getAllPreviousConcepts,
    updateEntities,
    updateDatapoints,
    updateConceptsTranslations,
    updateEntitiesTranslation,
    updateDatapointsTranslations,
    createDatasetSchema,
    ddfImportUtils.closeTransaction
  ], (updateError: Function, _pipe: any) => {
    console.timeEnd(DATASET_INCREMENTAL_UPDATE_LABEL);

    if (updateError && _.get(_pipe, 'transaction')) {
      return done(updateError, {transactionId: _pipe.transaction._id});
    }

    return done(updateError, {
      datasetName: _.get(_pipe, 'dataset.name'),
      version: _.get(_pipe, 'transaction.createdAt'),
      transactionId: _.get(_pipe, 'transaction._id')
    });
  });
}
