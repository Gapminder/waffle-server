'use strict';

const mongoose = require('mongoose');
const async = require('async');
const logger = require('../../ws.config/log');

const conceptsRepositoryFactory = require('../../ws.repository/ddf/concepts/concepts.repository');
const datapointsRepositoryFactory = require('../../ws.repository/ddf/data-points/data-points.repository');
const entitiesRepositoryFactory = require('../../ws.repository/ddf/entities/entities.repository');
const datasetTransactionService = require('../../ws.services/dataset-transactions.service');

module.exports = {
  getPopulateDocumentByQuery
};
const objectIdsProperties = {
  concepts: [
    ['domain', 'Concepts']
  ],
  entities: [
    ['domain', 'Concepts'],
    ['sets', 'Concepts']
  ],
  datapoints: [
    ['measure', 'Concepts'],
    ['dimensionsConcepts', 'Concepts'],
    ['dimensions', 'Entities']
  ]
};

function getPopulateDocumentByQuery(externalContext, onFound) {

  const {collection} = externalContext;

  let commonFunctions = [
    async.constant(externalContext),
    findDatasetAndTransaction,
  ];

  if (collection === 'concepts') {
    commonFunctions.push(getConceptsDocuments, mapDocuments);
  }

  if (collection === 'datapoints') {
    commonFunctions.push(getDataPointsDocuments, mapDocuments);
  }

  if (collection === 'entities') {
    commonFunctions.push(getEntitiesDocuments, mapDocuments);
  }

  return async.waterfall(
    commonFunctions,
    (error, populatedDocuments) => {
      if (error) {
        return logger.error('Query was not correct!');
      }

      return onFound(null, populatedDocuments);
    })
}

function findDatasetAndTransaction(external, onFound) {
  let {datasetName, commit} = external;

  return datasetTransactionService
    .findDefaultDatasetAndTransaction(datasetName, commit, (error, datasetAndTransaction) => {
      if (error || !datasetAndTransaction) {
        return onFound(error || `Dataset was not found: ${datasetName}`);
      }

      const {dataset: {_id: datasetId}, transaction: {createdAt: version}} = datasetAndTransaction;

      external.datasetId = datasetId;
      external.version = version;

      return onFound(null, external);
    })
}

function getConceptsDocuments(external, onFound) {
  let {datasetId, version, queryToCollections} = external;

  return conceptsRepositoryFactory
    .currentVersion(datasetId, version)
    .findConceptsByQuery(queryToCollections, (error, conceptsDocuments) => {
      if (error) {
        logger.error('Concepts documents was not found by given query', queryToCollections);
        return onFound(error)
      }

      external.documents = conceptsDocuments;

      return onFound(null, external);
    });
}

function getDataPointsDocuments(external, onFound) {
  let {datasetId, version, queryToCollections} = external;

  return datapointsRepositoryFactory
    .currentVersion(datasetId, version)
    .findByQuery(queryToCollections, (error, dataPointsDocuments) => {
      if (error) {
        logger.error('DataPoints documents was not found by given query', queryToCollections);
        return onFound(error)
      }

      external.documents = dataPointsDocuments;

      return onFound(null, external);
    });
}

function getEntitiesDocuments(external, onFound) {
  let {datasetId, version, queryToCollections} = external;

  return entitiesRepositoryFactory
    .currentVersion(datasetId, version)
    .findEntityPropertiesByQuery(queryToCollections, (error, entitiesDocuments) => {

      if (error) {
        logger.error('Entities documents was not found by given query', queryToCollections);
        return onFound(error);
      }

      external.documents = entitiesDocuments;
      return onFound(null, external);
    });
}

function mapDocuments(external, onFound) {
  let {documents} = external;

  async.map(documents, (document, done) => {
    external.document = document;

    return getAllPopulatedDocuments(external, done);
  }, (error, populatedDocuments) => {
    if (error) {
      return onFound(error);
    }

    return onFound(null, populatedDocuments);
  });
}

function getAllPopulatedDocuments(external, onFound) {
  let {document, collection} = external;

  async.reduce(objectIdsProperties[collection], document, (originalDocument, propertyContext, callback) => {
    const key = propertyContext[0];
    const subCollection = propertyContext[1];

    return getDocumentProperties(originalDocument[key], subCollection, external, (error, properties) => {
      originalDocument[key] = properties;
      return callback(null, originalDocument);
    });

  }, (error, populatedDocument) => {
    if (error) {
      return onFound(error);
    }
    return onFound(null, populatedDocument);
  })
}

function getDocumentProperties(objectIds, subCollection, external, done) {
  let {datasetId, version} = external;

  objectIds = Array.isArray(objectIds) ? objectIds : [objectIds];

  if (subCollection === 'Concepts') {
    conceptsRepositoryFactory
      .currentVersion(datasetId, version)
      .findConceptsByQuery({'originId': {$in: objectIds}}, (error, documentFromConceptsCollection) => {
        return done(null, documentFromConceptsCollection);
      })
  }

  if (subCollection === 'Entities') {
    entitiesRepositoryFactory
      .currentVersion(datasetId, version)
      .findEntityPropertiesByQuery({'originId': {$in: objectIds}}, (error, documentFromEntitiesCollection) => {
        return done(null, documentFromEntitiesCollection);
      })
  }
}


