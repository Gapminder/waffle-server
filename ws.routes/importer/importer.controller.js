'use strict';

var express = require('express');
var service = require('./importer.service');

module.exports = serviceLocator => {
  let app = serviceLocator.getApplication();
  var router = express.Router();

  /**
   * @swagger
   * definition:
   *  Concepts:
   *     type: object
   *     properties:
   *       concepts:
   *         type: string
   *         description:
   *       concepts.title:
   *         type: string
   *         description: Result will consist only human-readable name of the concept.
   *       concepts.gid:
   *         type: string
   *         description: Concept identificator.
   *       concepts.link:
   *         type: string
   *         description: Result will consist only url that points to concept definition and explanation.
   *       concepts.tooltip:
   *         type: string
   *         description: Result will consist only nice name for concept.
   *       concepts.tags:
   *         type: string
   *         description: Result will consist only additional information regarding concept with type measure.
   *
   *  Error:
   *    type: object
   *    properties:
   *      code:
   *        type: integer
   *        format: int32
   *      message:
   *        type: string
   */

  router.get('/api/importer/concepts', sendDataResponseConcepts());

  /**
   * @swagger
   * definition:
   *  DataPoints:
   *     type: object
   *     properties:
   *       data-points:
   *         type: string
   *         description:
   *       data-points.value:
   *         type: string
   *         description: Result will consist only data this DataPoint contains at the given coordinates.
   *       data-points.isNumeric:
   *         type: Boolean
   *         description: May contain some value of the measure.
   *       data-points.dimensions:
   *         type: Array
   *         description: May contain some objects that are define point for the data.
   *
   *  Error:
   *    type: object
   *    properties:
   *      code:
   *        type: integer
   *        format: int32
   *      message:
   *        type: string
   */

  router.get('/api/importer/data-points', sendDataResponseDataPoints());

  /**
   * @swagger
   * definition:
   *  DatasetTransactions:
   *     type: object
   *     properties:
   *       dataset-transactions:
   *         type: string
   *         description:
   *       dataset-transactions.name:
   *         type: string
   *         description: Result will consist only transaction's name (human readable).
   *       dataset-transactions.isClosed:
   *         type: string
   *         description: Result will consist only the transaction is finished successfull.
   *       dataset-transactions.createdBy:
   *         type: string
   *         description: Result will consist only this transaction's owner.
   *       dataset-transactions.createdAt:
   *         type: Date
   *         description: Result will consist only timestamp when this DatasetTransaction was created.
   *
   *  Error:
   *    type: object
   *    properties:
   *      code:
   *        type: integer
   *        format: int32
   *      message:
   *        type: string
   */

  router.get('/api/importer/dataset-transactions', sendDataResponseDatasetTransactions());

  /**
   * @swagger
   * definition:
   *  Datasets:
   *     type: object
   *     properties:
   *       datasets:
   *         type: string
   *         description:
   *       datasets.name:
   *         type: string
   *         description: Result will consist only unique data set `name` within Datasets space (human readable).
   *       datasets.type:
   *         type: string
   *         description: May contain github commit, local storage, etc.
   *       datasets.path:
   *         type: string
   *         description: Result will consist only path (url or local) to Data Set (if exists).
   *       datasets.commit:
   *         type: string
   *         description: Result will consist only hash of commit on remote repo (if exists).
   *       datasets.defaultLanguage:
   *         type: Object
   *         description: Result will consist only language for Translation collection.
   *       datasets.metadata:
   *         type: Object
   *         description: Result will consist any metadata related to Data Set.
   *       datasets.isLocked:
   *         type: Boolean
   *         description: Result will consist question - is this DataSet locked for adding new versions?
   *       datasets.lockedBy:
   *         type: string
   *         description: Result will consist only name of user who locked this Data Set.
   *       datasets.lockedAt:
   *         type: Date
   *         description: Result will consist only timestamp when this Dataset was locked.
   *       datasets.createdAt:
   *         type: Date
   *         description: Result will consist only timestamp when this Dataset was created.
   *
   *  Error:
   *    type: object
   *    properties:
   *      code:
   *        type: integer
   *        format: int32
   *      message:
   *        type: string
   */

  router.get('/api/importer/datasets', sendDataResponseDatasets());

  /**
   * @swagger
   * definition:
   *  Entities:
   *     type: object
   *     properties:
   *       entities:
   *         type: string
   *         description:
   *       entities.gid:
   *         type: string
   *         description: May contain some entity value.
   *       entities.originId:
   *         type: string
   *         description: Result will consist only reference id to origin concept.
   *       entities.title:
   *         type: string
   *         description: Result will consist only nice name for entity.
   *       entities.sources:
   *         type: Array
   *         description: Result will consist only filenames of source item.
   *       entities.isOwnParent:
   *         type: Boolean
   *         description: Result will consist only indicator that this entity is its own parent.
   *       entities.properties:
   *         type: Object
   *         description: Result will consist all properties from data set.
   *       entities.domain:
   *         type: string
   *         description: Result will consist only one entity domain from Concepts collection.
   *       entities.sets:
   *         type: Array
   *         description: Result will consist sets in which entity takes part of
   *       entities.drillups:
   *         type: Array
   *         description: Result will consist only drillups - to higher authorities (entity).
   *
   *  Error:
   *    type: object
   *    properties:
   *      code:
   *        type: integer
   *        format: int32
   *      message:
   *        type: string
   */

  router.get('/api/importer/entities', sendDataResponseEntities());
  return app.use(router);
};

function sendDataResponseConcepts() {
  return (req, res) => {
    service.getConcepts(req.query, function (err, result) {
      if (err) {
        return res.json({success: !err, error: err});
      }

      return res.json(result);
    });
  };
}

function sendDataResponseDataPoints() {
  return (req, res) => {
    service.getDataPoints(req.query, function (err, result) {
      if (err) {
        return res.json({success: !err, error: err});
      }

      return res.json(result);
    });
  };
}

function sendDataResponseDatasetTransactions() {
  return (req, res) => {
    service.getDatasetTransactions(req.query, function (err, result) {
      if (err) {
        return res.json({success: !err, error: err});
      }

      return res.json(result);
    });
  };
}

function sendDataResponseDatasets() {
  return (req, res) => {
    service.getDatasets(req.query, function (err, result) {
      if (err) {
        return res.json({success: !err, error: err});
      }

      return res.json(result);
    });
  };
}

function sendDataResponseEntities() {
  return (req, res) => {
    service.getEntities(req.query, function (err, result) {
      if (err) {
        return res.json({success: !err, error: err});
      }

      return res.json(result);
    });
  };
}
