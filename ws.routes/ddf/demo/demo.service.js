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

module.exports = {
  getGitCommitsList: getGitCommitsList,
  importDataset: importDataset,
  updateIncrementally: updateIncrementally,
  getPrestoredQueries: getPrestoredQueries,
  getCommitOfLatestDatasetVersion: getCommitOfLatestDatasetVersion
};

function getGitCommitsList(github, config, cb) {
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
    _findDataset((dataset) => {
      if (dataset) {
        return {valid: false, message: 'Dataset exitst, cannot import same dataset twice'};
      }
      return {valid: true}
    }),
    _checkTransaction,
    _cloneSourceRepo,
    _importDdfService
  ], cb);
}

function _findDataset(validateDataset) {
  return (pipe, done) => Datasets.findOne({path: pipe.github}).lean().exec((error, dataset) => {
    const validationResult = validateDataset(dataset);
    if (!validationResult.valid) {
      return done(validationResult.message);
    }

    pipe.dataset = dataset;

    return done(error, pipe);
  });
}

function _checkTransaction(pipe, done) {
  return Transactions.findOne({
    dataset: pipe.dataset ? pipe.dataset._id : null,
    commit: pipe.commit
  }).lean().exec((error, transaction) => {
    if (transaction) {
      return done(`Version of dataset "${pipe.github}" with commit: "${transaction.commit}" was already applied`);
    }

    return done(error, pipe);
  });
}

function _importDdfService(pipe, done) {
  let options = {datasetName: reposService.getRepoName(pipe.github), commit: pipe.commit, github: pipe.github};

  return importDdfService(pipe.app, error => done(error), options);
}

function updateIncrementally(params, cb) {
  let pipe = params;

  return async.waterfall([
    async.constant(pipe),
    _lockDataset,
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

      return done(err, pipe);
    });
}

function _runIncrementalUpdate(pipe, done) {
  let options = {
    diff: pipe.diff,
    datasetName: pipe.datasetName,
    commit: pipe.commit,
    github: pipe.github
  };

  return incrementalUpdateService(app, (err) => done(err, pipe), options);
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

function getPrestoredQueries(cb) {
  async.waterfall([
    async.constant({}),
    _findDatasets,
    _computeConceptQueries,
    _getMeasures,
    _getPrestoredQueries
  ], cb);
}

function _findDatasets(pipe, done) {
  Datasets.find({})
    .sort({'name': 1})
    .lean()
    .exec((error, datasets) => {
      pipe.datasets = datasets;

      return done(error, pipe);
    });
}

function _computeConceptQueries(pipe, done) {
  let queries = [];

  pipe.datasets.forEach(function (dataset) {
    dataset.versions.forEach(function (version) {
      let query = {
        dataset: dataset._id,
        type: 'measure',
        from: {$lte: version},
        to: {$gt: version}
      };
      queries.push(query);

      return queries;
    });

    pipe.queries = queries;
  });

  return async.setImmediate(() => done(null, pipe));
}

function _getMeasures(pipe, done) {
  return Concepts.find({$or: pipe.queries})
    .populate('dataset')
    .populate('transaction')
    .sort({'dataset.name': 1, 'transaction.createdAt': 1})
    .lean()
    .exec((error, measures) => {
      pipe.measures = measures;

      return done(error, pipe);
    });
}

function _getPrestoredQueries(pipe, done) {
  let calculation = {
    datasetName: null,
    version: null,
    gid: []
  };

  let urls = pipe.measures.reduce(function (result, measure, index) {
    if (index === 0 || (calculation.datasetName === measure.dataset.name && calculation.version === measure.transaction.createdAt )) {
      __updateCalculation(calculation, measure);

      if (index === pipe.measures.length - 1) {
        __pushResult(result, calculation);
      }

      return result;
    }

    __pushResult(result, calculation);
    calculation.gid = [];
    __updateCalculation(calculation, measure);

    return result;
  }, []);

  return async.setImmediate(() => done(null, urls));
}

function __filterGids(gids) {
  return _.chain(gids)
    .difference(['age', 'longitude', 'latitude'])
    .take(3)
    .value();
}

function __pushResult(result, calculation) {
  const filteredGids = __filterGids(calculation.gid);
  result.push(`dataset: ${calculation.datasetName}, version: ${calculation.version} ${new Date(calculation.version)}`);
  result.push(`http://localhost:3000/api/ddf/stats?dataset=${calculation.datasetName}&version=${calculation.version}time=1800:2015&select==geo,time,${filteredGids}`);
}

function __updateCalculation(calculation, measure) {
  calculation.datasetName = measure.dataset.name;
  calculation.version = measure.transaction.createdAt;
  calculation.gid.push(measure.gid);
}

function getCommitOfLatestDatasetVersion(github, cb) {
  let pipe = {github};

  return async.waterfall([
    async.constant(pipe),
    _findDataset(dataset => {
      if (!dataset) {
        return {valid: false, message: 'Dataset was not found, hence hash commit of it\'s latest version cannot be acquired'};
      }
      return {valid: true}
    }),
    _findTransaction
  ], cb);
}

function _findTransaction(pipe, done) {
  return Transactions
    .findOne({dataset: pipe.dataset._id})
    .sort({createdAt: -1})
    .limit(1)
    .lean()
    .exec((error, transaction) => {
      pipe.transaction = transaction;

      return done(error, pipe);
    });
}
