'use strict';

const cors = require('cors');
const express = require('express');
const compression = require('compression');
const _ = require('lodash');

const reposService = require('../import/repos.service');
const service = require('./demo.service');
const decodeQuery = require('../../utils').decodeQuery;

/**
 * @swagger
 * definition:
 *  Update incremental:
 *     type: object
 *     properties:
 *       success:
 *         type: boolean
 *         description:
 *  Error:
 *    type: object
 *    properties:
 *      code:
 *        type: integer
 *        format: int32
 *      message:
 *        type: string
 */

/**
 * @swagger
 * definition:
 *  Import dataset:
 *     type: object
 *     properties:
 *       success:
 *         type: boolean
 *         description:
 *  Error:
 *    type: object
 *    properties:
 *      code:
 *        type: integer
 *        format: int32
 *      message:
 *        type: string
 */

/**
 * @swagger
 * definition:
 *  Git commits list:
 *     type: object
 *     properties:
 *       success:
 *         type: boolean
 *         description:
 *       commits:
 *         type: array
 *         description: Consist all commits
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

module.exports = (serviceLocator) => {
  const app = serviceLocator.getApplication();

  const config = app.get('config');
  const logger = app.get('log');
  const cache = require('../../../ws.utils/redis-cache')(config);

  const router = express.Router();

  /**
   * @swagger
   * /api/ddf/demo/prestored-queries:
   *   get:
   *    description: Prestored queries
   *    produces:
   *      - application/json
   *    responses:
   *      200:
   *        description: An array of products
   *        schema:
   *         type: array
   *         items:
   *           type: string
   *      default:
   *        description: Unexpected error
   *        schema:
   *        $ref: '#/definitions/Error'
   *   post:
   *    description: Prestored queries
   *    produces:
   *      - application/json
   *    responses:
   *      200:
   *        description: An array of products
   *        schema:
   *         type: array
   *         items:
   *           type: string
   *      default:
   *        description: Unexpected error
   *        schema:
   *        $ref: '#/definitions/Error'
   */

  router.all('/api/ddf/demo/prestored-queries',
    cors(),
    compression(),
    decodeQuery,
    _getPrestoredQueries
  );

  /**
   * @swagger
   * api/ddf/demo/update-incremental:
   *   post:
   *    description: Update incremental
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: commit
   *        in: body
   *        description:
   *        type: string
   *      - name: github
   *        in: body
   *        description:
   *        type: string
   *      - name: diff
   *        in: body
   *        description:
   *        type: string
   *    responses:
   *      200:
   *        description: An array of products
   *        schema:
   *         type: array
   *         items:
   *            type: string
   *      default:
   *        description: Unexpected error
   *        schema:
   *          $ref: '#/definitions/Error'
   */

  router.post('/api/ddf/demo/update-incremental',
    cors(),
    compression(),
    decodeQuery,
    _updateIncrementally
  );

  /**
   * @swagger
   * api/ddf/demo/import-dataset:
   *   post:
   *    description: Import dataset
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: github
   *        in: body
   *        description: Reference to database which will be clone
   *        type: string
   *    responses:
   *      200:
   *        description: An array of products
   *        schema:
   *         type: array
   *         items:
   *            type: string
   *      default:
   *        description: Unexpected error
   *        schema:
   *          $ref: '#/definitions/Error'
   *   get:
   *    description: Import dataset
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: github
   *        in: query
   *        description: Reference to database which will be clone
   *        type: string
   *    responses:
   *      200:
   *        description: An array of products
   *        schema:
   *         type: array
   *         items:
   *            type: string
   *      default:
   *        description: Unexpected error
   *        schema:
   *          $ref: '#/definitions/Error'
   */

  router.all('/api/ddf/demo/import-dataset',
    cors(),
    compression(),
    decodeQuery,
    _importDataset
  );

  /**
   * @swagger
   * api/ddf/demo/git-commits-list:
   *   post:
   *    description: Git commits list
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: github
   *        in: body
   *        description: Reference to database which will be clone
   *        type: string
   *    responses:
   *      200:
   *        description: An array of products
   *        schema:
   *         type: array
   *         items:
   *            type: string
   *      default:
   *        description: Unexpected error
   *        schema:
   *          $ref: '#/definitions/Error'
   *   get:
   *    description: Git commits list
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: github
   *        in: query
   *        description: Reference to database which will be clone
   *        type: string
   *    responses:
   *      200:
   *        description: An array of products
   *        schema:
   *         type: array
   *         items:
   *            type: string
   *      default:
   *        description: Unexpected error
   *        schema:
   *          $ref: '#/definitions/Error'
   */

  router.all('/api/ddf/demo/git-commits-list',
    cors(),
    compression(),
    decodeQuery,
    _getGitCommitsList
  );

  router.get('/api/ddf/demo/commit-of-latest-dataset-version',
    cors(),
    compression(),
    decodeQuery,
    _getCommitOfLatestDatasetVersion
  );

  return app.use(router);

  function _getPrestoredQueries(req, res) {
    service.getPrestoredQueries ((err, result) => {
      if (err) {
        logger.error(err);
      }
      return res.json({success: !err, result, err});
    });
  }

  function _updateIncrementally(req, res) {
    let params = {
      commit: req.body.commit,
      github: req.body.github,
      datasetName: reposService.getRepoName(req.body.github),
      diff: JSON.parse(req.body.diff)
    };

    service.updateIncrementally(params, app, (err) => {
      if (err) {
        logger.error(err);
      }

      return res.json({success: !err, err});
    });
  }

  function _importDataset(req, res) {
    let params = _.isEmpty(req.query) ? req.body : req.query;

    service.importDataset(params, config, app, (err) => {
      if (err) {
        logger.error(err);
      }

      return res.json({success: !err, err});
    });
  }

  function _getGitCommitsList(req, res) {
    const github = req.body.github || req.params.github || req.query.github;

    service.getGitCommitsList(github, config, (err, result) => {
      if (err) {
        logger.error(err);
      }

      return res.json({success: !err, err, commits: result.commits});
    });
  }

  function _getCommitOfLatestDatasetVersion(req, res) {
    const github = req.query.github;

    service.getCommitOfLatestDatasetVersion(github, (err, result) => {
      if (err) {
        logger.error(err);
      }

      return res.json({
        success: !err,
        err,
        github: result.dataset.path,
        dataset: result.dataset.name,
        commit: result.transaction.commit
      });
    });
  }
};
