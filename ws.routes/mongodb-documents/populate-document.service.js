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

  if (collection === 'concepts') {
    async.waterfall([
      async.constant(externalContext),
      findDatasetAndTransaction,
      getConceptsDocuments,
      mapDocuments
    ], (err, populatedDocuments) => {
      if (err) {
        return logger.error('Query was not correct!');
      }

      return onFound(null, populatedDocuments);
    })
  }

  if (collection === 'datapoints') {

    async.waterfall([
      async.constant(externalContext),
      findDatasetAndTransaction,
      getDataPointsDocuments,
      mapDocuments
    ], (err, populatedDocuments) => {
      if (err) {
        return logger.error('Query was not correct!');
      }

      return onFound(null, populatedDocuments);
    })
  }

  if (collection === 'entities') {
    async.waterfall([
      async.constant(externalContext),
      findDatasetAndTransaction,
      getEntitiesDocuments,
      mapDocuments
    ], (err, populatedDocuments) => {
      if (err) {
        return logger.error('Query was not correct!');
      }

      return onFound(null, populatedDocuments);
    })
  }

}

function findDatasetAndTransaction(externalContext, onFound) {
  let {datasetName, commit} = externalContext;

  return datasetTransactionService
    .findDefaultDatasetAndTransaction(datasetName, commit, (error, datasetAndTransaction) => {
      if (error || !datasetAndTransaction) {
        return onFound(error || `Dataset was not found: ${datasetName}`);
      }

      const {dataset: {_id: datasetId}, transaction: {createdAt: version}} = datasetAndTransaction;

      externalContext.datasetId = datasetId;
      externalContext.version = version;

      return onFound(null, externalContext);
    })
}

function getConceptsDocuments(externalContext, onFound) {
  let {datasetId, version, queryToCollections} = externalContext;

  return conceptsRepositoryFactory
    .currentVersion(datasetId, version)
    .findConceptsByQuery(queryToCollections, (error, conceptsDocuments) => {
      if (error) {
        return onFound(error || `Documents was not found`);
      }

      externalContext.documents = conceptsDocuments;

      return onFound(null, externalContext);
    });
}

function getDataPointsDocuments(externalContext, onFound) {
  let {datasetId, version, queryToCollections} = externalContext;

  return datapointsRepositoryFactory
    .currentVersion(datasetId, version)
    .findByQuery(queryToCollections, (error, dataPointsDocuments) => {
      if (error) {
        return onFound(error || `Documents was not found`);
      }

      externalContext.documents = dataPointsDocuments;

      return onFound(null, externalContext);
    });
}

function getEntitiesDocuments(externalContext, onFound) {
  let {datasetId, version, queryToCollections} = externalContext;

  return entitiesRepositoryFactory
    .currentVersion(datasetId, version)
    .findEntityPropertiesByQuery(queryToCollections, (error, entitiesDocuments) => {

      if (error) {
        return onFound(error || `Documents was not found`);
      }

      externalContext.documents = entitiesDocuments;
      return onFound(null, externalContext);
    });
}

function mapDocuments(externalContext, onFound) {
  let {documents} = externalContext;

  async.map(documents, (document, done) => {
    externalContext.document = document;

    return getAllPopulatedDocuments(externalContext, done);
  }, (error, populatedDocuments) => {
    if (error) {
      return onFound(error || `Documents was not found`);
    }

    return onFound(null, populatedDocuments);
  });
}

function getAllPopulatedDocuments(externalContext, onFound) {
  let {document, collection} = externalContext;

  async.reduce(objectIdsProperties[collection], document, (originalDocument, propertyContext, callback) => {
    const key = propertyContext[0];
    const subCollection = propertyContext[1];

    return getDocumentProperties(originalDocument[key], subCollection, externalContext, (error, properties) => {
      properties = Array.isArray(properties) ? properties : [properties];
      originalDocument[key] = properties;
      return callback(null, originalDocument);
    });

  }, (error, populatedDocument) => {
    if (error) {
      return logger.error('Wrong query!');
    }
    return onFound(null, populatedDocument);
  })
}

function getDocumentProperties(objectIds, subCollection, externalContext, done) {
  let {datasetId, version} = externalContext;

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


