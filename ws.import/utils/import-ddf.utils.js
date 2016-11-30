'use strict';

const _ = require('lodash');
const hi = require('highland');
const fs = require('fs');
const path = require('path');
const byline = require('byline');
const wsCli = require('waffle-server-import-cli');
const async = require('async');
const validator = require('validator');
const JSONStream = require('JSONStream');
const ddfTimeUtils = require('ddf-time-utils');
const ddfValidation = require('ddf-validation');
const SimpleDdfValidator = ddfValidation.SimpleValidator;

const logger = require('../../ws.config/log');
const config = require('../../ws.config/config');
const constants = require('../../ws.utils/constants');
const reposService = require('../../ws.services/repos.service');
const conceptsUtils = require('./concepts.utils');
const datasetsRepository = require('../../ws.repository/ddf/datasets/datasets.repository');
const datapackageParser = require('./datapackage.parser');
const transactionsRepository = require('../../ws.repository/ddf/dataset-transactions/dataset-transactions.repository');
const conceptsRepositoryFactory = require('../../ws.repository/ddf/concepts/concepts.repository');

const Converter = require('csvtojson').Converter;

const UPDATE_ACTIONS = new Set(['change', 'update']);
const DEFAULT_CHUNK_SIZE = 2000;
const MONGODB_DOC_CREATION_THREADS_AMOUNT = 3;
const RESERVED_PROPERTIES = ['properties', 'dimensions', 'subsetOf', 'from', 'to', 'originId', 'gid', 'domain', 'type', 'languages'];

const ddfValidationConfig = {
  datapointlessMode: true
};

module.exports = {
  UPDATE_ACTIONS,
  DEFAULT_CHUNK_SIZE,
  MONGODB_DOC_CREATION_THREADS_AMOUNT,
  getAllConcepts,
  getAllPreviousConcepts,
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
  updateTransactionLanguages,
  createDataset,
  findDataset,
  createTransaction,
  getDatapackage,
  validateDdfRepo,
  cloneDdfRepo,
  generateDiffForDatasetUpdate,
  startStreamProcessing,
  readTextFileByLineAsJsonStream
};

function getAllConcepts(externalContext, done) {
  return conceptsRepositoryFactory.latestVersion(externalContext.dataset._id, externalContext.transaction.createdAt)
    .findAllPopulated((err, concepts) => {
      externalContext.timeConcepts = _.keyBy(conceptsUtils.getTimeConcepts(concepts), 'gid');
      externalContext.concepts = _.keyBy(concepts, 'gid');
      return done(err, externalContext);
    });
}

function getAllPreviousConcepts(externalContext, done) {
  return conceptsRepositoryFactory.previousVersion(externalContext.dataset._id, externalContext.transaction.createdAt)
    .findAllPopulated((err, concepts) => {
      externalContext.previousConcepts = _.keyBy(concepts, 'gid');
      return done(err, externalContext);
    });
}

function activateLifecycleHook(hookName) {
  logger.info('Trying to activate lifecycle hook: ', hookName);
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

function readCsvFileAsStream(pathToDdfFolder, filepath) {
  const resolvedFilepath = path.resolve(pathToDdfFolder, filepath);

  return hi(fs.createReadStream(resolvedFilepath, 'utf-8')
    .pipe(new Converter({constructResult: false}, {objectMode: true})));
}

function readCsvFile(pathToDdfFolder, filepath, options, cb) {
  const resolvedFilepath = path.resolve(pathToDdfFolder, filepath);

  const converter = new Converter(Object.assign({}, {
    workerNum: 1,
    flatKeys: true
  }, options));

  converter.fromFile(resolvedFilepath, (err, data) => {
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
  logger.info('Clone ddf repo: ', pipe.github, pipe.commit);
  return reposService.cloneRepo(pipe.github, pipe.commit, (error, repoInfo) => {
    pipe.repoInfo = repoInfo;
    return done(error, pipe);
  });
}

function validateDdfRepo(pipe, onDdfRepoValidated) {
  logger.info('Start ddf dataset validation process: ', _.get(pipe.repoInfo, 'pathToRepo'));
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
  logger.info('Generating diff for dataset update');
  const {hashFrom, hashTo, github} = context;
  return wsCli.generateDiff({hashFrom, hashTo, github, resultPath: config.PATH_TO_DIFF_DDF_RESULT_FILE}, (error, diffPaths) => {
    if (error) {
      return done(error);
    }

    logger.info('Generated diff is:');
    logger.info({obj: diffPaths});

    const {diff: pathToDatasetDiff, lang: pathToLangDiff} = diffPaths;
    return done(null, _.extend(context, {pathToDatasetDiff, pathToLangDiff}));
  });
}

function resolvePathToDdfFolder(pipe, done) {
  const pathToDdfFolder = reposService.getPathToRepo(pipe.datasetName);
  pipe.pathToDdfFolder = pathToDdfFolder;

  return async.setImmediate(() => done(null, pipe));
}

function getDatapackage(context, done) {
  logger.info('Loading datapackage.json');

  const pathToDdfRepo = reposService.getPathToRepo(context.datasetName);
  return datapackageParser.loadDatapackage({folder: pathToDdfRepo}, (error, datapackage) => {
    if (error) {
      logger.error('Datapackage was not loaded');
      return done(error);
    }

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

function findDataset(pipe, done) {
  logger.info('Searching for existing dataset: ', pipe.datasetName);

  return datasetsRepository.findByName(pipe.datasetName, (err, dataset) => {
    if (err) {
      return done(err);
    }

    if (!dataset) {
      return done('Dataset was not found, hence update is impossible');
    }

    logger.info('Existing dataset was found: ', dataset.name);

    pipe.dataset = dataset;
    return done(err, pipe);
  });
}

function establishTransactionForDataset(pipe, done) {
  logger.info('Establishing current transaction for dataset');

  const options = {
    transactionId: pipe.transaction._id,
    datasetId: pipe.dataset._id
  };

  transactionsRepository.establishForDataset(options, err => done(err, pipe));
}

function updateTransactionLanguages(pipe, done) {
  logger.info('update transaction languages');

  const options = {
    transactionId: pipe.transaction._id,
    languages: _.map(pipe.datapackage.translations, 'id')
  };

  transactionsRepository.updateLanguages(options, err => done(err, pipe));
}

function readTextFileByLineAsJsonStream(pathToFile) {
  const fileWithChangesStream = fs.createReadStream(pathToFile, {encoding: 'utf8'});
  const jsonByLine = byline(fileWithChangesStream).pipe(JSONStream.parse());
  return hi(jsonByLine);
}

function startStreamProcessing(stream, externalContext, done) {
  const errors = [];
  return stream.stopOnError(error => {
      errors.push(error);
    })
    .done(() => {
      if (!_.isEmpty(errors)) {
        return done(errors, externalContext);
      }
      return done(null, externalContext);
    });
}
