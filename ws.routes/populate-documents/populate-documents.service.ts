import * as _ from 'lodash';
import * as async from 'async';
import {logger} from '../../ws.config/log';

import {ConceptsRepositoryFactory} from '../../ws.repository/ddf/concepts/concepts.repository';
import {DatapointsRepositoryFactory} from '../../ws.repository/ddf/data-points/data-points.repository';
import {EntitiesRepositoryFactory} from '../../ws.repository/ddf/entities/entities.repository';
import * as datasetTransactionService from '../../ws.services/dataset-transactions.service';

const populatingPropertiesByCollection = {
  concepts: [
    ['domain', 'concepts']
  ],
  entities: [
    ['domain', 'concepts'],
    ['sets', 'concepts']
  ],
  datapoints: [
    ['measure', 'concepts'],
    ['dimensionsConcepts', 'concepts'],
    ['dimensions', 'entities']
  ]
};

const repositoriesByCollection = {
  concepts: {
    repo: ConceptsRepositoryFactory,
    queryFn: 'findConceptsByQuery'
  },
  entities: {
    repo: EntitiesRepositoryFactory,
    queryFn: 'findEntityPropertiesByQuery'
  },
  datapoints: {
    repo: DatapointsRepositoryFactory,
    queryFn: 'findByQuery'
  }
};

function getDocumentsByQuery(externalContext, onFound) {
  return async.waterfall([
    async.constant(externalContext),
    getDatasetAndTransaction,
    getDocuments,
    populateDocuments
  ], (error, result) => {
    if (error) {
      return onFound(error);
    }

    return onFound(null, result.populatedDocuments);
  });
}

function getDatasetAndTransaction(externalContext, onDatasetAndTransactionFound) {
  const {datasetName, commit} = externalContext;

  return datasetTransactionService
    .findDefaultDatasetAndTransaction(datasetName, commit, (error, datasetAndTransaction) => {
      if (error) {
        return onDatasetAndTransactionFound(error);
      }

      if (!datasetAndTransaction) {
        return onDatasetAndTransactionFound('Dataset and Transaction were not found.');
      }

      if (!_.get(datasetAndTransaction, 'dataset')) {
        return onDatasetAndTransactionFound('Dataset was not found.');
      }

      if (!_.get(datasetAndTransaction, 'transaction')) {
        return onDatasetAndTransactionFound('Transaction was not found.');
      }

      const {dataset: {_id: datasetId}, transaction: {createdAt: version}} = datasetAndTransaction;

      externalContext.datasetId = datasetId;
      externalContext.version = version;

      return onDatasetAndTransactionFound(null, externalContext);
    });
}

function getDocuments(externalContext, onDocumentsFound) {
  const {datasetId, version, query, collection} = externalContext;

  return repositoriesByCollection[collection].repo
    .currentVersion(datasetId, version)
    [repositoriesByCollection[collection].queryFn](query, (error, documents) => {
      if (error) {
        return onDocumentsFound(error);
      }

      externalContext.documents = documents;

      return onDocumentsFound(null, externalContext);
    });
}

function populateDocuments(externalContext, onDocumentsPopulated) {
  const {documents} = externalContext;

  return async.mapSeries(documents, (document, onPopulatedDocument) => {
    return populateDocument(document, externalContext, onPopulatedDocument);
  }, (error, populatedDocuments) => {
    if (error) {
      return onDocumentsPopulated(error);
    }

    externalContext.populatedDocuments = populatedDocuments;

    return onDocumentsPopulated(null, externalContext);
  });
}

function populateDocument(document, externalContext, onDocumentPopulated) {
  const {datasetId, version, collection} = externalContext;

  async.reduce(populatingPropertiesByCollection[collection], document, (memoDocument, [propertyName, subCollection], onPropertyPopulated: Function) => {
    const propertyValue = memoDocument[propertyName];
    const originIds = Array.isArray(propertyValue) ? propertyValue : [propertyValue];
    const query = {originId: {$in : originIds}};
    const context = {datasetId, version, query, collection: subCollection};

    if (_.isEmpty(propertyValue)) {
      return async.setImmediate(() => onPropertyPopulated(null, memoDocument));
    }

    return getDocuments(context, (error, result) => {
      if (error) {
        return onPropertyPopulated(error);
      }

      const {documents: foundedDocuments} = result;

      if (!Array.isArray(propertyValue)) {
        if (!foundedDocuments.length) {
          logger.error({obj: memoDocument}, 'Original document has reference to a document which wasn\'t found');
          return onPropertyPopulated('Original document has reference to a document which wasn\'t found');
        }

        if (foundedDocuments.length > 1) {
          logger.error({obj: memoDocument}, 'Original document has only one value, but returns from db more than one');
          return onPropertyPopulated('Original document has only one value, but returns from db more than one');
        }
      }

      memoDocument[propertyName] = Array.isArray(propertyValue) ? foundedDocuments : _.first(foundedDocuments);

      return onPropertyPopulated(null, memoDocument);
    });

  }, onDocumentPopulated);
}

export {
  getDocumentsByQuery
};
