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
   *    description: Concepts-properties
   *    produces:
   *      - application/json
   *      - text/csv
   *    parameters:
   *      - name: select
   *        in: query
   *        description:
   *        type: string
   *      - name: where
   *        in: query
   *        description:
   *        type: string
   */

  router.get('/api/importer/concepts', sendDataResponse('Concepts'));

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
   *    description: DataPoint-properties
   *    produces:
   *      - application/json
   *      - text/csv
   *    parameters:
   *      - name: select
   *        in: query
   *        description:
   *        type: string
   *      - name: where
   *        in: query
   *        description:
   *        type: string
   */

  router.get('/api/importer/dataPoints', sendDataResponse('DataPoint'));

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
   *    description: DatasetTransactions-properties
   *    produces:
   *      - application/json
   *      - text/csv
   *    parameters:
   *      - name: select
   *        in: query
   *        description:
   *        type: string
   *      - name: where
   *        in: query
   *        description:
   *        type: string
   */

  router.get('/api/importer/dataSetTransactions', sendDataResponse('DatasetTransactions'));

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
   *    description: Datasets-properties
   *    produces:
   *      - application/json
   *      - text/csv
   *    parameters:
   *      - name: select
   *        in: query
   *        description:
   *        type: string
   *      - name: where
   *        in: query
   *        description:
   *        type: string
   */

  router.get('/api/importer/dataSets', sendDataResponse('Datasets'));

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
   *    description: Entities-properties
   *    produces:
   *      - application/json
   *      - text/csv
   *    parameters:
   *      - name: select
   *        in: query
   *        description:
   *        type: string
   *      - name: where
   *        in: query
   *        description:
   *        type: string
   */

  router.get('/api/importer/entities', sendDataResponse('Entities'));

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
   *    description: OriginalEntities-properties
   *    produces:
   *      - application/json
   *      - text/csv
   *    parameters:
   *      - name: select
   *        in: query
   *        description:
   *        type: string
   *      - name: where
   *        in: query
   *        description:
   *        type: string
   */

  router.get('/api/importer/originalEntities', sendDataResponse('OriginalEntities'));
  return app.use(router);
};

function sendDataResponse(modelName) {
  return (req, res) => {
    service['get' + modelName](req.query, function (err, result) {
      if (err) {
        return res.json({success: !err, error: err});
      }

      return res.json(result);
    });
  };
}
