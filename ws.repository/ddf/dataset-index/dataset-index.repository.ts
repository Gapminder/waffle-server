import { model } from 'mongoose';

const DatasetIndex = model('DatasetIndex');

/* tslint:disable-next-line:no-empty */
function DatasetIndexRepository(): void {
}

DatasetIndexRepository.prototype.findByDdfql = function (query: any, onFound: any): Promise<Object> {
  return DatasetIndex.find(query.where, query.select).lean().exec(onFound);
};

DatasetIndexRepository.prototype.create = function (indexOrBatchIndexes: any, onCreated: Function): Promise<Object> {
  indexOrBatchIndexes = Array.isArray(indexOrBatchIndexes) ? indexOrBatchIndexes : [indexOrBatchIndexes];
  return DatasetIndex.insertMany(indexOrBatchIndexes, onCreated);
};

DatasetIndexRepository.prototype.rollback = function ({_id: transactionId}: any, onRolledback: any): any {
  return DatasetIndex.remove({transaction: transactionId}, onRolledback);
};

DatasetIndexRepository.prototype.removeByDataset = function (datasetId: any, onRemove: any): any {
  return DatasetIndex.remove({dataset: datasetId}, onRemove);
};

const repository = new DatasetIndexRepository();
export { repository as DatasetSchemaRepository };
