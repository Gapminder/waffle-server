'use strict';

var express = require('express');
var service = require('./import.service');

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
   *       title:
   *         type: string
   *         description: Result will consist only human-readable name of the concept.
   *       gid:
   *         type: string
   *         description: Concept identificator.
   *       link:
   *         type: string
   *         description: Result will consist only url that points to concept definition and explanation.
   *       tooltip:
   *         type: string
   *         description: Result will consist only nice name for concept.
   *       tags:
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

  router.get('/api/importer/concepts', sendDataResponseConcepts);

  /**
   * @swagger
   * definition:
   *  DataPoints:
   *     type: object
   *     properties:
   *       _id:
   *         type: string
   *         description: Result will consist only origin ID
   *       value:
   *         type: string
   *         description: Result will consist only data this DataPoint contains at the given coordinates.
   *       isNumeric:
   *         type: Boolean
   *         description: May contain some value of the measure.
   *       dimensions:
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

  router.get('/api/importer/data-points', sendDataResponseDataPoints);

  /**
   * @swagger
   * definition:
   *  DatasetTransactions:
   *     type: object
   *     properties:
   *       dataset-transactions:
   *         type: string
   *         description:
   *       name:
   *         type: string
   *         description: Result will consist only transaction's name (human readable).
   *       isClosed:
   *         type: string
   *         description: Result will consist only the transaction is finished successfull.
   *       createdBy:
   *         type: string
   *         description: Result will consist only this transaction's owner.
   *       createdAt:
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

  router.get('/api/importer/dataset-transactions', sendDataResponseDatasetTransactions);

  /**
   * @swagger
   * definition:
   *  Datasets:
   *     type: object
   *     properties:
   *       datasets:
   *         type: string
   *         description:
   *       name:
   *         type: string
   *         description: Result will consist only unique data set `name` within Datasets space (human readable).
   *       type:
   *         type: string
   *         description: May contain github commit, local storage, etc.
   *       path:
   *         type: string
   *         description: Result will consist only path (url or local) to Data Set (if exists).
   *       commit:
   *         type: string
   *         description: Result will consist only hash of commit on remote repo (if exists).
   *       defaultLanguage:
   *         type: Object
   *         description: Result will consist only language for Translation collection.
   *       metadata:
   *         type: Object
   *         description: Result will consist any metadata related to Data Set.
   *       isLocked:
   *         type: Boolean
   *         description: Result will consist question - is this DataSet locked for adding new versions?
   *       lockedBy:
   *         type: string
   *         description: Result will consist only name of user who locked this Data Set.
   *       lockedAt:
   *         type: Date
   *         description: Result will consist only timestamp when this Dataset was locked.
   *       createdAt:
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

  router.get('/api/importer/datasets', sendDataResponseDatasets);

  /**
   * @swagger
   * definition:
   *  Entities:
   *     type: object
   *     properties:
   *       entities:
   *         type: string
   *         description:
   *       gid:
   *         type: string
   *         description: May contain some entity value.
   *       originId:
   *         type: string
   *         description: Result will consist only reference id to origin concept.
   *       title:
   *         type: string
   *         description: Result will consist only nice name for entity.
   *       sources:
   *         type: Array
   *         description: Result will consist only filenames of source item.
   *       isOwnParent:
   *         type: Boolean
   *         description: Result will consist only indicator that this entity is its own parent.
   *       properties:
   *         type: Object
   *         description: Result will consist all properties from data set.
   *       domain:
   *         type: string
   *         description: Result will consist only one entity domain from Concepts collection.
   *       sets:
   *         type: Array
   *         description: Result will consist sets in which entity takes part of
   *       drillups:
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

  router.get('/api/importer/entities', sendDataResponseEntities);
  return app.use(router);
};

function sendDataResponseConcepts(req, res) {
  service.getConcepts(req.query, function (err, result) {
    if (err) {
      return res.json({success: !err, error: err});
    }
    res.json(result);
  });
}

function sendDataResponseDataPoints(req, res) {
  service.getDataPoints(req.query, function (err, result) {
    if (err) {
      return res.json({success: !err, error: err});
    }
    res.json(result);
  });
}

function sendDataResponseDatasetTransactions(req, res) {
  service.getDatasetTransactions(req.query, function (err, result) {
    if (err) {
      return res.json({success: !err, error: err});
    }
    res.json(result);
  });
}

function sendDataResponseDatasets(req, res) {
  service.getDatasets(req.query, function (err, result) {
    if (err) {
      return res.json({success: !err, error: err});
    }
    res.json(result);
  });
}

function sendDataResponseEntities(req, res) {
  service.getEntities(req.query, function (err, result) {
    if (err) {
      return res.json({success: !err, error: err});
    }
    res.json(result);
  });
}
