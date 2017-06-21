import 'mocha';

import '../../ws.repository';
import '../../ws.config/db.config';

import {expect} from 'chai';
import * as _ from 'lodash';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import * as proxyquire from 'proxyquire';

import {DatasetsRepository} from '../../ws.repository/ddf/datasets/datasets.repository';
import {DatasetTransactionsRepository} from '../../ws.repository/ddf/dataset-transactions/dataset-transactions.repository';

import {DatasetSchemaRepository} from '../../ws.repository/ddf/dataset-index/dataset-index.repository';
import {ConceptsRepositoryFactory} from '../../ws.repository/ddf/concepts/concepts.repository';
import {EntitiesRepositoryFactory} from '../../ws.repository/ddf/entities/entities.repository';
import {DatapointsRepositoryFactory} from '../../ws.repository/ddf/data-points/data-points.repository';

import * as datasetsService from '../../ws.services/datasets.service';
import {logger} from '../../ws.config/log';

import {DatasetRemovalTracker} from '../../ws.services/datasets-removal-tracker';

import * as datasetService from '../../ws.services/datasets.service';
import set = Reflect.set;

const shouldNotCall = () => expect.fail(null, null, 'This function should not be called');

const sandbox = sinonTest.configureTest(sinon);

const datasetsRepositoryPath = '../ws.repository/ddf/datasets/datasets.repository';
const transactionsRepositoryPath = '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository';

const expectedError = 'Something went wrong';
const expectedDatasetName = 'open-numbers/ddf--gapminder--systema_globalis.git';
const expectedDatasetPath = `git@github.com:${expectedDatasetName}`;
const expectedOwnerUserId = '584ed0de0ed7b24ccf2ddf4b';

const expectedRemovableDataset = {
  _id: '581375e0c217aa1a36712f10',
  name: expectedDatasetName,
  path: expectedDatasetPath,
  isLocked: false,
  createdBy: expectedOwnerUserId
};

const expectedOwnerUser = {
  _id: expectedOwnerUserId
};

const expectedNotOwnerUser = {
  _id: '581375e0c217aa1a36712f1f'
};

const datasetsRepository = {
  lock: (datasetPath: string, onDatasetFound: Function) => {
    expect(datasetPath).to.be.equal(expectedDatasetName);
    return onDatasetFound(null, expectedRemovableDataset);
  },
  unlock: (datasetPath: string, onDatasetFound: Function) => {
    expect(datasetPath).to.be.equal(expectedDatasetName);
    return onDatasetFound(null, expectedRemovableDataset);
  },
  findByName: (datasetName: string, onDatasetFound: Function) => {
    expect(datasetName).to.be.equal(expectedDatasetName);
    return onDatasetFound(null, expectedRemovableDataset);
  },
  removeById: (datasetId: string, onDatasetRemoved: Function) => {
    expect(datasetId).to.deep.equal(expectedRemovableDataset._id);
    return onDatasetRemoved();
  }
};

const transactionsRepository = {
  findDefault: (options: any, onTransactionFound: Function) => {
    expect(options).to.deep.equal({datasetId: expectedRemovableDataset._id});
    return onTransactionFound();
  },
  removeAllByDataset: (datasetId: string, onTransactionsRemoved: Function) => {
    expect(datasetId).to.deep.equal(expectedRemovableDataset._id);
    return onTransactionsRemoved();
  }
};

const DATAPOINTS_TO_REMOVE_CHUNK_SIZE = 50000;

describe('Remove Dataset Service', () => {
  let loggerInfoStub;

  beforeEach(() => {
    loggerInfoStub = sinon.stub(logger, 'info');
  });

  afterEach(() => {
    sinon.restore(logger);
  });

  it('should return error when something went wrong during trying to find dataset', sandbox(function (done: Function) {
    const findByNameStub = this.stub(DatasetsRepository, 'findByName').callsArgWithAsync(1, expectedError);

    const lockStub = this.stub(DatasetsRepository, 'lock');
    const unlockStub = this.stub(DatasetsRepository, 'unlock').callsArgWithAsync(1, null, {});
    const removeByIdStub = this.stub(DatasetsRepository, 'removeById');
    const findDefaultStub = this.stub(DatasetTransactionsRepository, 'findDefault');
    const removeAllByDatasetStub = this.stub(DatasetTransactionsRepository, 'removeAllByDataset');

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(expectedError);

      sinon.assert.calledOnce(findByNameStub);
      sinon.assert.calledWith(findByNameStub, expectedDatasetPath);

      sinon.assert.calledOnce(unlockStub);
      sinon.assert.calledWith(unlockStub, expectedDatasetPath);

      sinon.assert.notCalled(lockStub);
      sinon.assert.notCalled(removeByIdStub);
      sinon.assert.notCalled(findDefaultStub);
      sinon.assert.notCalled(removeAllByDatasetStub);

      return done();
    });
  }));

  it('should return error when remove non-existed dataset', sandbox(function (done: Function) {
    const findByNameStub = this.stub(DatasetsRepository, 'findByName').callsArgWithAsync(1, null, null);

    const lockStub = this.stub(DatasetsRepository, 'lock');
    const unlockStub = this.stub(DatasetsRepository, 'unlock').callsArgWithAsync(1, null, {});
    const removeByIdStub = this.stub(DatasetsRepository, 'removeById');
    const findDefaultStub = this.stub(DatasetTransactionsRepository, 'findDefault');
    const removeAllByDatasetStub = this.stub(DatasetTransactionsRepository, 'removeAllByDataset');

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(`Dataset was not found for the given name: ${expectedDatasetPath}`);

      sinon.assert.calledOnce(findByNameStub);
      sinon.assert.calledWith(findByNameStub, expectedDatasetPath);

      sinon.assert.calledOnce(unlockStub);
      sinon.assert.calledWith(unlockStub, expectedDatasetPath);

      sinon.assert.notCalled(lockStub);
      sinon.assert.notCalled(removeByIdStub);
      sinon.assert.notCalled(findDefaultStub);
      sinon.assert.notCalled(removeAllByDatasetStub);

      return done();
    });
  }));

  it('should return error when not owner tries to remove dataset', sandbox(function (done: Function) {
    const findByNameStub = this.stub(DatasetsRepository, 'findByName').callsArgWithAsync(1, null, expectedRemovableDataset);

    const lockStub = this.stub(DatasetsRepository, 'lock');
    const unlockStub = this.stub(DatasetsRepository, 'unlock').callsArgWithAsync(1, null, {});
    const removeByIdStub = this.stub(DatasetsRepository, 'removeById');
    const findDefaultStub = this.stub(DatasetTransactionsRepository, 'findDefault');
    const removeAllByDatasetStub = this.stub(DatasetTransactionsRepository, 'removeAllByDataset');

    datasetsService.removeDatasetData(expectedDatasetPath, expectedNotOwnerUser, (error) => {
      expect(error).to.be.equal(`You cannot perform operations on dataset which is not created by you.`);

      sinon.assert.calledOnce(findByNameStub);
      sinon.assert.calledWith(findByNameStub, expectedDatasetPath);

      sinon.assert.calledOnce(unlockStub);
      sinon.assert.calledWith(unlockStub, expectedDatasetPath);

      sinon.assert.notCalled(lockStub);
      sinon.assert.notCalled(removeByIdStub);
      sinon.assert.notCalled(findDefaultStub);
      sinon.assert.notCalled(removeAllByDatasetStub);

      return done();
    });
  }));

  it('should return error when something went wrong during trying to lock dataset', function (done: Function) {
    const findByName = (datasetName: string, onDatasetFound: Function) => {
      return onDatasetFound(null, expectedRemovableDataset);
    };

    const lock = (datasetName: string, onDatasetFound: Function) => {
      expect(datasetName).to.be.equal(expectedDatasetName);
      return onDatasetFound(expectedError);
    };

    const unlock = (datasetName: string, onDatasetFound: Function) => {
      return onDatasetFound(null, expectedRemovableDataset);
    };

    const DatasetsRepositoryStub = _.defaults({findByName, lock, unlock, removeById: shouldNotCall}, datasetsRepository);
    const DatasetTransactionsRepositoryStub = _.defaults({findDefault: shouldNotCall, removeAllByDataset: shouldNotCall}, transactionsRepository);
    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: {DatasetsRepository: DatasetsRepositoryStub},
      [transactionsRepositoryPath]: {DatasetTransactionsRepository: DatasetTransactionsRepositoryStub}
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(expectedError);
      return done();
    });
  });

  it('should return error when dataset is locked', function (done: Function) {
    const findByName = (datasetName: string, onDatasetFound: Function) => {
      return onDatasetFound(null, expectedRemovableDataset);
    };

    const lock = (datasetName: string, onDatasetFound: Function) => {
      expect(datasetName).to.be.equal(expectedDatasetName);
      return onDatasetFound();
    };

    const unlock = (datasetName: string, onDatasetFound: Function) => {
      return onDatasetFound(null, expectedRemovableDataset);
    };

    const DatasetsRepositoryStub = _.defaults({findByName, lock, unlock, removeById: shouldNotCall}, datasetsRepository);
    const DatasetTransactionsRepositoryStub = _.defaults({findDefault: shouldNotCall, removeAllByDataset: shouldNotCall}, transactionsRepository);
    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: {DatasetsRepository: DatasetsRepositoryStub},
      [transactionsRepositoryPath]: {DatasetTransactionsRepository: DatasetTransactionsRepositoryStub}
    });

    datasetsService.removeDatasetData(expectedDatasetName, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(`Version of dataset "${expectedDatasetName}" was already locked or dataset is absent`);
      return done();
    });
  });

  it('should return error when something went wrong during trying to find default transaction for current dataset', function (done: Function) {
    const findByName = (datasetName: string, onDatasetFound: Function) => {
      return onDatasetFound(null, expectedRemovableDataset);
    };

    const lock = (datasetName: string, onDatasetFound: Function) => {
      expect(datasetName).to.be.equal(expectedDatasetName);
      return onDatasetFound(null, expectedRemovableDataset);
    };

    const findDefault = (options: any, onTransactionFound: Function) => {
      expect(options).to.deep.equal({datasetId: expectedRemovableDataset._id});
      return onTransactionFound(expectedError);
    };

    const unlock = (datasetName: string, onDatasetFound: Function) => {
      return onDatasetFound(null, expectedRemovableDataset);
    };

    const DatasetsRepositoryStub = _.defaults({findByName, lock, unlock, removeById: shouldNotCall}, datasetsRepository);
    const DatasetTransactionsRepositoryStub = _.defaults({findDefault, removeAllByDataset: shouldNotCall}, transactionsRepository);

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: {DatasetsRepository: DatasetsRepositoryStub},
      [transactionsRepositoryPath]: {DatasetTransactionsRepository: DatasetTransactionsRepositoryStub}
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(expectedError);
      return done();
    });
  });

  it('should return error when something went wrong during trying to unlock dataset', function (done: Function) {
    const expectedTansactions = {
      _id: '581375e0c217aa1a36712f0e',
      commit: '1234567',
      isDefault: true,
      isClosed: true,
      createdBy: expectedOwnerUserId,
      dataset: expectedRemovableDataset._id
    };

    const unlock = (datasetName: string, onDatasetFound: Function) => {
      expect(datasetName).to.be.equal(expectedDatasetName);
      return onDatasetFound(expectedError);
    };

    const findDefault = (options, onTransactionFound: Function) => {
      expect(options).to.deep.equal({datasetId: expectedRemovableDataset._id});
      return onTransactionFound(null, expectedTansactions);
    };

    const DatasetsRepositoryStub = _.defaults({unlock, removeById: shouldNotCall}, datasetsRepository);
    const DatasetTransactionsRepositoryStub = _.defaults({
      findDefault,
      removeAllByDataset: shouldNotCall
    }, transactionsRepository);

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: {DatasetsRepository: DatasetsRepositoryStub},
      [transactionsRepositoryPath]: {DatasetTransactionsRepository: DatasetTransactionsRepositoryStub}
    });

    datasetsService.removeDatasetData(expectedDatasetName, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(expectedError);
      return done();
    });
  });

  it('should return error when dataset has default version', function (done: Function) {
    const expectedTansactions = {
      _id: '581375e0c217aa1a36712f0e',
      commit: '1234567',
      isDefault: true,
      isClosed: true,
      createdBy: expectedOwnerUserId,
      dataset: expectedRemovableDataset._id
    };

    const findDefault = (options: any, onTransactionFound: Function) => {
      expect(options).to.deep.equal({datasetId: expectedRemovableDataset._id});
      return onTransactionFound(null, expectedTansactions);
    };

    const unlock = (datasetName: string, onDatasetFound: Function) => {
      return onDatasetFound(null, expectedRemovableDataset);
    };

    const DatasetsRepositoryStub = _.defaults({removeById: shouldNotCall, unlock}, datasetsRepository);
    const DatasetTransactionsRepositoryStub = _.defaults({findDefault, removeAllByDataset: shouldNotCall}, transactionsRepository);

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: {DatasetsRepository: DatasetsRepositoryStub},
      [transactionsRepositoryPath]: {DatasetTransactionsRepository: DatasetTransactionsRepositoryStub}
    });

    datasetsService.removeDatasetData(expectedDatasetName, expectedOwnerUser, (error) => {
      expect(error).to.be.equal('Default dataset couldn\'t be removed');
      return done();
    });
  });

  it('should return error when something went wrong during trying to remove all documents from collection datasetindexes', sandbox(function (done: Function) {
    this.timeout(20000);

    const lockStub = this.stub(DatasetsRepository, 'lock').callsArgWithAsync(1, null, expectedRemovableDataset);
    const unlockStub = this.stub(DatasetsRepository, 'unlock').callsArgWithAsync(1, null, {});
    const findDefaultStub = this.stub(DatasetTransactionsRepository, 'findDefault').callsArgWithAsync(1);
    const findByNameStub = this.stub(DatasetsRepository, 'findByName').callsArgWithAsync(1, null, expectedRemovableDataset);
    const removeByDatasetStub = this.stub(DatasetSchemaRepository, 'removeByDataset').callsArgWithAsync(1, expectedError);

    const datapointsRepository = {
      findIdsByDatasetAndLimit: _.noop,
      removeByIds: _.noop
    };

    const expectedDatapoints = [];

    const findIdsByDatasetAndLimitStub = this.stub(datapointsRepository, 'findIdsByDatasetAndLimit').callsArgWithAsync(2, null, expectedDatapoints);
    const datapointsVersionAgnosticStub = this.stub(DatapointsRepositoryFactory, 'versionAgnostic').returns(datapointsRepository);

    datasetsService.removeDatasetData(expectedDatasetName, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(expectedError);

      sinon.assert.calledOnce(datapointsVersionAgnosticStub);

      sinon.assert.calledOnce(lockStub);
      sinon.assert.calledWith(lockStub, expectedDatasetName);

      sinon.assert.calledOnce(findDefaultStub);
      sinon.assert.calledWith(findDefaultStub, {datasetId: expectedRemovableDataset._id});

      sinon.assert.calledOnce(findByNameStub);
      sinon.assert.calledWith(findByNameStub, expectedDatasetName);

      sinon.assert.calledOnce(findIdsByDatasetAndLimitStub);
      sinon.assert.calledWith(findIdsByDatasetAndLimitStub, expectedRemovableDataset._id, DATAPOINTS_TO_REMOVE_CHUNK_SIZE);

      sinon.assert.calledOnce(removeByDatasetStub);
      sinon.assert.calledWith(removeByDatasetStub, expectedRemovableDataset._id);

      sinon.assert.calledOnce(unlockStub);
      sinon.assert.calledWith(unlockStub, expectedDatasetName);

      return done();
    });
  }));

  it('should return error when something went wrong during trying to remove all transactions for current dataset', sandbox(function (done: Function) {
    const lockedDataset = _.defaults({isLocked: true}, expectedRemovableDataset);

    const lockStub = this.stub(DatasetsRepository, 'lock').callsArgWithAsync(1, null, lockedDataset);
    const unlockStub = this.stub(DatasetsRepository, 'unlock').callsArgWithAsync(1, null, {});
    const findByNameStub = this.stub(DatasetsRepository, 'findByName').callsArgWithAsync(1, null, expectedRemovableDataset);
    const removeByIdStub = this.stub(DatasetsRepository, 'removeById');
    const conceptsRepository = {
      removeByDataset: _.noop
    };
    const entitiesRepository = {
      removeByDataset: _.noop
    };
    const datapointsRepository = {
      findIdsByDatasetAndLimit: _.noop,
      removeByIds: _.noop
    };

    const expectedDatapoints = [{_id: 'DATAPOINTID1'}, {_id: 'DATAPOINTID2'}];

    const conceptsRemoveByDatasetStub = this.stub(conceptsRepository, 'removeByDataset').callsArgWithAsync(1, null, {result: {n: 5}});
    const entitiesRemoveByDatasetStub = this.stub(entitiesRepository, 'removeByDataset').callsArgWithAsync(1, null, {result: {n: 5}});
    const removeByIdsStub = this.stub(datapointsRepository, 'removeByIds').callsArgWithAsync(1);
    const findIdsByDatasetAndLimitStub = this.stub(datapointsRepository, 'findIdsByDatasetAndLimit');
    findIdsByDatasetAndLimitStub
      .onFirstCall().callsArgWithAsync(2, null, expectedDatapoints)
      .onSecondCall().callsArgWithAsync(2, null, []);

    const conceptsVersionAgnosticStub = this.stub(ConceptsRepositoryFactory, 'versionAgnostic').returns(conceptsRepository);
    const entitiesVersionAgnosticStub = this.stub(EntitiesRepositoryFactory, 'versionAgnostic').returns(entitiesRepository);
    const datapointsVersionAgnosticStub = this.stub(DatapointsRepositoryFactory, 'versionAgnostic').returns(datapointsRepository);

    const findDefaultStub = this.stub(DatasetTransactionsRepository, 'findDefault').callsArgWithAsync(1, null, null);
    const removeAllByDatasetStub = this.stub(DatasetTransactionsRepository, 'removeAllByDataset').callsArgWithAsync(1, expectedError);

    const removeByDatasetStub = this.stub(DatasetSchemaRepository, 'removeByDataset').callsArgWithAsync(1, null);

    datasetService.removeDatasetData(expectedDatasetName, expectedOwnerUser, (error: any) => {
      expect(error).to.be.equal(expectedError);

      sinon.assert.calledOnce(conceptsVersionAgnosticStub);
      sinon.assert.calledOnce(entitiesVersionAgnosticStub);
      sinon.assert.calledTwice(datapointsVersionAgnosticStub);

      sinon.assert.calledOnce(conceptsRemoveByDatasetStub);
      sinon.assert.calledWith(conceptsRemoveByDatasetStub, expectedRemovableDataset._id);

      sinon.assert.calledOnce(entitiesRemoveByDatasetStub);
      sinon.assert.calledWith(entitiesRemoveByDatasetStub, expectedRemovableDataset._id);

      sinon.assert.calledOnce(removeByIdsStub);
      sinon.assert.calledWith(removeByIdsStub, expectedDatapoints);

      sinon.assert.calledOnce(findByNameStub);
      sinon.assert.calledWith(findByNameStub, expectedDatasetName);

      sinon.assert.calledOnce(lockStub);
      sinon.assert.calledWith(lockStub, expectedDatasetName);

      sinon.assert.notCalled(removeByIdStub);

      sinon.assert.calledTwice(findIdsByDatasetAndLimitStub);
      sinon.assert.calledWith(findIdsByDatasetAndLimitStub, expectedRemovableDataset._id, DATAPOINTS_TO_REMOVE_CHUNK_SIZE);

      sinon.assert.calledOnce(findDefaultStub);
      sinon.assert.calledWith(findDefaultStub, {datasetId: expectedRemovableDataset._id});

      sinon.assert.calledOnce(removeAllByDatasetStub);
      sinon.assert.calledWith(removeAllByDatasetStub, expectedRemovableDataset._id);

      sinon.assert.calledOnce(removeByDatasetStub);
      sinon.assert.calledWith(removeByDatasetStub, expectedRemovableDataset._id, sinon.match.func);

      sinon.assert.calledTwice(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, sinon.match(`Removing datapoints`), sinon.match(2).or(sinon.match(0)));

      sinon.assert.calledOnce(unlockStub);
      sinon.assert.calledWith(unlockStub, expectedDatasetName);

      return done();
    });
  }));

  it('should return error when something went wrong while trying to remove a dataset', sandbox(function (done: Function) {
    this.stub(DatasetsRepository, 'removeById').callsArgWithAsync(1, expectedError);
    this.stub(DatasetsRepository, 'unlock').callsArgWithAsync(1, null, expectedRemovableDataset);
    this.stub(DatasetsRepository, 'lock').callsArgWithAsync(1, null, expectedRemovableDataset);
    this.stub(DatasetsRepository, 'findByName').callsArgWithAsync(1, null, expectedRemovableDataset);

    const conceptsRepository = {
      removeByDataset: _.noop
    };
    const entitiesRepository = {
      removeByDataset: _.noop
    };
    const datapointsRepository = {
      findIdsByDatasetAndLimit: _.noop,
      removeByIds: _.noop
    };

    this.stub(conceptsRepository, 'removeByDataset').callsArgWithAsync(1, null, {result: {n: 5}});
    this.stub(entitiesRepository, 'removeByDataset').callsArgWithAsync(1, null, {result: {n: 5}});
    this.stub(datapointsRepository, 'removeByIds').callsArgWithAsync(1);
    this.stub(datapointsRepository, 'findIdsByDatasetAndLimit').callsArgWithAsync(2, null, []);

    this.stub(ConceptsRepositoryFactory, 'versionAgnostic').returns(conceptsRepository);
    this.stub(EntitiesRepositoryFactory, 'versionAgnostic').returns(entitiesRepository);
    this.stub(DatapointsRepositoryFactory, 'versionAgnostic').returns(datapointsRepository);

    this.stub(DatasetSchemaRepository, 'removeByDataset').callsArgWithAsync(1, null);

    this.stub(DatasetTransactionsRepository, 'findDefault').callsArgWithAsync(1, null);
    this.stub(DatasetTransactionsRepository, 'removeAllByDataset').callsArgWithAsync(1, null);

    datasetsService.removeDatasetData(expectedDatasetName, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(expectedError);
      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Removing datapoints`, 0);
      return done();
    });
  }));

  it('should remove dataset without errors', sandbox(function (done: Function): void {
    this.stub(DatasetsRepository, 'removeById').callsArgWithAsync(1, null);
    this.stub(DatasetsRepository, 'unlock').callsArgWithAsync(1, null, expectedRemovableDataset);
    this.stub(DatasetsRepository, 'lock').callsArgWithAsync(1, null, expectedRemovableDataset);
    this.stub(DatasetsRepository, 'findByName').callsArgWithAsync(1, null, expectedRemovableDataset);

    const conceptsRepository = {
      removeByDataset: _.noop
    };
    const entitiesRepository = {
      removeByDataset: _.noop
    };
    const datapointsRepository = {
      findIdsByDatasetAndLimit: _.noop,
      removeByIds: _.noop
    };

    this.stub(conceptsRepository, 'removeByDataset').callsArgWithAsync(1, null, {result: {n: 5}});
    this.stub(entitiesRepository, 'removeByDataset').callsArgWithAsync(1, null, {result: {n: 5}});
    this.stub(datapointsRepository, 'removeByIds').callsArgWithAsync(1);
    this.stub(datapointsRepository, 'findIdsByDatasetAndLimit').callsArgWithAsync(2, null, []);

    this.stub(ConceptsRepositoryFactory, 'versionAgnostic').returns(conceptsRepository);
    this.stub(EntitiesRepositoryFactory, 'versionAgnostic').returns(entitiesRepository);
    this.stub(DatapointsRepositoryFactory, 'versionAgnostic').returns(datapointsRepository);

    this.stub(DatasetSchemaRepository, 'removeByDataset').callsArgWithAsync(1, null);

    this.stub(DatasetTransactionsRepository, 'findDefault').callsArgWithAsync(1, null);
    this.stub(DatasetTransactionsRepository, 'removeAllByDataset').callsArgWithAsync(1, null);

    datasetsService.removeDatasetData(expectedDatasetName, expectedOwnerUser, (error) => {
      expect(error).to.be.null;
      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Removing datapoints`, 0);
      return done();
    });
  }));

  it('should fail removing datapoints on error', sandbox(function (done: Function) {

    const expectedError = 'Boo!';

    const lockStub = this.stub(DatasetsRepository, 'lock', datasetsRepository.lock);
    const unlockStub = this.stub(DatasetsRepository, 'unlock', datasetsRepository.unlock);
    const findByNameStub = this.stub(DatasetsRepository, 'findByName', datasetsRepository.findByName);
    const removeByIdStub = this.stub(DatasetsRepository, 'removeById', datasetsRepository.removeById);
    const findDefaultStub = this.stub(DatasetTransactionsRepository, 'findDefault', transactionsRepository.findDefault);
    const removeAllByDatasetStub = this.stub(DatasetTransactionsRepository, 'removeAllByDataset', transactionsRepository.removeAllByDataset);

    this.stub(ConceptsRepositoryFactory, 'versionAgnostic', () => {
      return {
        removeByDataset: (datasetId, done) => {
          done(null, {result: {n: 12}});
        }
      };
    });

    this.stub(EntitiesRepositoryFactory, 'versionAgnostic', () => {
      return {
        removeByDataset: (datasetId, done) => {
          done(null, {result: {n: 42}});
        }
      };
    });

    this.stub(DatasetSchemaRepository, 'removeByDataset').callsArgWithAsync(1);

    this.stub(DatapointsRepositoryFactory, 'versionAgnostic', () => {
      return {
        findIdsByDatasetAndLimit: (datasetId, limit, done) => {
          done(expectedError);
        }
      };
    });

    const loggerErrorStub = this.stub(logger, 'error');

    datasetsService.removeDatasetData(expectedDatasetName, expectedOwnerUser, error => {
      expect(error).to.equal(expectedError);

      sinon.assert.calledOnce(lockStub);
      sinon.assert.calledWith(lockStub, expectedDatasetName);

      sinon.assert.calledOnce(findByNameStub);
      sinon.assert.calledWith(findByNameStub, expectedDatasetName);

      sinon.assert.notCalled(removeByIdStub);

      sinon.assert.calledOnce(findDefaultStub);
      sinon.assert.calledWith(findDefaultStub, {datasetId: expectedRemovableDataset._id});

      sinon.assert.notCalled(removeAllByDatasetStub);

      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Removing datapoints`, 0);

      sinon.assert.calledOnce(loggerErrorStub);
      sinon.assert.calledWithExactly(loggerErrorStub, `Datapoints removing error`, expectedError);

      sinon.assert.calledOnce(unlockStub);
      sinon.assert.calledWith(unlockStub, expectedDatasetName);

      return done();
    });
  }));

  it('should consider datapoints removal successful if no more datapoints returned from db', sandbox(function (done: Function) {

    const lockStub = this.stub(DatasetsRepository, 'lock', datasetsRepository.lock);
    const unlockStub = this.stub(DatasetsRepository, 'unlock', datasetsRepository.unlock);
    const findByNameStub = this.stub(DatasetsRepository, 'findByName', datasetsRepository.findByName);
    const removeByIdStub = this.stub(DatasetsRepository, 'removeById', datasetsRepository.removeById);
    const findDefaultStub = this.stub(DatasetTransactionsRepository, 'findDefault', transactionsRepository.findDefault);
    const removeAllByDatasetStub = this.stub(DatasetTransactionsRepository, 'removeAllByDataset', transactionsRepository.removeAllByDataset);

    this.stub(ConceptsRepositoryFactory, 'versionAgnostic', () => {
      return {
        removeByDataset: (datasetId, done) => {
          done(null, {result: {n: 42}});
        }
      };
    });

    this.stub(EntitiesRepositoryFactory, 'versionAgnostic', () => {
      return {
        removeByDataset: (datasetId, done) => {
          done(null, {result: {n: 42}});
        }
      };
    });

    const datapointsRepository = {
      findIdsByDatasetAndLimit(): any {
        // do nothing
      }
    };

    const findIdsByDatasetAndLimitStub = this.stub(datapointsRepository, 'findIdsByDatasetAndLimit').callsArgWithAsync(2, null, []);

    this.stub(DatapointsRepositoryFactory, 'versionAgnostic', () => {
      return datapointsRepository;
    });

    const removeByDatasetStub = this.stub(DatasetSchemaRepository, 'removeByDataset').callsArgWithAsync(1, null);

    datasetsService.removeDatasetData(expectedDatasetName, expectedOwnerUser, error => {
      expect(error).to.not.exist;

      sinon.assert.calledOnce(findIdsByDatasetAndLimitStub);
      sinon.assert.calledWith(findIdsByDatasetAndLimitStub, expectedRemovableDataset._id, 50000);

      sinon.assert.calledOnce(lockStub);
      sinon.assert.calledWith(lockStub, expectedDatasetName);

      sinon.assert.notCalled(unlockStub);

      sinon.assert.calledOnce(findByNameStub);
      sinon.assert.calledWith(findByNameStub, expectedDatasetName);

      sinon.assert.calledOnce(removeByIdStub);
      sinon.assert.calledWith(findByNameStub, expectedDatasetName);

      sinon.assert.calledOnce(findDefaultStub);
      sinon.assert.calledWith(findDefaultStub, {datasetId: expectedRemovableDataset._id});

      sinon.assert.calledOnce(removeAllByDatasetStub);
      sinon.assert.calledWith(findDefaultStub, {datasetId: expectedRemovableDataset._id});

      sinon.assert.calledOnce(findIdsByDatasetAndLimitStub);
      sinon.assert.calledWith(findIdsByDatasetAndLimitStub, expectedRemovableDataset._id, 50000);

      sinon.assert.calledOnce(removeByDatasetStub);
      sinon.assert.calledWith(removeByDatasetStub, expectedRemovableDataset._id, sinon.match.func);

      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Removing datapoints`, 0);

      return done();
    });
  }));

  it('should respond with an error if it has happened during datapoints removal', sandbox(function (done: Function) {

    const expectedError = 'Boo!';
    const expectedFoundDatapointsIds = ['1', '2'];

    const lockStub = this.stub(DatasetsRepository, 'lock', datasetsRepository.lock);
    const unlockStub = this.stub(DatasetsRepository, 'unlock', datasetsRepository.unlock);
    const findByNameStub = this.stub(DatasetsRepository, 'findByName', datasetsRepository.findByName);
    const removeByIdStub = this.stub(DatasetsRepository, 'removeById', datasetsRepository.removeById);
    const findDefaultStub = this.stub(DatasetTransactionsRepository, 'findDefault', transactionsRepository.findDefault);
    const removeAllByDatasetStub = this.stub(DatasetTransactionsRepository, 'removeAllByDataset', transactionsRepository.removeAllByDataset);

    this.stub(ConceptsRepositoryFactory, 'versionAgnostic', () => {
      return {
        removeByDataset: (datasetId, done) => {
          done(null, {result: {n: 42}});
        }
      };
    });

    this.stub(EntitiesRepositoryFactory, 'versionAgnostic', () => {
      return {
        removeByDataset: (datasetId, done) => {
          done(null, {result: {n: 42}});
        }
      };
    });

    this.stub(DatasetSchemaRepository, 'removeByDataset').callsArgWithAsync(1);

    const datapointsRepository = {
      findIdsByDatasetAndLimit: () => {
      },
      removeByIds: () => {
      },
    };

    const removeByIdsStub = this.stub(datapointsRepository, 'removeByIds').callsArgWithAsync(1, expectedError);
    const findIdsByDatasetAndLimitStub = this.stub(datapointsRepository, 'findIdsByDatasetAndLimit').callsArgWithAsync(2, null, expectedFoundDatapointsIds);

    this.stub(DatapointsRepositoryFactory, 'versionAgnostic', () => {
      return datapointsRepository;
    });

    datasetsService.removeDatasetData(expectedDatasetName, expectedOwnerUser, error => {
      expect(error).to.equal(expectedError);

      sinon.assert.calledOnce(lockStub);
      sinon.assert.calledWith(lockStub, expectedDatasetName);

      sinon.assert.calledOnce(findByNameStub);
      sinon.assert.calledWith(findByNameStub, expectedDatasetName);

      sinon.assert.notCalled(removeByIdStub);

      sinon.assert.calledOnce(findDefaultStub);
      sinon.assert.calledWith(findDefaultStub, {datasetId: expectedRemovableDataset._id});

      sinon.assert.notCalled(removeAllByDatasetStub);

      sinon.assert.calledOnce(findIdsByDatasetAndLimitStub);
      sinon.assert.calledWith(findIdsByDatasetAndLimitStub, expectedRemovableDataset._id, 50000);

      sinon.assert.calledOnce(removeByIdsStub);
      sinon.assert.calledWith(removeByIdsStub, expectedFoundDatapointsIds);

      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Removing datapoints`, expectedFoundDatapointsIds.length);

      sinon.assert.calledOnce(unlockStub);
      sinon.assert.calledWith(unlockStub, expectedDatasetName);

      return done();
    });
  }));

  it('should respond with an error if it happens during concepts removal', sandbox(function (done: Function) {
    const expectedError = 'Concepts boo!';

    const lockStub = this.stub(DatasetsRepository, 'lock', datasetsRepository.lock);
    const unlockStub = this.stub(DatasetsRepository, 'unlock', datasetsRepository.unlock);
    const findDefaultStub = this.stub(DatasetTransactionsRepository, 'findDefault', transactionsRepository.findDefault);
    const findByNameStub = this.stub(DatasetsRepository, 'findByName', datasetsRepository.findByName);

    this.stub(ConceptsRepositoryFactory, 'versionAgnostic', () => {
      return {
        removeByDataset: this.stub().callsArgWithAsync(1, expectedError)
      };
    });

    datasetsService.removeDatasetData(expectedDatasetName, expectedOwnerUser, (error) => {
      expect(error).to.equal(expectedError);

      sinon.assert.calledOnce(lockStub);
      sinon.assert.calledWith(lockStub, expectedDatasetName);

      sinon.assert.calledOnce(findDefaultStub);
      sinon.assert.calledWith(findDefaultStub, {datasetId: expectedRemovableDataset._id});

      sinon.assert.calledOnce(findByNameStub);
      sinon.assert.calledWith(findByNameStub, expectedDatasetName);

      sinon.assert.calledOnce(unlockStub);
      sinon.assert.calledWith(unlockStub, expectedDatasetName);

      return done();
    });
  }));

  it('should respond with an error if it happens during entities removal', sandbox(function (done: Function) {
    const expectedError = 'Entities boo!';

    const lockStub = this.stub(DatasetsRepository, 'lock').callsArgWithAsync(1, null, expectedRemovableDataset);
    const unlockStub = this.stub(DatasetsRepository, 'unlock').callsArgWithAsync(1, null);
    const findByNameStub = this.stub(DatasetsRepository, 'findByName').callsArgWithAsync(1, null, expectedRemovableDataset);

    this.stub(DatasetTransactionsRepository, 'findDefault').callsArgWithAsync(1, null);

    this.stub(ConceptsRepositoryFactory, 'versionAgnostic').returns({
      removeByDataset: this.stub().callsArgWithAsync(1, null, {result: {n: 42}})
    });

    this.stub(EntitiesRepositoryFactory, 'versionAgnostic').returns({
      removeByDataset: this.stub().callsArgWithAsync(1, expectedError)
    });

    datasetsService.removeDatasetData(expectedDatasetName, expectedOwnerUser, (error) => {
      expect(error).to.equal(expectedError);

      sinon.assert.calledOnce(lockStub);
      sinon.assert.calledWith(lockStub, expectedDatasetName);

      sinon.assert.calledOnce(findByNameStub);
      sinon.assert.calledWith(findByNameStub, expectedDatasetName);

      sinon.assert.calledOnce(unlockStub);
      sinon.assert.calledWith(unlockStub, expectedDatasetName);

      done();
    });
  }));

  it('should remove datapoints recursively', sandbox(function (done: Function) {
    const expectedFoundDatapointsIds = ['1', '2'];

    const lockStub = this.stub(DatasetsRepository, 'lock', datasetsRepository.lock);
    const findByNameStub = this.stub(DatasetsRepository, 'findByName', datasetsRepository.findByName);
    const removeByIdStub = this.stub(DatasetsRepository, 'removeById', datasetsRepository.removeById);
    const findDefaultStub = this.stub(DatasetTransactionsRepository, 'findDefault', transactionsRepository.findDefault);
    const removeAllByDatasetStub = this.stub(DatasetTransactionsRepository, 'removeAllByDataset', transactionsRepository.removeAllByDataset);

    this.stub(ConceptsRepositoryFactory, 'versionAgnostic').returns({
      removeByDataset: this.stub().callsArgWithAsync(1, null, {result: {n: 42}})
    });

    this.stub(EntitiesRepositoryFactory, 'versionAgnostic').returns({
      removeByDataset: this.stub().callsArgWithAsync(1, null, {result: {n: 42}})
    });

    this.stub(DatasetSchemaRepository, 'removeByDataset').callsArgWithAsync(1);

    const datapointsRepository = {
      findIdsByDatasetAndLimit: () => {
      },
      removeByIds: () => {
      },
    };

    const removeByIdsStub = this.stub(datapointsRepository, 'removeByIds').callsArgWithAsync(1);

    const findIdsByDatasetAndLimitStub = this.stub(datapointsRepository, 'findIdsByDatasetAndLimit');
    findIdsByDatasetAndLimitStub
      .onFirstCall().callsArgWith(2, null, expectedFoundDatapointsIds)
      .onSecondCall().callsArgWith(2, null, []);

    this.stub(DatapointsRepositoryFactory, 'versionAgnostic', () => {
      return datapointsRepository;
    });

    datasetsService.removeDatasetData(expectedDatasetName, expectedOwnerUser, (error) => {
      expect(error).to.not.exist;

      sinon.assert.calledTwice(findIdsByDatasetAndLimitStub);
      sinon.assert.calledWith(findIdsByDatasetAndLimitStub, expectedRemovableDataset._id, 50000);

      sinon.assert.calledOnce(removeByIdsStub);
      sinon.assert.calledWith(removeByIdsStub, expectedFoundDatapointsIds);

      sinon.assert.calledOnce(lockStub);
      sinon.assert.calledWith(lockStub, expectedDatasetName);


      sinon.assert.calledOnce(findByNameStub);
      sinon.assert.calledWith(findByNameStub, expectedDatasetName);

      sinon.assert.calledOnce(removeByIdStub);
      sinon.assert.calledWith(removeByIdStub, expectedRemovableDataset._id);

      sinon.assert.calledOnce(findDefaultStub);
      sinon.assert.calledWith(findDefaultStub, {datasetId: expectedRemovableDataset._id});

      sinon.assert.calledOnce(removeAllByDatasetStub);
      sinon.assert.calledWith(removeAllByDatasetStub, expectedRemovableDataset._id);

      sinon.assert.calledTwice(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, sinon.match(`Removing datapoints`), sinon.match(2).or(sinon.match(0)));

      return done();
    });
  }));

  it('should track dataset removal statistics', sandbox(function (done: Function) {
    const expectedFoundDatapointsIds = ['1', '2'];

    const lockStub = this.stub(DatasetsRepository, 'lock', datasetsRepository.lock);
    const unlockStub = this.stub(DatasetsRepository, 'unlock', datasetsRepository.unlock);
    const findByNameStub = this.stub(DatasetsRepository, 'findByName', datasetsRepository.findByName);
    const removeByIdStub = this.stub(DatasetsRepository, 'removeById', datasetsRepository.removeById);
    const findDefaultStub = this.stub(DatasetTransactionsRepository, 'findDefault', transactionsRepository.findDefault);
    const removeAllByDatasetStub = this.stub(DatasetTransactionsRepository, 'removeAllByDataset', transactionsRepository.removeAllByDataset);

    this.stub(ConceptsRepositoryFactory, 'versionAgnostic').returns({
      removeByDataset: this.stub().callsArgWithAsync(1, null, {result: {n: 12}})
    });

    this.stub(EntitiesRepositoryFactory, 'versionAgnostic').returns({
      removeByDataset: this.stub().callsArgWithAsync(1, null, {result: {n: 42}})
    });

    this.stub(DatasetSchemaRepository, 'removeByDataset').callsArgWithAsync(1);

    const datapointsRepository = {
      findIdsByDatasetAndLimit: () => {
      },
      removeByIds: () => {
      },
    };

    this.stub(datapointsRepository, 'removeByIds').callsArgWithAsync(1);

    const findIdsByDatasetAndLimitStub = this.stub(datapointsRepository, 'findIdsByDatasetAndLimit');
    findIdsByDatasetAndLimitStub
      .onFirstCall().callsArgWith(2, null, expectedFoundDatapointsIds)
      .onSecondCall().callsArgWith(2, null, []);

    this.stub(DatapointsRepositoryFactory, 'versionAgnostic', () => {
      return datapointsRepository;
    });

    const clearStatsForDatasetStub = this.stub(DatasetRemovalTracker, 'clean').returns();

    datasetsService.removeDatasetData(expectedDatasetName, expectedOwnerUser, (error) => {
      expect(error).to.not.exist;

      datasetsService.getRemovalStateForDataset(expectedDatasetName, expectedOwnerUser, (error, stats) => {
        sinon.assert.calledOnce(clearStatsForDatasetStub);

        expect(stats).to.deep.equal({
          concepts: 12,
          entities: 42,
          datapoints: 2
        });

        sinon.assert.calledOnce(lockStub);
        sinon.assert.calledWith(lockStub, expectedDatasetName);

        sinon.assert.notCalled(unlockStub);

        sinon.assert.calledTwice(findByNameStub);
        sinon.assert.calledWith(findByNameStub, expectedDatasetName);

        sinon.assert.calledOnce(removeByIdStub);
        sinon.assert.calledWith(removeByIdStub, expectedRemovableDataset._id);

        sinon.assert.calledOnce(findDefaultStub);
        sinon.assert.calledWith(findDefaultStub, {datasetId: expectedRemovableDataset._id});

        sinon.assert.calledOnce(removeAllByDatasetStub);
        sinon.assert.calledWith(removeAllByDatasetStub, expectedRemovableDataset._id);

        sinon.assert.calledTwice(loggerInfoStub);
        sinon.assert.calledWithExactly(loggerInfoStub, `Removing datapoints`, expectedFoundDatapointsIds.length);
        sinon.assert.calledWithExactly(loggerInfoStub, `Removing datapoints`, 0);

        return done();
      });
    });
  }));

  it('should grab information about dataset removal process', sandbox(function (done: Function) {
    const datasetName = 'datasetName';
    const user = {
      _id: 'user42'
    };

    const dataset = {
      _id: 'datasetId',
      createdBy: 'user42'
    };

    const findByNameStub = this.stub(DatasetsRepository, 'findByName');
    findByNameStub.onFirstCall().callsArgWithAsync(1, null, dataset);

    DatasetRemovalTracker.track(datasetName);

    datasetsService.getRemovalStateForDataset(datasetName, user, (error, removalState) => {
      expect(error).to.not.exist;
      expect(removalState).to.deep.equal({
        concepts: 0,
        entities: 0,
        datapoints: 0
      });
      DatasetRemovalTracker.clean(datasetName);
      done();
    });
  }));

  it('should respond with an error if it has happened while grabbing information about dataset removal process', sandbox(function (done: Function) {
    const datasetName = 'datasetName';
    const user = {
      _id: 'user42'
    };

    const expectedError = 'Boo!';

    const findByNameStub = this.stub(DatasetsRepository, 'findByName').callsArgWithAsync(1, expectedError);

    datasetsService.getRemovalStateForDataset(datasetName, user, (error, removalState) => {
      expect(removalState).to.not.exist;
      expect(error).to.equal(expectedError);

      sinon.assert.calledOnce(findByNameStub);
      sinon.assert.calledWith(findByNameStub, datasetName);

      done();
    });
  }));

  it(`shouldn't find dataset with versions: error while user searching`, sandbox(function(done: Function) {
    const expectedError = 'User search has failed';
    this.stub(DatasetsRepository, 'findByUser').callsArgWithAsync(1, expectedError);

    datasetsService.findDatasetsWithVersions(null, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it(`shouldn't find dataset with versions: error while completed transactions searching`, sandbox(function(done: Function) {
    const datasets = [
      {_id: 'ds1'},
      {_id: 'ds2'}
    ];

    const expectedError = 'Completed transactions searching error';

    this.stub(DatasetsRepository, 'findByUser').callsArgWithAsync(1, null, datasets);
    this.stub(DatasetTransactionsRepository, 'findAllCompletedByDataset').callsArgWithAsync(1, expectedError);

    datasetsService.findDatasetsWithVersions(null, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it(`should find dataset with versions`, sandbox(function (done: Function) {
    const datasets = [
      {
        _id: 'ds1',
        name: 'ds1Name',
        path: 'ds1Path'
      },
      {
        _id: 'ds2',
        name: 'ds2Name',
        path: 'ds2Path'
      }
    ];

    const currentTimeMillis = Date.now();

    const transactionsDs1 = [
      {
        commit: 'bbbbbbb',
        isDefault: false,
        createdAt: currentTimeMillis
      },
      {
        commit: 'ccccccc',
        isDefault: false,
        createdAt: currentTimeMillis
      }
    ];

    const transactionsDs2 = [
      {
        commit: 'aaaaaaa',
        isDefault: true,
        createdAt: currentTimeMillis
      }
    ];

    this.stub(DatasetsRepository, 'findByUser').callsArgWithAsync(1, null, datasets);
    const findAllCompletedByDatasetStub = this.stub(DatasetTransactionsRepository, 'findAllCompletedByDataset');
    findAllCompletedByDatasetStub
      .withArgs('ds1', sinon.match.func)
      .callsArgWithAsync(1, null, transactionsDs1);

    findAllCompletedByDatasetStub
      .withArgs('ds2', sinon.match.func)
      .callsArgWithAsync(1, null, transactionsDs2);

    datasetsService.findDatasetsWithVersions(null, (error, datasetWithVersions) => {
      expect(error).to.not.exist;
      expect(datasetWithVersions).to.deep.equal([
        {
          "id": "ds1",
          "isDefault": false,
          "name": "ds1Name",
          "path": "ds1Path",
          "versions": [
            {
              "commit": "bbbbbbb",
              "createdAt": new Date(currentTimeMillis),
              "isDefault": false
            },
            {
              "commit": "ccccccc",
              "createdAt": new Date(currentTimeMillis),
              "isDefault": false
            }
          ]
        },
        {
          "id": "ds2",
          "isDefault": true,
          "name": "ds2Name",
          "path": "ds2Path",
          "versions": [
            {
              "commit": "aaaaaaa",
              "createdAt": new Date(currentTimeMillis),
              "isDefault": true
            }
          ]
        }
      ]);
      done();
    });
  }));
});
