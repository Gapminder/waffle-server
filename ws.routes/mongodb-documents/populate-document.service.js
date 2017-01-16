'use strict';

const mongoose = require('mongoose');
const async = require('async');
const _ = require('lodash');

const Concepts = mongoose.model('Concepts');
const DataPoints = mongoose.model('DataPoints');
const Entities = mongoose.model('Entities');

const conceptsRepositoryFactory = require('../../ws.repository/ddf/concepts/concepts.repository');
const datapointsRepositoryFactory = require('../../ws.repository/ddf/data-points/data-points.repository');
const entitiesRepositoryFactory = require('../../ws.repository/ddf/entities/entities.repository');
const datasetTransactionService = require('../../ws.services/dataset-transactions.service');

module.exports = {
  getPopulateDocumentByQuery
};

const objectIdsProperties = [
  ['domain', 'Concepts'],
  ['sets', 'Concepts'],
  ['measure', 'Concepts'],
  ['dimensionsConcepts', 'Concepts'],
  ['dimensions', 'Entities']
];

function getPopulateDocumentByQuery(externalContext, onFound) {

  const {collection} = externalContext;


  if (collection === 'Concepts') {
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

  if (collection === 'Datapoints') {
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


  if (collection === 'Entities') {
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
        return onFound(error);
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
        return onFound(error);
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
        return onFound(error);
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
      return error;
    }

    return onFound(null, populatedDocuments);
  });
}

function getAllPopulatedDocuments(externalContext, done) {
  let {key, value, document} = externalContext;

  async.reduce(document, {}, (key, document, callback) => {
    return getDocumentProperties(key, externalContext, done)
  })
}

function getDocumentProperties(key, externalContext, done) {
  let {datasetId, version, objectIds} = externalContext;


  if (objectIdsProperties[value] === 'Concepts') {
    conceptsRepositoryFactory
      .currentVersion(datasetId, version)
      .findConceptsByQuery({'originId': {$in: objectIds}}, (error, documentFromConceptsCollection) => {

        return done(null, documentFromConceptsCollection);
      })
  }

  if (objectIdsProperties[value] === 'Entities') {
    entitiesRepositoryFactory
      .currentVersion(datasetId, version)
      .findEntityPropertiesByQuery({'originId': {$in: objectIds}}, (error, documentFromEntitiesCollection) => {

        return done(null, documentFromEntitiesCollection);
      })
  }

}
