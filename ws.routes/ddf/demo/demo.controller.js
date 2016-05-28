'use strict';

const _ = require('lodash');
const cors = require('cors');
const async = require('async');
const express = require('express');
const compression = require('compression');

const git = require('simple-git');

const decodeQuery = require('../../utils').decodeQuery;

const reposService = require('../import/repos.servise');
const importDdfService = require('../../../csv_data_mapping_cli/import-ddf2');
const incrementalUpdateService = require('../../../csv_data_mapping_cli/incremental-update-ddf2');

const mongoose = require('mongoose');
const Datasets = mongoose.model('Datasets');
const Transactions = mongoose.model('DatasetTransactions');
const Concepts = mongoose.model('Concepts');

module.exports = (serviceLocator) => {
  const app = serviceLocator.getApplication();
  const config = app.get('config');
  const logger = app.get('log');

  const cache = require('../../../ws.utils/redis-cache')(config);

  const router = express.Router();

  router.all('/api/ddf/demo/prestored-queries',
    cors(),
    compression(),
    decodeQuery,
    getPrestoredQueries
  );

  router.post('/api/ddf/demo/update-incremental',
    cors(),
    compression(),
    decodeQuery,
    updateIncrementally
  );

  router.all('/api/ddf/demo/import-dataset',
    cors(),
    compression(),
    decodeQuery,
    importDataset
  );

  router.all('/api/ddf/demo/git-commits-list',
    cors(),
    compression(),
    decodeQuery,
    getGitCommitsList
  );

  return app.use(router);

  function getGitCommitsList(req, res, next) {
    const github = req.body.github || req.params.github || req.query.github;

    reposService.cloneRepo(github, null, (error, repoInfo) => {
      if (error) {
        return res.json({success: !error, error});
      }

      git(repoInfo.pathToRepo)
        .log(function(err, log) {
          if (err) {
            return res.json({success: !err, err});
          }

          return res.json({commits: _.map(log.all, 'hash')});
        })

    }, config);
  }

  function importDataset(req, res, next) {
    let params = _.isEmpty(req.query) ? req.body : req.query;
    async.waterfall([
      async.constant({}),
      (pipe, done) => Datasets.findOne({name: params.github}).lean().exec((error, dataset) => {
        pipe.dataset = dataset;
        done(error, pipe);
      }),
      (pipe, done) => Transactions.findOne({dataset: pipe.dataset ? pipe.dataset._id: null, commit: req.body.commit}).lean().exec((error, transaction) => {
        if (error) {
          logger.error(error);
          return res.json({success: !error, error});
        }

        if (transaction) {
          logger.error(`Version of dataset "${req.body.github}" with commit: "${transaction.commit}" was already applied`);
          return res.json({success: false, error: `Version of dataset with commit: "${transaction.commit}" was already applied`});
        }

        reposService.cloneRepo(params.github, params.commit, (error, wasCloned) => {
          if (error) {
            return res.json({success: !error, error});
          }

          importDdfService(app, error => {
            return done(error);
          }, {datasetName: reposService.getRepoName(params.github), commit: params.commit, github: req.body.github});
        }, config);
      })
    ], error => {
        return res.json({success: !error, error});
    });
  }

  function updateIncrementally(req, res, next) {
    Transactions.findOne({commit: req.body.commit}).lean().exec((error, transaction) => {
      if (error) {
        logger.error(error);
        return res.json({success: !error, error});
      }

      if (transaction) {
        logger.error(`Version of dataset "${req.body.github}" with commit: "${transaction.commit}" was already applied`);
        return res.json({
          success: false,
          error: `Version of dataset with commit: "${transaction.commit}" was already applied`
        });
      }

      incrementalUpdateService(app, error => {
        return res.json({success: !error, error});
      }, {diff: JSON.parse(req.body.diff), datasetName: reposService.getRepoName(req.body.github), commit: req.body.commit, github: req.body.github});
    });
  }

  function getPrestoredQueries(req, res, next) {
    async.waterfall([
      async.constant({}),
      (pipe, done) => Datasets.find({}).lean().exec((error, datasets) => {
        pipe.datasets = datasets;
        return done(error, pipe);
      }),
      (pipe, done) => {
        const urls = [];
        return async.each(pipe.datasets, (dataset, onUrlsCreated) => {
          return async.each(dataset.versions, (version, cb) => {
            return Concepts.find({dataset: dataset._id, type: 'measure', from: {$lte: version}, to: {$gt: version}}).lean().exec((error, measures) => {
              urls.push(`dataset: ${dataset.name}, version: ${version}`);
              urls.push(`http://localhost:3000/api/ddf/stats?dataset=${dataset.name}&version=${version}&time=1800:2015&select=geo,time,${_.map(measures, 'gid').join(',')}`);
              return cb();
            });
          },onUrlsCreated);
        }, error => {
          done(error, urls);
        })
      }
    ], (error, queries) => {
      if (error) {
        res.json({success: !error, error});
      }
      return res.json(queries)
    });
  }
};
