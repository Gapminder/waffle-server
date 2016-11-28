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

const objectIdsProperties = {
  concepts: {
    domain: 'Concepts'
  },
  entities: {
    domain: 'Concepts',
    sets: 'Concepts'
  },
  datapoints: {
    measure: 'Concepts',
    dimensionsConcepts: 'Concepts',
    dimensions: 'Entities'
  }
};

function getPopulateDocumentByQuery(options, onFound) {
  return datasetTransactionService.findDefaultDatasetAndTransaction(options.dataset, options.version, (error, datasetAndTransaction) => {
    if (error || !datasetAndTransaction) {
      return onFound(error || `Dataset was not found: ${options.dataset}`);
    }

    const {dataset: {_id: datasetId}, transaction: {createdAt: version}} = datasetAndTransaction;

    if (options.collection === 'concepts') {
      return conceptsRepositoryFactory.currentVersion(datasetId, version)
        .findConceptsByQuery(options.query, (error, conceptsDocuments) => {

          if (error) {
            return onFound(error);
          }
          return getPopulateDocument(options, conceptsDocuments, datasetId, version, onFound);
        });
    }

    if (options.collection === 'datapoints') {
      return datapointsRepositoryFactory.currentVersion(datasetId, version)
        .findByQuery(options.query, (error, dataPointsDocuments) => {

          if (error) {
            return onFound(error);
          }
          return getPopulateDocument(options, dataPointsDocuments, datasetId, version, onFound);
        })
    }

    if (options.collection === 'entities') {
      return entitiesRepositoryFactory.currentVersion(datasetId, version)
        .findEntityPropertiesByQuery(options.query, (error, entitiesDocuments) => {

          if (error) {
            return onFound(error);
          }
          return getPopulateDocument(options, entitiesDocuments, datasetId, version, onFound);
        })
    }
  })
}

function getPopulateDocument(options, documents, datasetId, version, onFound) {
  async.map(documents, (document, done) => {

    return getAllPopulatedDocuments(options, document, datasetId, version, done);

  }, (error, populatedDocuments) => {
    if (error) {
      return error;
    }

    return onFound(null, populatedDocuments);
  });
}

function getDocumentProperty(datasetId, version, objectIds, collection, done) {
  async.parallel([
    (callback) => {
      let repository = conceptsRepositoryFactory.currentVersion(datasetId, version);

      objectIds = Array.isArray(objectIds) ? objectIds : [objectIds];

      return repository.findConceptsByQuery({'originId': {$in: objectIds}}, (error, documentFromConceptsCollection) => {
        callback(null, documentFromConceptsCollection);
      })
    },
    (callback) => {

      if (collection === 'datapoints') {
        let repository = entitiesRepositoryFactory.currentVersion(datasetId, version);

        objectIds = Array.isArray(objectIds) ? objectIds : [objectIds];

        return repository.findEntityPropertiesByQuery({'originId': {$in: objectIds}}, (error, documentFromEntitiesCollection) => {
          callback(null, documentFromEntitiesCollection);
        })
      }
      callback()
    }
  ], (error, result) => {
    return done(null, result);
  });
}

function getAllPopulatedDocuments(options, document, datasetId, version, done) {
  const populated = {};

  async.forEachOf(document, (value, key, callback) => {
    let collectionToSearchObjectId = objectIdsProperties[options.collection][key];

    if (collectionToSearchObjectId) {
      return getDocumentProperty(datasetId, version, document[key], options.collection, (error, populatedProperty) => {
        populated[key] = populatedProperty;
        return callback(null, populated);
      });
    }

    callback();

  }, (error) => {
    if (error) {
      return error;
    }

    return done(null, _.extend(document, populated));
  });
}

