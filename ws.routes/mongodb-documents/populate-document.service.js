'use strict';

const mongoose = require('mongoose');
const async = require('async');

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
        return onFound(error)
      }

      return onFound(null, populatedDocuments);
    })
}

function findDatasetAndTransaction(externalContext, onFound) {
  let {datasetName, commit} = externalContext;

  return datasetTransactionService
    .findDefaultDatasetAndTransaction(datasetName, commit, (error, datasetAndTransaction) => {
      if (error || !datasetAndTransaction) {
        return onFound(error);
      }

      const {dataset: {_id: datasetId}, transaction: {createdAt: version}} = datasetAndTransaction;

      const internalContext = {};
      internalContext.datasetId = datasetId;
      internalContext.version = version;
      internalContext.externalContext = externalContext;


      return onFound(null, internalContext);
    })
}

function getConceptsDocuments(internalContext, onFound) {
  let {datasetId, version, externalContext: {queryToCollections: query}} = internalContext;

  return conceptsRepositoryFactory
    .currentVersion(datasetId, version)
    .findConceptsByQuery(query, (error, conceptsDocuments) => {
      if (error) {
        return onFound(error);
      }

      internalContext.documents = conceptsDocuments;

      return onFound(null, internalContext);
    });
}

function getDataPointsDocuments(internalContext, onFound) {
  let {datasetId, version, externalContext: {queryToCollections: query}} = internalContext;

  return datapointsRepositoryFactory
    .currentVersion(datasetId, version)
    .findByQuery(query, (error, dataPointsDocuments) => {
      if (error) {
        return onFound(error)
      }

      internalContext.documents = dataPointsDocuments;

      return onFound(null, internalContext);
    });
}

function getEntitiesDocuments(internalContext, onFound) {
  let {datasetId, version, externalContext: {queryToCollections: query}} = internalContext;

  return entitiesRepositoryFactory
    .currentVersion(datasetId, version)
    .findEntityPropertiesByQuery(query, (error, entitiesDocuments) => {

      if (error) {
        return onFound(error);
      }

      internalContext.documents = entitiesDocuments;
      return onFound(null, internalContext);
    });
}

function mapDocuments(internalContext, onFound) {
  let {documents} = internalContext;

  async.map(documents, (document, done) => {
    internalContext.document = document;

    return getAllPopulatedDocuments(internalContext, done);
  }, (error, populatedDocuments) => {
    if (error) {
      return onFound(error);
    }

    return onFound(null, populatedDocuments);
  });
}

function getAllPopulatedDocuments(internalContext, onFound) {
  let {document, externalContext: {collection: collection}} = internalContext;

  async.reduce(objectIdsProperties[collection], document, (originalDocument, propertyContext, callback) => {
    const key = propertyContext[0];
    const subCollection = propertyContext[1];

    return getDocumentProperties(originalDocument[key], subCollection, internalContext, (error, properties) => {

        originalDocument[key] = properties.length >1 ? properties : properties[0];

      return callback(null, originalDocument);
    });

  }, (error, populatedDocument) => {
    if (error) {
      return onFound(error);
    }
    return onFound(null, populatedDocument);
  })
}

function getDocumentProperties(objectIds, subCollection, internalContext, done) {
  let {datasetId, version} = internalContext;

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


