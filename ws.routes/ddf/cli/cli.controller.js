'use strict';

const cors = require('cors');
const express = require('express');
const compression = require('compression');
const _ = require('lodash');

const reposService = require('../import/repos.service');
const cliService = require('./cli.service');
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

module.exports = serviceLocator => {
  const app = serviceLocator.getApplication();

  const config = app.get('config');
  const logger = app.get('log');
  const cache = require('../../../ws.utils/redis-cache')(config);

  const router = express.Router();

  /**
   * @swagger
   * /api/ddf/cli/prestored-queries:
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

  router.get('/api/ddf/cli/prestored-queries',
    cors(),
    compression(),
    decodeQuery,
    _getPrestoredQueries
  );

  /**
   * @swagger
   * api/ddf/cli/update-incremental:
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

  router.post('/api/ddf/cli/update-incremental',
    cors(),
    compression(),
    decodeQuery,
    _updateIncrementally
  );

  /**
   * @swagger
   * api/ddf/cli/import-dataset:
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

  router.post('/api/ddf/cli/import-dataset',
    cors(),
    compression(),
    decodeQuery,
    _importDataset
  );

  /**
   * @swagger
   * api/ddf/cli/git-commits-list:
   *   get:
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

  router.get('/api/ddf/cli/git-commits-list',
    cors(),
    compression(),
    decodeQuery,
    _getGitCommitsList
  );

  router.get('/api/ddf/cli/commit-of-latest-dataset-version',
    cors(),
    compression(),
    decodeQuery,
    _getCommitOfLatestDatasetVersion
  );

  return app.use(router);

  function _getPrestoredQueries(req, res) {
    cliService.getPrestoredQueries ((err, result) => {
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

    cliService.updateIncrementally(params, app, (err) => {
      if (err) {
        logger.error(err);
      }

      return res.json({success: !err, err});
    });
  }

  function _importDataset(req, res) {
    let params = req.body;

    cliService.importDataset(params, config, app, (err) => {
      if (err) {
        logger.error(err);
      }

      return res.json({success: !err, err});
    });
  }

  function _getGitCommitsList(req, res) {
    const github = req.query.github;

    cliService.getGitCommitsList(github, config, (err, result) => {
      if (err) {
        logger.error(err);
      }

      return res.json({success: !err, err, commits: result.commits});
    });
  }

  function _getCommitOfLatestDatasetVersion(req, res) {
    const github = req.query.github;

    cliService.getCommitOfLatestDatasetVersion(github, (err, result) => {
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
