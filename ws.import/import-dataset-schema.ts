import * as _ from 'lodash';
import * as hi from 'highland';
import { logger } from '../ws.config/log';
import { constants } from '../ws.utils/constants';
import * as ddfImportUtils from '../ws.import/utils/import-ddf.utils';
import { DatasetSchemaRepository } from '../ws.repository/ddf/dataset-index/dataset-index.repository';
import { Datapackage, DdfSchemaItem } from './utils/datapackage.parser';
import { Schema } from 'mongoose';

interface DdfSchemaContext {
  datasetId: Schema.Types.ObjectId;
  transactionId: Schema.Types.ObjectId;
  datapackage: Datapackage;
}

export function createDatasetSchema(externalContext: any, done: Function): void {
  const externalContextFrozen: Readonly<DdfSchemaContext> = Object.freeze({
    datasetId: externalContext.dataset._id,
    transactionId: externalContext.transaction._id,
    datapackage: externalContext.datapackage
  });

  const conceptsSchemaItemsStream =
    hi(_.get(externalContextFrozen.datapackage, 'ddfSchema.concepts', []));

  const entitiesSchemaItemsStream =
    hi(_.get(externalContextFrozen.datapackage, 'ddfSchema.entities', []));

  const datapointsSchemaItemsStream =
    hi(_.get(externalContextFrozen.datapackage, 'ddfSchema.datapoints', []));

  const datasetSchemaCreationStream = hi([
    toDdfSchemaItemsCreationStream(conceptsSchemaItemsStream, externalContextFrozen, constants.CONCEPTS),
    toDdfSchemaItemsCreationStream(entitiesSchemaItemsStream, externalContextFrozen, constants.ENTITIES),
    toDdfSchemaItemsCreationStream(datapointsSchemaItemsStream, externalContextFrozen, constants.DATAPOINTS)
  ]).parallel(3);

  return ddfImportUtils.startStreamProcessing(datasetSchemaCreationStream, externalContext, done);
}

function toDdfSchemaItemsCreationStream(resourcesStream: any, externalContextFrozen: Readonly<DdfSchemaContext>, type: string): any {
  return resourcesStream
    .map((item: DdfSchemaItem) => {
      return {
        key: item.primaryKey,
        value: item.value,
        resources: item.resources,
        type,
        transaction: externalContextFrozen.transactionId,
        dataset: externalContextFrozen.datasetId
      };
    })
    .batch(ddfImportUtils.DEFAULT_CHUNK_SIZE)
    .flatMap((datasetSchemaBatch: DdfSchemaItem[]) => hi(storeDatasetSchemaItemsToDb(datasetSchemaBatch)));
}

function storeDatasetSchemaItemsToDb(datasetSchemaItems: DdfSchemaItem[]): Promise<any> {
  logger.info('** create Dataset schema items: ', _.size(datasetSchemaItems));
  return DatasetSchemaRepository.create(datasetSchemaItems);
}
