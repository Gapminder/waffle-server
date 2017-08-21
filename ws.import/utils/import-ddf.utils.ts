import * as async from 'async';
import * as ddfTimeUtils from 'ddf-time-utils';
import * as ddfValidation from 'ddf-validation';
import * as _ from 'lodash';
import * as validator from 'validator';
import * as wsCli from 'waffle-server-import-cli';
import { config } from '../../ws.config/config';
import { logger } from '../../ws.config/log';
import { ConceptsRepositoryFactory } from '../../ws.repository/ddf/concepts/concepts.repository';
import { DatasetTransactionsRepository } from '../../ws.repository/ddf/dataset-transactions/dataset-transactions.repository';
import { DatasetsRepository } from '../../ws.repository/ddf/datasets/datasets.repository';
import * as reposService from '../../ws.services/repos.service';
import * as conceptsUtils from './concepts.utils';
import * as datapackageParser from './datapackage.parser';
import * as os from 'os';

const SimpleDdfValidator = ddfValidation.SimpleValidator;

const UPDATE_ACTIONS = new Set(['change', 'update']);
const DEFAULT_CHUNK_SIZE = 10000;
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
  cloneImportedDdfRepos
};

function getAllConcepts(externalContext: any, done: Function): void {
  return ConceptsRepositoryFactory.latestVersion(externalContext.dataset._id, externalContext.transaction.createdAt)
    .findAllPopulated((err: string, concepts: any) => {
      if (err) {
        return done(err);
      }

      externalContext.timeConcepts = _.keyBy(conceptsUtils.getTimeConcepts(concepts), 'gid');
      externalContext.concepts = _.keyBy(concepts, 'gid');
      return done(null, externalContext);
    });
}

function getAllPreviousConcepts(externalContext: any, done: Function): void {
  return ConceptsRepositoryFactory.currentVersion(externalContext.dataset._id, externalContext.previousTransaction.createdAt)
    .findAllPopulated((err: string, concepts: any) => {
      if (err) {
        return done(err);
      }

      externalContext.previousConcepts = _.keyBy(concepts, 'gid');
      return done(null, externalContext);
    });
}

function activateLifecycleHook(hookName: any): any {
  logger.info('Trying to activate lifecycle hook: ', hookName);
  const actualParameters = [].slice.call(arguments, 1);
  return (pipe: any, done: Function) => {
    return async.setImmediate(() => {
      if (pipe.lifecycleHooks && pipe.lifecycleHooks[hookName]) {
        pipe.lifecycleHooks[hookName](actualParameters);
      }
      return done(null, pipe);
    });
  };
}

function isPropertyReserved(property: any): boolean {
  return _.includes(RESERVED_PROPERTIES, property);
}

function isJson(value: any): boolean {
  return isJsonLike(value) && validator.isJSON(value);
}

function isJsonLike(value: any): boolean {
  return /^\[.*\]$|^{.*}$/g.test(value);
}

function parseProperties(concept: any, entityGid: any, entityProperties: any, timeConcepts: any): any {
  if (_.isEmpty(timeConcepts)) {
    return {};
  }

  let parsedProperties =
    _.chain(entityProperties)
      .pickBy((propValue: any, prop: any) => timeConcepts[prop])
      .mapValues(toInternalTimeForm)
      .value();

  if (timeConcepts[concept.gid]) {
    parsedProperties = _.extend(parsedProperties || {}, {[concept.gid]: toInternalTimeForm(entityGid)});
  }
  return parsedProperties;
}

function toInternalTimeForm(value: any): any {
  const timeDescriptor = ddfTimeUtils.parseTime(value);
  return {
    millis: _.get(timeDescriptor, 'time'),
    timeType: _.get(timeDescriptor, 'type')
  };
}

function toNumeric(value: any): any {
  const numericValue = value && _.toNumber(value);
  return !_.isNaN(numericValue) && _.isNumber(numericValue) ? numericValue : null;
}

function toBoolean(value: any): boolean {
  if (value === 'TRUE' || value === 'FALSE') {
    return value === 'TRUE';
  }

  if (_.isBoolean(value)) {
    return Boolean(value);
  }

  return null;
}

function cloneDdfRepo(pipe: any, done: Function): void {
  logger.info('Clone ddf repo: ', pipe.github, pipe.commit);
  return reposService.cloneRepo(pipe.github, pipe.commit, (error: string, repoInfo: any) => {
    if (error) {
      return done(error, pipe);
    }

    pipe.repoInfo = repoInfo;

    return done(null, pipe);
  });
}

async function cloneImportedDdfRepos(): Promise<any> {
  if (!config.THRASHING_MACHINE) {
    return Promise.resolve();
  }

  const datasets = await DatasetsRepository.findAll();
  return new Promise((resolve: Function) => {
    async.eachLimit(datasets, os.cpus().length, (dataset: any, onDownloaded: Function) => {
      cloneDdfRepo({github: dataset.path}, (error: any) => {
        if (error) {
          logger.error(error);
        }
        onDownloaded();
      });
    }, () => resolve());
  });
}

function validateDdfRepo(pipe: any, onDdfRepoValidated: Function): void {
  logger.info('Start ddf dataset validation process: ', _.get(pipe.repoInfo, 'pathToRepo'), ddfValidationConfig);

  const simpleDdfValidator = new SimpleDdfValidator(pipe.repoInfo.pathToRepo, _.extend({excludeRules: 'NON_UNIQUE_ENTITY_VALUE'}, ddfValidationConfig));
  simpleDdfValidator.on('finish', (error: string, isDatasetCorrect: boolean) => {
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

function generateDiffForDatasetUpdate(context: any, done: Function): void {
  logger.info('Generating diff for dataset update');
  const {hashFrom, hashTo, github} = context;
  return wsCli.generateDiff({
    hashFrom,
    hashTo,
    github,
    resultPath: config.PATH_TO_DIFF_DDF_RESULT_FILE
  }, (error: string, diffPaths: any) => {
    if (error) {
      return done(error);
    }

    logger.info('Generated diff is:');
    logger.info({obj: diffPaths});

    const {diff: pathToDatasetDiff, lang: pathToLangDiff} = diffPaths;
    return done(null, _.extend(context, {pathToDatasetDiff, pathToLangDiff}));
  });
}

function resolvePathToDdfFolder(pipe: any, done: Function): void {
  const pathToDdfFolder = reposService.getPathToRepo(pipe.datasetName);
  pipe.pathToDdfFolder = pathToDdfFolder;

  return async.setImmediate(() => done(null, pipe));
}

function getDatapackage(context: any, done: Function): void {
  logger.info('Loading datapackage.json');

  const pathToDdfRepo = reposService.getPathToRepo(context.datasetName);
  return datapackageParser.loadDatapackage({folder: pathToDdfRepo}, (error: string, datapackage: any) => {
    if (error) {
      logger.error('Datapackage was not loaded');
      return done(error);
    }

    context.datapackage = datapackage;
    return done(error, context);
  });
}

function findPreviousTransaction(pipe: any, done: Function): void {
  logger.info('Find latest successful transaction');

  DatasetTransactionsRepository.findLatestCompletedByDataset(pipe.dataset._id, (err: string, latestTransaction: any) => {
    if (err) {
      return done(err);
    }

    pipe.previousTransaction = latestTransaction;
    return done(err, pipe);
  });
}

function createTransaction(pipe: any, done: Function): void {
  logger.info('create transaction');

  const transaction = {
    createdAt: Date.now(),
    createdBy: pipe.user._id,
    commit: pipe.commit
  };

  DatasetTransactionsRepository.create(transaction, (err: string, createdTransaction: any) => {
    if (err) {
      return done(err, pipe);
    }

    pipe.transaction = createdTransaction;
    return done(null, pipe);
  });
}

function closeTransaction(pipe: any, done: Function): void {
  logger.info('close transaction');

  const options = {
    transactionId: pipe.transaction._id,
    transactionStartTime: pipe.transaction.createdAt
  };

  DatasetTransactionsRepository.closeTransaction(options, (err: string) => {
    return done(err, pipe);
  });
}

function createDataset(pipe: any, done: Function): void {
  logger.info('create data set');

  const dataset = {
    name: pipe.datasetName,
    path: pipe.github,
    createdAt: pipe.transaction.createdAt,
    createdBy: pipe.user._id,
    private: pipe.isDatasetPrivate
  };

  DatasetsRepository.create(dataset, (err: string, createdDataset: any) => {
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

function findDataset(pipe: any, done: Function): any {
  logger.info('Searching for existing dataset: ', pipe.datasetName);

  return DatasetsRepository.findByName(pipe.datasetName, (err: string, dataset: any) => {
    if (err) {
      return done(err);
    }

    if (!dataset) {
      return done('Dataset was not found');
    }

    logger.info('Existing dataset was found: ', dataset.name);

    pipe.dataset = dataset;
    return done(err, pipe);
  });
}

function establishTransactionForDataset(pipe: any, done: Function): void {
  logger.info('Establishing current transaction for dataset');

  const options = {
    transactionId: pipe.transaction._id,
    datasetId: pipe.dataset._id
  };

  DatasetTransactionsRepository.establishForDataset(options, (err: string) => done(err, pipe));
}

function updateTransactionLanguages(pipe: any, done: Function): void {
  logger.info('update transaction languages');

  const options = {
    transactionId: pipe.transaction._id,
    languages: _.map(pipe.datapackage.translations, 'id')
  };

  DatasetTransactionsRepository.updateLanguages(options, (err: string) => done(err, pipe));
}

function startStreamProcessing(stream: any, externalContext: any, done: Function): void {
  const errors = [];
  return stream
  .stopOnError((error: string) => errors.push(error))
  .done(() => {
    if (!_.isEmpty(errors)) {
      return done(errors, externalContext);
    }
    return done(null, externalContext);
  });
}
