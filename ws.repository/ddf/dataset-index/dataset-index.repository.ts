import { model } from 'mongoose';
import { logger } from '../../../ws.config/log';

const DatasetIndex = model('DatasetIndex');

/* tslint:disable-next-line:no-empty */
function DatasetIndexRepository(): void {
}

DatasetIndexRepository.prototype.findByDdfql = function (query: any, onFound: Function): Promise<Object> {
  logger.debug({ mongo: query.where });
  return DatasetIndex.find(query.where, query.select).lean().exec(onFound);
};

DatasetIndexRepository.prototype.create = function (indexOrBatchIndexes: any, onCreated: Function): Promise<Object> {
  indexOrBatchIndexes = Array.isArray(indexOrBatchIndexes) ? indexOrBatchIndexes : [indexOrBatchIndexes];
  return DatasetIndex.insertMany(indexOrBatchIndexes, onCreated);
};

DatasetIndexRepository.prototype.rollback = function ({_id: transactionId}: any, onRolledback: Function): any {
  return DatasetIndex.remove({transaction: transactionId}, onRolledback as any);
};

DatasetIndexRepository.prototype.removeByDataset = function (datasetId: any, onRemove: Function): any {
  return DatasetIndex.remove({dataset: datasetId}, onRemove as any);
};

const repository = new DatasetIndexRepository();
export { repository as DatasetSchemaRepository };
