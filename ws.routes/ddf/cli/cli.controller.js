'use strict';

const _ = require('lodash');
const cors = require('cors');
const express = require('express');
const compression = require('compression');
const JSONStream = require('JSONStream');

const reposService = require('../import/repos.service');
const cliService = require('./cli.service');
const transactionsService = require('../../../ws.services/dataset-transactions.service');
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

  router.get('/api/ddf/cli/transactions/latest/status',
    cors(),
    compression(),
    decodeQuery,
    _getStateOfLatestTransaction
  );

  router.post('/api/ddf/cli/transactions/latest/rollback',
    cors(),
    compression(),
    decodeQuery,
    _activateRollback
  );

  return app.use(router);

  function _getStateOfLatestTransaction(req, res) {
    const datasetName = req.query.datasetName;
    if (!datasetName) {
      return res.json({success: false, error: 'No dataset name was given'})
    }

    return transactionsService.getStatusOfLatestTransactionByDatasetName(datasetName, (statusError, status) => {
      if (statusError) {
        return res.json({success: !statusError, error: statusError});
      }

      return res.json({success: !statusError, data: status});
    });
  }

  function _activateRollback(req, res) {
    const datasetName = req.body.datasetName;
    if (!datasetName) {
      return res.json({success: false, error: 'No dataset name was given'})
    }

    return transactionsService.rollbackFailedTransactionFor(datasetName, rollbackError => {
      if (rollbackError) {
        return res.json({success: !rollbackError, error: rollbackError});
      }

      return res.json({success: !rollbackError, message: 'Rollback completed successfully'});
    });
  }

  function _getPrestoredQueries(req, res) {
    cliService.getPrestoredQueries ((error, queries) => {
      logger.info(`finished getting prestored queries`);

      if (error) {
        return res.json({success: !error, error});
      }

      return res.json({success: !error, data: queries});
    });
  }

  function _updateIncrementally(req, res) {
    bodyFromStream(req, (error, body) => {
      if (error) {
        return res.json({success: !error, error});
      }

      cliService.updateIncrementally(body, app, updateError => {
        if (updateError) {
          return res.json({success: !updateError, error: updateError});
        }

        return res.json({success: !updateError});
      });
    });

    function bodyFromStream(req, onBodyTransformed) {
      let result = {};
      req.pipe(JSONStream.parse('$*'))
        .on('data', entry => {
          const data = entry.value;

          const repoName = reposService.getRepoName(data.github);
          if (data.github && !repoName) {
            req.destroy();
            return onBodyTransformed(`Incorrect github url was given: ${data.github}`)
          }

          result.datasetName = repoName;
          result = _.merge(result, data);
        })
        .on('end', () => {
          if (_.isEmpty(result)) {
            return onBodyTransformed('No data (github, commit, etc.) was given for performing incremental update');
          }
          return onBodyTransformed(null, result);
        })
        .on('error', error => {
          return onBodyTransformed(error);
        });
    }
  }

  function _importDataset(req, res) {
    let params = req.body;

    cliService.importDataset(params, config, app, error => {
      logger.info(`finished import for dataset '${params.github}' and commit '${params.commit}'`);

      if (error) {
        return res.json({success: !error, error});
      }

      return res.json({success: !error});
    });
  }

  function _getGitCommitsList(req, res) {
    const github = req.query.github;

    cliService.getGitCommitsList(github, config, (error, result) => {
      logger.info(`finished getting commits list for dataset '${github}'`);

      if (error) {
        return res.json({success: !error, error});
      }

      return res.json({
        success: !error, 
        data: {
          commits: result.commits
        }
      });
    });
  }

  function _getCommitOfLatestDatasetVersion(req, res) {
    const github = req.query.github;

    cliService.getCommitOfLatestDatasetVersion(github, (error, result) => {
      logger.info(`finished getting latest commit '${result.transaction.commit}' for dataset '${github}'`);

      if (error) {
        return res.json({success: !error, error});
      }

      return res.json({
        success: !error,
        data: {
          github: result.dataset.path,
          dataset: result.dataset.name,
          commit: result.transaction.commit
        }
      });
    });
  }
};
