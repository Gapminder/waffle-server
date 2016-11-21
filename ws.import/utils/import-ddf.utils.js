'use strict';

const _ = require('lodash');
const hi = require('highland');
const fs = require('fs');
const path = require('path');
const wsCli = require('waffle-server-import-cli');
const async = require('async');
const validator = require('validator');
const ddfTimeUtils = require('ddf-time-utils');
const ddfValidation = require('ddf-validation');
const SimpleDdfValidator = ddfValidation.SimpleValidator;

const logger = require('../../ws.config/log');
const config = require('../../ws.config/config');
const constants = require('../../ws.utils/constants');
const reposService = require('../../ws.services/repos.service');
const datasetsRepository = require('../../ws.repository/ddf/datasets/datasets.repository');
const datapackageParser = require('./datapackage.parser');
const transactionsRepository = require('../../ws.repository/ddf/dataset-transactions/dataset-transactions.repository');

const Converter = require('csvtojson').Converter;

const RESERVED_PROPERTIES = ['properties', 'dimensions', 'subsetOf', 'from', 'to', 'originId', 'gid', 'domain', 'type', 'languages'];

const ddfValidationConfig = {
  datapointlessMode: true,
  includeTags: 'WAFFLE_SERVER',
  excludeRules: 'FILENAME_DOES_NOT_MATCH_HEADER',
  indexlessMode: true
};

module.exports = {
  activateLifecycleHook,
  isJson,
  isPropertyReserved,
  parseProperties,
  toNumeric,
  toBoolean,
  readCsvFile,
  readCsvFileAsStream,
  resolvePathToDdfFolder,
  closeTransaction,
  establishTransactionForDataset,
  createDataset,
  createTransaction,
  getDatapackage,
  validateDdfRepo,
  cloneDdfRepo,
  generateDiffForDatasetUpdate
};

function activateLifecycleHook(hookName) {
  const actualParameters = [].slice.call(arguments, 1);
  return (pipe, done) => {
    return async.setImmediate(() => {
      if (pipe.lifecycleHooks && pipe.lifecycleHooks[hookName]) {
        pipe.lifecycleHooks[hookName](actualParameters);
      }
      return done(null, pipe);
    });
  };
}

function isPropertyReserved(property) {
  return _.includes(RESERVED_PROPERTIES, property);
}

function isJson(value) {
  return isJsonLike(value) && validator.isJSON(value);
}

function isJsonLike(value) {
  return /^\[.*\]$|^{.*}$/g.test(value);
}

function parseProperties(concept, entityGid, entityProperties, timeConcepts) {
  if (_.isEmpty(timeConcepts)) {
    return {};
  }

  let parsedProperties =
    _.chain(entityProperties)
      .pickBy((propValue, prop) => timeConcepts[prop])
      .mapValues(toInternalTimeForm)
      .value();

  if (timeConcepts[concept.gid]) {
    parsedProperties = _.extend(parsedProperties || {}, {[concept.gid]: toInternalTimeForm(entityGid)});
  }
  return parsedProperties;
}

function toInternalTimeForm(value) {
  const timeDescriptor = ddfTimeUtils.parseTime(value);
  return {
    millis: _.get(timeDescriptor, 'time'),
    timeType: _.get(timeDescriptor, 'type')
  };
}

function toNumeric(value) {
  const numericValue = value && _.toNumber(value);
  return !_.isNaN(numericValue) && _.isNumber(numericValue) ? numericValue : null;
}

function toBoolean(value) {
  if (value === 'TRUE' || value === 'FALSE') {
    return value === 'TRUE';
  }

  if (_.isBoolean(value)) {
    return Boolean(value);
  }

  return null;
}

function readCsvFileAsStream(filepath) {
  return hi(fs.createReadStream(filepath, 'utf-8')
    .pipe(new Converter({constructResult: false}, {objectMode: true})));
}

function readCsvFile(file, options, cb) {
  const converter = new Converter(Object.assign({}, {
    workerNum: 1,
    flatKeys: true
  }, options));

  converter.fromFile(file, (err, data) => {
    if (err) {
      const isCannotFoundError = _.includes(err.toString(), "cannot be found.");
      if (isCannotFoundError) {
        logger.warn(err);
      } else {
        logger.error(err);
      }
    }

    return cb(null, data);
  });
}

function cloneDdfRepo(pipe, done) {
  return reposService.cloneRepo(pipe.github, pipe.commit, (error, repoInfo) => {
    pipe.repoInfo = repoInfo;
    return done(error, pipe);
  });
}

function validateDdfRepo(pipe, onDdfRepoValidated) {
  const simpleDdfValidator = new SimpleDdfValidator(pipe.repoInfo.pathToRepo, ddfValidationConfig);
  simpleDdfValidator.on('finish', (error, isDatasetCorrect) => {
    if (error) {
      return onDdfRepoValidated(error);
    }

    if (!isDatasetCorrect) {
      return onDdfRepoValidated(`Ddf validation failed for dataset "${pipe.github}" and version "${pipe.commit}"`);
    }

    return onDdfRepoValidated(null, pipe);
  });
  return ddfValidation.validate(simpleDdfValidator);
}

function generateDiffForDatasetUpdate(context, done) {
  const {hashFrom, hashTo, github} = context;
  return wsCli.generateDiff({hashFrom, hashTo, github, resultPath: config.PATH_TO_DIFF_DDF_RESULT_FILE}, (error, diffPaths) => {
    if (error) {
      return done(error);
    }

    const {diff: pathToDatasetDiff, lang: pathToLangDiff} = diffPaths;
    return done(null, _.extend(context, {pathToDatasetDiff, pathToLangDiff}));
  });
}

function resolvePathToDdfFolder(pipe, done) {
  const pathToDdfFolder = reposService.getPathToRepo(pipe.datasetName);
  pipe.resolvePath = (filename) => path.resolve(pathToDdfFolder, filename);

  return async.setImmediate(() => done(null, pipe));
}

function getDatapackage(context, done) {
  const pathToDdfRepo = reposService.getPathToRepo(context.datasetName);
  return datapackageParser.loadDatapackage({folder: pathToDdfRepo}, (error, datapackage) => {
    context.datapackage = datapackage;
    return done(error, context);
  });
}

function createTransaction(pipe, done) {
  logger.info('create transaction');

  const transaction = {
    createdAt: Date.now(),
    createdBy: pipe.user._id,
    commit: pipe.commit
  };

  transactionsRepository.create(transaction, (err, createdTransaction) => {
    pipe.transaction = createdTransaction;
    return done(err, pipe);
  });
}

function closeTransaction(pipe, done) {
  logger.info('close transaction');

  const options = {
    transactionId: pipe.transaction._id,
    transactionStartTime: pipe.transaction.createdAt
  };

  transactionsRepository.closeTransaction(options, err => {
    return done(err, pipe);
  });
}

function createDataset(pipe, done) {
  logger.info('create data set');

  const dataset = {
    name: pipe.datasetName,
    path: pipe.github,
    createdAt: pipe.transaction.createdAt,
    createdBy: pipe.user._id
  };

  datasetsRepository.create(dataset ,(err, createdDataset) => {
    pipe.dataset = createdDataset;
    return done(err, pipe);
  });
}

function establishTransactionForDataset(pipe, done) {
  logger.info('update transaction');

  const options = {
    transactionId: pipe.transaction._id,
    datasetId: pipe.dataset._id
  };

  transactionsRepository.establishForDataset(options, err => done(err, pipe));
}
