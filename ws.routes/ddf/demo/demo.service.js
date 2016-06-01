'use strict';

const _ = require('lodash');
const async = require('async');
const git = require('simple-git');


const reposService = require('../import/repos.service');
//const importDdfService = require('../../../csv_data_mapping_cli/import-ddf2');
const incrementalUpdateService = require('../../../csv_data_mapping_cli/incremental-update-ddf2');
//const cache = require('../../../ws.utils/redis-cache')(config);

const mongoose = require('mongoose');
const Datasets = mongoose.model('Datasets');
const Transactions = mongoose.model('DatasetTransactions');
const Concepts = mongoose.model('Concepts');

module.exports = {

  //getGitCommitsList: getGitCommitsList,
  //importDataset: importDataset,
  updateIncrementally: updateIncrementally,
  getPrestoredQueries: getPrestoredQueries
};

//function getGitCommitsList(body, query, params, next) {
//  const github = body.github || params.github || query.github;
//
//  reposService.cloneRepo(github, null, (error, repoInfo) => {
//    if (error) {
//      return res.json({success: !error, error});
//    }
//
//    git(repoInfo.pathToRepo)
//      .log(function(err, log) {
//        if (err) {
//          return res.json({success: !err, err});
//        }
//
//        return res.json({commits: _.reverse(log.all)});
//      })
//
//  }, config);
//}

//function importDataset(req, res, next) {
//  let params = _.isEmpty(req.query) ? req.body : req.query;
//
//  async.waterfall([
//    async.constant({}),
//    (pipe, done) => Datasets.findOne({name: params.github}).lean().exec((error, dataset) => {
//      pipe.dataset = dataset;
//      done(error, pipe);
//    }),
//    (pipe, done) => Transactions.findOne({dataset: pipe.dataset ? pipe.dataset._id: null, commit: req.body.commit}).lean().exec((error, transaction) => {
//      if (error) {
//        logger.error(error);
//        return res.json({success: !error, error});
//      }
//
//      if (transaction) {
//        logger.error(`Version of dataset "${req.body.github}" with commit: "${transaction.commit}" was already applied`);
//        return res.json({success: false, error: `Version of dataset with commit: "${transaction.commit}" was already applied`});
//      }
//
//      reposService.cloneRepo(params.github, params.commit, (error, wasCloned) => {
//        if (error) {
//          return res.json({success: !error, error});
//        }
//
//        importDdfService(app, error => {
//          return done(error);
//        }, {datasetName: reposService.getRepoName(params.github), commit: params.commit, github: req.body.github});
//      }, config);
//    })
//  ], error => {
//    return res.json({success: !error, error});
//  });
//}

function updateIncrementally(params, cb) {
  let pipe = params;

  return async.waterfall([
      async.constant(pipe),
      lockDataset,
      checkTransaction,
      runIncrementalUpdate,
      unlockDataset
    ], cb);

  function lockDataset(pipe, done) {
    return Datasets
      .findOneAndUpdate({name: pipe.datasetName, isLocked: false}, {isLocked: true}, {new: 1})
      .lean()
      .exec((err, dataset) => {
        if (!dataset) {
          return done(`Version of dataset "${pipe.datasetName}" was already locked or dataset is absent`);
        }

        return done(err, pipe);
      });
  }

  function checkTransaction(pipe, done) {
    return Transactions
      .findOne({commit: pipe.commit})
      .lean()
      .exec((err, transaction) => {
        if (transaction) {
          return done(`Version of dataset "${pipe.datasetName}" with commit: "${transaction.commit}" was already applied`);
        }

        return done(err, pipe);
      });
  }

  function runIncrementalUpdate(pipe, done) {
    let options = {
      diff: pipe.diff,
      datasetName: pipe.datasetName,
      commit: pipe.commit,
      github: pipe.github
    };

    return incrementalUpdateService(app, (err) => done(err, pipe), options);
  }

  function unlockDataset(pipe, done) {
    return Datasets
      .findOneAndUpdate({name: pipe.datasetName, isLocked: true}, {isLocked: false}, {new: 1})
      .lean()
      .exec((err, dataset) => {
        if (!dataset) {
          return done(`Version of dataset "${pipe.datasetName}" wasn't locked`);
        }

        return done(err, pipe);
      });
  }
}

function getPrestoredQueries(req, res, next) {
  async.waterfall([
    async.constant({}),
    (pipe, done) => Datasets.find({})
      .sort({'name': 1})
      .lean()
      .exec((error, datasets) => {
        pipe.datasets = datasets;
        return done(error, pipe);
      }),
    (pipe, done) => {
      const urls = [];
      return async.eachSeries(pipe.datasets, (dataset, onUrlsCreated) => {
        return async.eachSeries(dataset.versions, (version, cb) => {
          let query = {dataset: dataset._id, type: 'measure', from: {$lte: version}, to: {$gt: version}};
          return Concepts.find(query)
            .lean()
            .exec((error, measures) => {
              let date = new Date(version);
              urls.push(`dataset: ${dataset.name}, version: ${version} (${date.toLocaleString()})`);
              const filteredMeasures = _.chain(measures)
                .map('gid')
                .filter((measure) => !_.includes(['age', 'longitude', 'latitude'], measure))
                .take(3)
                .join(',')
                .value();
              urls.push(`http://localhost:3000/api/ddf/stats?dataset=${dataset.name}&version=${version}&time=1800:2015&select=geo,time,${filteredMeasures}`);
              return cb();
            });
        }, onUrlsCreated);
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
