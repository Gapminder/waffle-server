'use strict';

const _ = require('lodash');
const cors = require('cors');
const async = require('async');
const express = require('express');
const compression = require('compression');

const decodeQuery = require('../../utils').decodeQuery;

const reposService = require('../import/repos.servise');

const mongoose = require('mongoose');
const Datasets = mongoose.model('Datasets');
const Concepts = mongoose.model('Concepts');

module.exports = (serviceLocator) => {
  const app = serviceLocator.getApplication();
  const config = app.get('config');

  const cache = require('../../../ws.utils/redis-cache')(config);

  const router = express.Router();

  router.all('/api/ddf/demo/prestored-queries',
    cors(),
    compression(),
    // cache.route(),
    decodeQuery,
    getPrestoredQueries
  );

  router.all('/api/ddf/demo/update-incremental',
    cors(),
    compression(),
    // cache.route(),
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
    console.log(req.body.github);
    const repos = {
      'git@github.com:valor-software/ddf--gapminder_world-stub-1.git': [
        'aafed7d4dcda8d736f317e0cd3eaff009275cbb6',
        '5f88ae30f095579b9bf1b6dc4a14c27a0617abc4',
        '5412b8bd341ec69475ad3678ffd217aae7bb699e'
      ],
      'git@github.com:valor-software/ddf--gapminder_world-stub-2.git': [
        'e4eaa8ef84c7f56325f86967351a7004cb175651',
        'a7f2d9d9fa22ed21d2a0979a2f6106b2798c0e43',
        '7d034e3f86f9b9878c0e36b26aad36e0e21c66e5'
      ]
    };

    return res.json({commits: repos[req.body.github]});
  }

  function importDataset(req, res, next) {
    let params = req.query || req.body;
    console.log(params.github);
    console.log(params.commit);

    reposService.cloneRepo(params.github, (error, wasCloned) => {
      if (error) {
        return res.json({success: !error, error});
      }

      require('../../../csv_data_mapping_cli/import-ddf2')(app, error => {
        return res.json({success: !error, error});
      }, {datasetName: params.github, commit: params.commit, github: req.body.github});
    }, config);
  }

  function updateIncrementally(req, res, next) {
    console.log(req.body.diff);
    console.log(req.body.github);

    require('../../../csv_data_mapping_cli/incremental-update-ddf2')(app, error => {
      if (error) {
        return res.json({success: !error, error});
      }
      return next();
    }, {diff: req.body.diff, datasetName: req.body.github, commit: req.body.commit, github: req.body.github});
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
        return next();
      }
      return res.json(queries)
    });
  }
};
