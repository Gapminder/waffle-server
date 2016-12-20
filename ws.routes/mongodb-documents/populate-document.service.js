'use strict';

const mongoose = require('mongoose');
const async = require('async');

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

function getPopulateDocumentByQuery(options, onFound) {

  if (options.collection) {
    return datasetTransactionService.findDefaultDatasetAndTransaction(options.datasetName, options.version, (error, result) => {
      if (error || !result) {
        return onFound(error || `Dataset was not found: ${options.datasetName}`);
      }

      if (mongoose.model(options.collection) === Concepts) {
        return conceptsRepositoryFactory.currentVersion(result.dataset._id, result.transaction.createdAt)
          .findConceptsByQuery(options.query, (error, conceptsDocuments) => {

            if (error) {
              return onFound(error);
            }

            async.reduce(conceptsDocuments, 0, function (previousDocument, currentDocument, done) {

              return conceptsRepositoryFactory.versionAgnostic()
                .findConceptsByQuery({
                  "originId": `${currentDocument.originId}`
                }, (error, documentsByOriginId) => {

                  if (error) {
                    return onFound(error);
                  }

                  currentDocument.completedVersions = documentsByOriginId;

                  done(null, currentDocument);

                })
            }, getAllDocuments);
          })
      }

      if (mongoose.model(options.collection) === DataPoints) {
        return datapointsRepositoryFactory.currentVersion(result.dataset._id, result.transaction.createdAt)
          .findByQuery(options.query, (error, dataPointsDocuments) => {

            if (error) {
              return onFound(error);
            }

            async.reduce(dataPointsDocuments, 0, function (previousDocument, currentDocument, done) {

              return datapointsRepositoryFactory.versionAgnostic()
                .findByQuery({
                  "originId": `${currentDocument.originId}`
                }, (error, documentsByOriginId) => {

                  if (error) {
                    return onFound(error);
                  }

                  currentDocument.completedVersions = documentsByOriginId;

                  done(null, currentDocument);

                })
            }, getAllDocuments);
          })
      }

      if (mongoose.model(options.collection) === Entities) {
        return entitiesRepositoryFactory.currentVersion(result.dataset._id, result.transaction.createdAt)
          .findEntityPropertiesByQuery(options.query, (error, entitiesDocuments) => {

            if (error) {
              return onFound(error);
            }

            async.reduce(entitiesDocuments, 0, function (previousDocument, currentDocument, done) {

              return entitiesRepositoryFactory.versionAgnostic()
                .findEntityPropertiesByQuery({
                  "originId": `${currentDocument.originId}`
                }, (error, documentsByOriginId) => {

                  if (error) {
                    return onFound(error);
                  }

                  currentDocument.completedVersions = documentsByOriginId;

                  done(null, currentDocument);

                })
            }, getAllDocuments);
          })
      }
    })
  }

  if (!options.collection) {
    return datasetTransactionService.findDefaultDatasetAndTransaction(options.datasetName, options.version, (error, result) => {
      if (error || !result) {
        return onFound(error || `Dataset was not found: ${options.datasetName}`);
      }

      return findAllDocuments(result);

      function findAllDocuments(params) {
        return async.waterfall([
          async.constant(params),
          findInConcepts,
          findInDataPoints,
          findInEntities
        ], (error, pipe) => {
          if (error) {
            return onFound(error);
          }
          return onFound(null, pipe);
        });
      }

      function findInConcepts(pipe, done) {
        return conceptsRepositoryFactory.currentVersion(pipe.dataset._id, pipe.transaction.createdAt)
          .findConceptsByQuery(options.query, (error, conceptsDocuments) => {

            if (conceptsDocuments.length === 0) {
              return done(error, pipe);
            }

            async.reduce(conceptsDocuments, 0, function (previousDocument, currentDocument, cb) {

              return conceptsRepositoryFactory.versionAgnostic()
                .findConceptsByQuery({
                  "originId": `${currentDocument.originId}`
                }, (error, documentsByOriginId) => {

                  if (error) {
                    return onFound(error);
                  }

                  currentDocument.completedVersions = documentsByOriginId;

                  pipe.concepts = currentDocument;

                  return cb(null, pipe)
                })

            }, function (error, result) {
              return done(null, result);
            })
          })
      }

      function findInDataPoints(pipe, done) {
        datapointsRepositoryFactory.currentVersion(pipe.dataset._id, pipe.transaction.createdAt)
          .findByQuery(options.query, (error, dataPointsDocuments) => {

            if (dataPointsDocuments.length === 0) {
              return done(error, pipe);
            }

            async.reduce(dataPointsDocuments, 0, function (previousDocument, currentDocument, cb) {

              return datapointsRepositoryFactory.versionAgnostic()
                .findByQuery({
                  "originId": `${currentDocument.originId}`
                }, (error, documentsByOriginId) => {

                  if (error) {
                    return onFound(error);
                  }

                  currentDocument.completedVersions = documentsByOriginId;

                  pipe.dataPoints = currentDocument;

                  cb(null, pipe)
                })

            }, function (error, result) {
              return done(null, result);
            })
          })
      }

      function findInEntities(pipe, done) {
        entitiesRepositoryFactory.currentVersion(pipe.dataset._id, pipe.transaction.createdAt)
          .findEntityPropertiesByQuery(options.query, (error, entitiesDocuments) => {

            if (entitiesDocuments.length === 0) {
              return done(error, pipe);
            }

            async.reduce(entitiesDocuments, 0, function (previousDocument, currentDocument, cb) {

              return entitiesRepositoryFactory.versionAgnostic()
                .findEntityPropertiesByQuery({
                  "originId": `${currentDocument.originId}`
                }, (error, documentsByOriginId) => {

                  if (error) {
                    return onFound(error);
                  }

                  currentDocument.completedVersions = documentsByOriginId;

                  pipe.entities = currentDocument;

                  return cb(null, pipe)
                })

            }, function (error, result) {
              return done(null, result);
            })
          });
      }
    })
  }


  function getAllDocuments(error, allDocuments) {

    if (error) {
      return onFound(error);
    }

    return onFound(null, allDocuments);
  }
}

