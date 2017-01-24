import * as _ from 'lodash';
import * as hi from 'highland';
import * as fs from 'fs';
import * as path from 'path';
import * as wsCli from 'waffle-server-import-cli';
import * as async from 'async';
import * as validator from 'validator';
import * as ddfTimeUtils from 'ddf-time-utils';
import * as ddfValidation from 'ddf-validation';
import {logger} from '../../ws.config/log';
import {config} from '../../ws.config/config';
import {constants} from '../../ws.utils/constants';
import * as reposService from '../../ws.services/repos.service';
import * as conceptsUtils from './concepts.utils';
import {DatasetsRepository} from '../../ws.repository/ddf/datasets/datasets.repository';
import * as datapackageParser from './datapackage.parser';
import {DatasetTransactionsRepository} from '../../ws.repository/ddf/dataset-transactions/dataset-transactions.repository';
import {ConceptsRepositoryFactory} from '../../ws.repository/ddf/concepts/concepts.repository';

const SimpleDdfValidator = ddfValidation.SimpleValidator;

const UPDATE_ACTIONS = new Set(['change', 'update']);
const DEFAULT_CHUNK_SIZE = 6000;
const MONGODB_DOC_CREATION_THREADS_AMOUNT = 3;
const RESERVED_PROPERTIES = ['properties', 'dimensions', 'subsetOf', 'from', 'to', 'originId', 'gid', 'domain', 'type', 'languages'];

const ddfValidationConfig = {
  datapointlessMode: true
};

export {
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
  resolvePathToDdfFolder,
  closeTransaction,
  establishTransactionForDataset,
  updateTransactionLanguages,
  createDataset,
  findDataset,
  createTransaction,
  findPreviousTransaction,
  getDatapackage,
  validateDdfRepo,
  cloneDdfRepo,
  generateDiffForDatasetUpdate,
  startStreamProcessing,
};

function getAllConcepts(externalContext, done) {
  return ConceptsRepositoryFactory.latestVersion(externalContext.dataset._id, externalContext.transaction.createdAt)
    .findAllPopulated((err, concepts) => {
      externalContext.timeConcepts = _.keyBy(conceptsUtils.getTimeConcepts(concepts), 'gid');
      externalContext.concepts = _.keyBy(concepts, 'gid');
      return done(err, externalContext);
    });
}

function getAllPreviousConcepts(externalContext, done) {
  return ConceptsRepositoryFactory.currentVersion(externalContext.dataset._id, externalContext.previousTransaction.createdAt)
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

function cloneDdfRepo(pipe, done) {
  logger.info('Clone ddf repo: ', pipe.github, pipe.commit);
  return reposService.cloneRepo(pipe.github, pipe.commit, (error, repoInfo) => {
    if (error) {
      return done(error, pipe);
    }

    pipe.repoInfo = repoInfo;

    return done(null, pipe);
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

function findPreviousTransaction(pipe, done) {
  logger.info('Find latest successful transaction');

  DatasetTransactionsRepository.findLatestCompletedByDataset(pipe.dataset._id, (err, latestTransaction) => {
    if (err) {
      return done(err);
    }

    pipe.previousTransaction = latestTransaction;
    return done(err, pipe);
  });
}

function createTransaction(pipe, done) {
  logger.info('create transaction');

  const transaction = {
    createdAt: Date.now(),
    createdBy: pipe.user._id,
    commit: pipe.commit
  };

  DatasetTransactionsRepository.create(transaction, (err, createdTransaction) => {
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

  DatasetTransactionsRepository.closeTransaction(options, err => {
    return done(err, pipe);
  });
}

function createDataset(pipe, done) {
  logger.info('create data set');

  const dataset = {
    name: pipe.datasetName,
    path: pipe.github,
    createdAt: pipe.transaction.createdAt,
    createdBy: pipe.user._id,
    private: pipe.isDatasetPrivate
  };

  DatasetsRepository.create(dataset ,(err, createdDataset) => {
    if (err) {
      return done(err);
    }

    if (!createdDataset) {
      return done('Dataset was not created due to some issues');
    }

    pipe.dataset = createdDataset;
    return done(err, pipe);
  });
}

function findDataset(pipe, done) {
  logger.info('Searching for existing dataset: ', pipe.datasetName);

  return DatasetsRepository.findByName(pipe.datasetName, (err, dataset) => {
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

  DatasetTransactionsRepository.establishForDataset(options, err => done(err, pipe));
}

function updateTransactionLanguages(pipe, done) {
  logger.info('update transaction languages');

  const options = {
    transactionId: pipe.transaction._id,
    languages: _.map(pipe.datapackage.translations, 'id')
  };

  DatasetTransactionsRepository.updateLanguages(options, err => done(err, pipe));
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
