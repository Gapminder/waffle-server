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

function updateIncrementally(params, app, cb) {
  let pipe = params;
  pipe.app = app;

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
    commit: null,
    gids: []
  };

  let queries = pipe.measures.reduce(function (result, measure, index) {
    if (index === 0 || (calculation.datasetName === measure.dataset.name && calculation.version === measure.transaction.createdAt )) {
      __updateCalculation(calculation, measure);

      if (index === pipe.measures.length - 1) {
        result.push(__makePrestoredQuery(calculation));
      }

      return result;
    }

    result.push(__makePrestoredQuery(calculation));
    calculation.gids = [];
    __updateCalculation(calculation, measure);

    return result;
  }, []);

  return async.setImmediate(() => done(null, queries));
}

function __makePrestoredQuery(calculation) {
  const filteredGids = __filterGids(calculation.gids);

  return {
    url: `http://localhost:3000/api/ddf/datapoints?dataset=${calculation.datasetName}&version=${calculation.version}&year=1800:2015&select=geo,year,${filteredGids}`,
    datasetName: calculation.datasetName,
    version: calculation.version,
    commit: calculation.commit,
    createdAt: new Date(calculation.version)
  };
}

function __filterGids(gids) {
  return _.chain(gids)
    .difference(['age', 'longitude', 'latitude'])
    .take(3)
    .value();
}

function __updateCalculation(calculation, measure) {
  calculation.datasetName = measure.dataset.name;
  calculation.version = measure.transaction.createdAt;
  calculation.commit = measure.transaction.commit;
  calculation.gids.push(measure.gid);
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
