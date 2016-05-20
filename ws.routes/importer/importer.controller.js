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
   *    type: object
   *    properties:
   *      concepts:
   *        type: string
   *        description: model with params in data base
   *  Error:
   *    type: object
   *    properties:
   *      code:
   *        type: integer
   *        format: int32
   *      message:
   *        type: string
   *   /api/importer/concepts:
   *  get:
   *    description: Concepts
   *    produces:
   *      - application/json
   *      - text/csv
   *    parameters:
   *      - name: concepts
   *        in: query
   *        description:
   *        type: string
   */

  router.get('/api/importer/concepts', sendDataResponseConcepts());

  /**
   * @swagger
   * definition:
   *  DataPoint:
   *    type: object
   *    properties:
   *      dataPoints:
   *        type: string
   *        description: model with params in data base
   *  Error:
   *    type: object
   *    properties:
   *      code:
   *        type: integer
   *        format: int32
   *      message:
   *        type: string
   *   /api/importer/datapoint:
   *  get:
   *    description: DataPoint
   *    produces:
   *      - application/json
   *      - text/csv
   *    parameters:
   *      - name: dataPoints
   *        in: query
   *        description:
   *        type: string
   */

  router.get('/api/importer/dataPoints', sendDataResponseDataPoints());

  /**
   * @swagger
   * definition:
   *  DatasetTransactions:
   *    type: object
   *    properties:
   *      dataSetTransactions:
   *        type: string
   *        description: model with params in data base
   *  Error:
   *    type: object
   *    properties:
   *      code:
   *        type: integer
   *        format: int32
   *      message:
   *        type: string
   *   /api/importer/dataSetTransactions:
   *  get:
   *    description: DatasetTransactions
   *    produces:
   *      - application/json
   *      - text/csv
   *    parameters:
   *      - name: dataSetTransactions
   *        in: query
   *        description:
   *        type: string
   */

  router.get('/api/importer/dataSetTransactions', sendDataResponseDatasetTransactions());

  /**
   * @swagger
   * definition:
   *  Datasets:
   *    type: object
   *    properties:
   *      dataSets:
   *        type: string
   *        description: model with params in data base
   *  Error:
   *    type: object
   *    properties:
   *      code:
   *        type: integer
   *        format: int32
   *      message:
   *        type: string
   *   /api/importer/dataSets:
   *  get:
   *    description: Datasets
   *    produces:
   *      - application/json
   *      - text/csv
   *    parameters:
   *      - name: dataSets
   *        in: query
   *        description:
   *        type: string
   */

  router.get('/api/importer/dataSets', sendDataResponseDatasets());

  /**
   * @swagger
   * definition:
   *  Entities:
   *    type: object
   *    properties:
   *      entities:
   *        type: string
   *        description: model with params in data base
   *  Error:
   *    type: object
   *    properties:
   *      code:
   *        type: integer
   *        format: int32
   *      message:
   *        type: string
   *   /api/importer/entities:
   *  get:
   *    description: Entities
   *    produces:
   *      - application/json
   *      - text/csv
   *    parameters:
   *      - name: entities
   *        in: query
   *        description:
   *        type: string
   */

  router.get('/api/importer/entities', sendDataResponseEntities());

  /**
   * @swagger
   * definition:
   *  OriginalEntities:
   *    type: object
   *    properties:
   *      originalEntities:
   *        type: string
   *        description: model with params in data base
   *  Error:
   *    type: object
   *    properties:
   *      code:
   *        type: integer
   *        format: int32
   *      message:
   *        type: string
   *   /api/importer/originalEntities:
   *  get:
   *    description: OriginalEntities
   *    produces:
   *      - application/json
   *      - text/csv
   *    parameters:
   *      - name: originalEntities
   *        in: query
   *        description:
   *        type: string
   */

  router.get('/api/importer/originalEntities', sendDataResponseOriginalEntities());
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

function sendDataResponseOriginalEntities() {
  return (req, res) => {
    service.getOriginalEntities(req.query, function (err, result) {
      if (err) {
        return res.json({success: !err, error: err});
      }

      return res.json(result);
    });
  };
}
