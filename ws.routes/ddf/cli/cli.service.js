'use strict';

const _ = require('lodash');
const async = require('async');
const git = require('simple-git');

const reposService = require('../import/repos.service');
const importDdfService = require('../../../csv_data_mapping_cli/import-ddf2');
const incrementalUpdateService = require('../../../csv_data_mapping_cli/incremental-update-ddf2');

const mongoose = require('mongoose');
const Datasets = mongoose.model('Datasets');
const Transactions = mongoose.model('DatasetTransactions');
const Concepts = mongoose.model('Concepts');

const authService = require('../../../ws.services/auth.service');

module.exports = {
  getGitCommitsList,
  importDataset,
  updateIncrementally,
  getPrestoredQueries,
  getCommitOfLatestDatasetVersion,
  authenticate
};

function getGitCommitsList(github, config, cb) {
  if (!github) {
    return cb('Url to dataset\'s github repository was not provided');
  }

  let pipe = {
    github,
    config
  };

  return async.waterfall([
    async.constant(pipe),
    _cloneSourceRepo,
    _getPathToRepo
  ], cb);
}

function _cloneSourceRepo(pipe, done) {
  return reposService.cloneRepo(pipe.github, pipe.commit || null, (error, repoInfo) => {
    pipe.repoInfo = repoInfo;

    return done(error, pipe);
  }, pipe.config);
}

function _getPathToRepo(pipe, done) {
  return git(pipe.repoInfo.pathToRepo)
    .log((err, log) => {
      return done(err, {commits: _.reverse(log.all)});
    });
}

function importDataset(params, config, app, cb) {
  let pipe = params;
  pipe.config = config;
  pipe.app = app;

  return async.waterfall([
    async.constant(pipe),
    _findDataset,
    _validateDatasetBeforeImport,
    _cloneSourceRepo,
    _importDdfService,
    _unlockDataset
  ], cb);
}

function _findDataset(pipe, done) {
  return Datasets.findOne({path: pipe.github}).lean().exec((error, dataset) => {
    pipe.dataset = dataset;

    return done(error, pipe);
  });
}

function _validateDatasetBeforeImport(pipe, done) {
  let error;

  if (pipe.dataset) {
    error = 'Dataset exitst, cannot import same dataset twice';
  }

  return async.setImmediate(() => {
    return done(error, pipe);
  });
}

function _importDdfService(pipe, done) {
  let options = {datasetName: reposService.getRepoName(pipe.github), commit: pipe.commit, github: pipe.github};

  return importDdfService(pipe.app, (error, pipe) => {
    return done(error, pipe);
  }, options);
}

function _unlockDataset(pipe, done) {
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

function updateIncrementally(params, config, app, cb) {
  let pipe = params;
  pipe.app = app;
  pipe.config = config;

  return async.waterfall([
    async.constant(pipe),
    _lockDataset,
    _cloneSourceRepo,
    _checkTransaction,
    _runIncrementalUpdate,
    _unlockDataset
  ], cb);
}

function _lockDataset(pipe, done) {
  return Datasets
    .findOneAndUpdate({name: pipe.datasetName, isLocked: false}, {isLocked: true}, {new: 1})
    .lean()
    .exec((err, dataset) => {
      if (!dataset) {
        return done(`Version of dataset "${pipe.datasetName}" was already locked or dataset is absent`);
      }

      pipe.dataset = dataset;

      return done(err, pipe);
    });
}

function _checkTransaction(pipe, done) {
  return Transactions.findOne({
    dataset: pipe.dataset._id,
    commit: pipe.commit
  }).lean().exec((error, transaction) => {
    if (transaction) {
      return done(`Version of dataset "${pipe.github}" with commit: "${transaction.commit}" was already applied`);
    }

    return done(error, pipe);
  });
}

function _runIncrementalUpdate(pipe, done) {
  let options = {
    diff: pipe.diff,
    datasetName: pipe.datasetName,
    commit: pipe.commit,
    github: pipe.github
  };

  return incrementalUpdateService(pipe.app, (err) => done(err, pipe), options);
}

function getPrestoredQueries(cb) {
  return async.waterfall([
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
              urls.push(_makePrestoredQuery({
                datasetName: dataset.name,
                version,
                measures
              }));

              return cb();
            });
        }, onUrlsCreated);
      }, error => {
        return done(error, urls);
      });
    }
  ], cb);
}


function _makePrestoredQuery(query) {
  const filteredMeasures = _.chain(query.measures)
    .map('gid')
    .filter((measure) => !_.includes(['age', 'longitude', 'latitude'], measure))
    .take(3)
    .join(',')
    .value();

  return {
    url: `http://localhost:3000/api/ddf/datapoints?dataset=${query.datasetName}&version=${query.version}&year=1800:2015&select=geo,year,${filteredMeasures}`,
    datasetName: query.datasetName,
    version: query.version,
    createdAt: new Date(query.version)
  };
}

function getCommitOfLatestDatasetVersion(github, cb) {
  let pipe = {github};

  return async.waterfall([
    async.constant(pipe),
    _findDataset,
    _validateDatasetBeforeIncrementalUpdate,
    _findTransaction
  ], cb);
}

function _validateDatasetBeforeIncrementalUpdate(pipe, done) {
  let error;

  if (!pipe.dataset) {
    error = 'Dataset was not found, hence hash commit of it\'s latest version cannot be acquired';
  }

  if (pipe.dataset.isLocked) {
    error = 'Dataset was locked. Please, start rollback process.';
  }

  return async.setImmediate(() => {
    return done(error, pipe);
  });
}

function _findTransaction(pipe, done) {
  return Transactions
    .find({dataset: pipe.dataset._id})
    .sort({createdAt: -1})
    .limit(1)
    .lean()
    .exec((error, transaction) => {
      pipe.transaction = _.first(transaction);

      return done(error, pipe);
    });
}

function authenticate(credentials, onAuthenticated) {
  return authService.authenticate(credentials, onAuthenticated);
}
