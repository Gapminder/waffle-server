import 'mocha';

import '../../ws.repository';
import '../../ws.config/db.config';

import {expect} from 'chai';
import * as _ from 'lodash';
import * as sinon from 'sinon';
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
  lock: (datasetPath, onDatasetFound) => {
    expect(datasetPath).to.be.equal(expectedDatasetName);
    return onDatasetFound(null, expectedRemovableDataset);
  },
  unlock: (datasetPath, onDatasetFound) => {
    expect(datasetPath).to.be.equal(expectedDatasetName);
    return onDatasetFound(null, expectedRemovableDataset);
  },
  findByName: (datasetName, onDatasetFound) => {
    expect(datasetName).to.be.equal(expectedDatasetName);
    return onDatasetFound(null, expectedRemovableDataset);
  },
  removeById: (datasetId, onDatasetRemoved) => {
    expect(datasetId).to.deep.equal(expectedRemovableDataset._id);
    return onDatasetRemoved();
  }
};

const transactionsRepository = {
  findDefault: (options, onTransactionFound) => {
    expect(options).to.deep.equal({datasetId: expectedRemovableDataset._id});
    return onTransactionFound();
  },
  removeAllByDataset: (datasetId, onTransactionsRemoved) => {
    expect(datasetId).to.deep.equal(expectedRemovableDataset._id);
    return onTransactionsRemoved();
  }
};

const DATAPOINTS_TO_REMOVE_CHUNK_SIZE = 50000;

describe('remove dataset', function () {
  let loggerInfoStub;

  beforeEach(() => {
    loggerInfoStub = sinon.stub(logger, 'info')
  });

  afterEach(() => {
    sinon.restore(logger);
  });

  it('should return error when something went wrong during trying to find dataset', sinon.test(function (done) {
    const findByNameStub = this.stub(DatasetsRepository, 'findByName', (datasetPath, onDatasetFound) => {
      return onDatasetFound(expectedError);
    });
    const lockStub = this.stub(DatasetsRepository, 'lock');
    const unlockStub = this.stub(DatasetsRepository, 'unlock');
    const removeByIdStub = this.stub(DatasetsRepository, 'removeById');
    const findDefaultStub = this.stub(DatasetTransactionsRepository, 'findDefault');
    const removeAllByDatasetStub = this.stub(DatasetTransactionsRepository, 'removeAllByDataset');

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(expectedError);

      sinon.assert.calledOnce(findByNameStub);
      sinon.assert.calledWith(findByNameStub, expectedDatasetPath);

      sinon.assert.notCalled(lockStub);
      sinon.assert.notCalled(unlockStub);
      sinon.assert.notCalled(removeByIdStub);
      sinon.assert.notCalled(findDefaultStub);
      sinon.assert.notCalled(removeAllByDatasetStub);

      return done();
    });
  }));

  it('should return error when remove non-existed dataset', sinon.test(function (done) {
    const findByNameStub = this.stub(DatasetsRepository, 'findByName', (datasetPath, onDatasetFound) => {
      return onDatasetFound(null, null);
    });
    const lockStub = this.stub(DatasetsRepository, 'lock');
    const unlockStub = this.stub(DatasetsRepository, 'unlock');
    const removeByIdStub = this.stub(DatasetsRepository, 'removeById');
    const findDefaultStub = this.stub(DatasetTransactionsRepository, 'findDefault');
    const removeAllByDatasetStub = this.stub(DatasetTransactionsRepository, 'removeAllByDataset');

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(`Dataset was not found for the given name: ${expectedDatasetPath}`);

      sinon.assert.calledOnce(findByNameStub);
      sinon.assert.calledWith(findByNameStub, expectedDatasetPath);

      sinon.assert.notCalled(lockStub);
      sinon.assert.notCalled(unlockStub);
      sinon.assert.notCalled(removeByIdStub);
      sinon.assert.notCalled(findDefaultStub);
      sinon.assert.notCalled(removeAllByDatasetStub);

      return done();
    });
  }));

  it('should return error when not owner tries to remove dataset', sinon.test(function (done) {
    const findByNameStub = this.stub(DatasetsRepository, 'findByName', (datasetPath, onDatasetFound) => onDatasetFound(null, expectedRemovableDataset));

    const lockStub = this.stub(DatasetsRepository, 'lock');
    const unlockStub = this.stub(DatasetsRepository, 'unlock');
    const removeByIdStub = this.stub(DatasetsRepository, 'removeById');
    const findDefaultStub = this.stub(DatasetTransactionsRepository, 'findDefault');
    const removeAllByDatasetStub = this.stub(DatasetTransactionsRepository, 'removeAllByDataset');

    datasetsService.removeDatasetData(expectedDatasetPath, expectedNotOwnerUser, (error) => {
      expect(error).to.be.equal(`You cannot perform operations on dataset which is not created by you.`);

      sinon.assert.calledOnce(findByNameStub);
      sinon.assert.calledWith(findByNameStub, expectedDatasetPath);

      sinon.assert.notCalled(lockStub);
      sinon.assert.notCalled(unlockStub);
      sinon.assert.notCalled(removeByIdStub);
      sinon.assert.notCalled(findDefaultStub);
      sinon.assert.notCalled(removeAllByDatasetStub);

      return done();
    });
  }));

  it('should return error when something went wrong during trying to lock dataset', function (done) {
    const findByName = (datasetName, onDatasetFound) => {
      return onDatasetFound(null, expectedRemovableDataset);
    };
    const lock = (datasetName, onDatasetFound) => {
      expect(datasetName).to.be.equal(expectedDatasetName);
      return onDatasetFound(expectedError);
    };

    const DatasetsRepositoryStub = _.defaults({
      findByName,
      lock,
      unlock: shouldNotCall,
      removeById: shouldNotCall
    }, datasetsRepository);
    const DatasetTransactionsRepositoryStub = _.defaults({
      findDefault: shouldNotCall,
      removeAllByDataset: shouldNotCall
    }, transactionsRepository);
    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: {DatasetsRepository: DatasetsRepositoryStub},
      [transactionsRepositoryPath]: {DatasetTransactionsRepository: DatasetTransactionsRepositoryStub}
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(expectedError);
      return done();
    });
  });

  it('should return error when dataset is locked', function (done) {
    const findByName = (datasetName, onDatasetFound) => {
      return onDatasetFound(null, expectedRemovableDataset);
    };

    const lock = (datasetName, onDatasetFound) => {
      expect(datasetName).to.be.equal(expectedDatasetName);
      return onDatasetFound();
    };

    const DatasetsRepositoryStub = _.defaults({
      findByName,
      lock,
      unlock: shouldNotCall,
      removeById: shouldNotCall
    }, datasetsRepository);
    const DatasetTransactionsRepositoryStub = _.defaults({
      findDefault: shouldNotCall,
      removeAllByDataset: shouldNotCall
    }, transactionsRepository);
    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: {DatasetsRepository: DatasetsRepositoryStub},
      [transactionsRepositoryPath]: {DatasetTransactionsRepository: DatasetTransactionsRepositoryStub}
    });

    datasetsService.removeDatasetData(expectedDatasetName, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(`Version of dataset "${expectedDatasetName}" was already locked or dataset is absent`);
      return done();
    });
  });

  it('should return error when something went wrong during trying to find default transaction for current dataset', function (done) {
    const findByName = (datasetName, onDatasetFound) => {
      return onDatasetFound(null, expectedRemovableDataset);
    };
    const lock = (datasetName, onDatasetFound) => {
      expect(datasetName).to.be.equal(expectedDatasetName);
      return onDatasetFound(null, expectedRemovableDataset);
    };
    const findDefault = (options, onTransactionFound) => {
      expect(options).to.deep.equal({datasetId: expectedRemovableDataset._id});
      return onTransactionFound(expectedError);
    };

    const DatasetsRepositoryStub = _.defaults({
      findByName,
      lock,
      unlock: shouldNotCall,
      removeById: shouldNotCall
    }, datasetsRepository);
    const DatasetTransactionsRepositoryStub = _.defaults({
      findDefault,
      removeAllByDataset: shouldNotCall
    }, transactionsRepository);

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: {DatasetsRepository: DatasetsRepositoryStub},
      [transactionsRepositoryPath]: {DatasetTransactionsRepository: DatasetTransactionsRepositoryStub}
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(expectedError);
      return done();
    });
  });

  it('should return error when something went wrong during trying to unlock dataset', function (done) {
    const expectedTansactions = {
      _id: '581375e0c217aa1a36712f0e',
      commit: '1234567',
      isDefault: true,
      isClosed: true,
      createdBy: expectedOwnerUserId,
      dataset: expectedRemovableDataset._id
    };

    const unlock = (datasetName, onDatasetFound) => {
      expect(datasetName).to.be.equal(expectedDatasetName);
      return onDatasetFound(expectedError);
    };
    const findDefault = (options, onTransactionFound) => {
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

  it('should return error when dataset has default version', function (done) {
    const expectedTansactions = {
      _id: '581375e0c217aa1a36712f0e',
      commit: '1234567',
      isDefault: true,
      isClosed: true,
      createdBy: expectedOwnerUserId,
      dataset: expectedRemovableDataset._id
    };

    const findDefault = (options, onTransactionFound) => {
      expect(options).to.deep.equal({datasetId: expectedRemovableDataset._id});
      return onTransactionFound(null, expectedTansactions);
    };

    const DatasetsRepositoryStub = _.defaults({removeById: shouldNotCall}, datasetsRepository);
    const DatasetTransactionsRepositoryStub = _.defaults({
      findDefault,
      removeAllByDataset: shouldNotCall
    }, transactionsRepository);

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: {DatasetsRepository: DatasetsRepositoryStub},
      [transactionsRepositoryPath]: {DatasetTransactionsRepository: DatasetTransactionsRepositoryStub}
    });

    datasetsService.removeDatasetData(expectedDatasetName, expectedOwnerUser, (error) => {
      expect(error).to.be.equal('Default dataset couldn\'t be removed');
      return done();
    });
  });

  it('should return error when something went wrong during trying to remove all documents from collection datasetindexes', sinon.test(function (done) {
    this.timeout(20000);

    const datasetIndexRepository = {
      removeByDataset: (datasetId, onDatasetIndexRemoved) => {
        expect(datasetId).to.deep.equal(expectedRemovableDataset._id);
        return onDatasetIndexRemoved(expectedError);
      }
    };

    const lockStub = this.stub(DatasetsRepository, 'lock', datasetsRepository.lock);
    const findDefaultStub = this.stub(DatasetTransactionsRepository, 'findDefault', transactionsRepository.findDefault);
    const findByNameStub = this.stub(DatasetsRepository, 'findByName', datasetsRepository.findByName);
    const removeByDatasetStub = this.stub(DatasetSchemaRepository, 'removeByDataset', datasetIndexRepository.removeByDataset);

    const datapointsRepository = {
      findIdsByDatasetAndLimit: _.noop,
      removeByIds: _.noop
    };

    const expectedDatapoints = [];

    const findIdsByDatasetAndLimitStub = this.stub(datapointsRepository, 'findIdsByDatasetAndLimit');
    findIdsByDatasetAndLimitStub
      .onFirstCall().callsArgWithAsync(2, null, expectedDatapoints);

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

      return done();
    });
  }));

  it('should return error when something went wrong during trying to remove all transactions for current dataset', sinon.test(function (done) {
    const lockedDataset = _.defaults({isLocked: true}, expectedRemovableDataset);

    const lockStub = this.stub(DatasetsRepository, 'lock').callsArgWithAsync(1, null, lockedDataset);
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

    const conceptsRemoveByDatasetStub = this.stub(conceptsRepository, 'removeByDataset')
      .callsArgWithAsync(1, null, {result: {n: 5}});
    const entitiesRemoveByDatasetStub = this.stub(entitiesRepository, 'removeByDataset')
      .callsArgWithAsync(1, null, {result: {n: 5}});
    const removeByIdsStub = this.stub(datapointsRepository, 'removeByIds')
      .callsArgWithAsync(1, null);
    const findIdsByDatasetAndLimitStub = this.stub(datapointsRepository, 'findIdsByDatasetAndLimit');
    findIdsByDatasetAndLimitStub
      .onFirstCall().callsArgWithAsync(2, null, expectedDatapoints)
      .onSecondCall().callsArgWithAsync(2, null, []);

    const conceptsVersionAgnosticStub = this.stub(ConceptsRepositoryFactory, 'versionAgnostic').returns(conceptsRepository);
    const entitiesVersionAgnosticStub = this.stub(EntitiesRepositoryFactory, 'versionAgnostic').returns(entitiesRepository);
    const datapointsVersionAgnosticStub = this.stub(DatapointsRepositoryFactory, 'versionAgnostic').returns(datapointsRepository);

    const findDefaultStub = this.stub(DatasetTransactionsRepository, 'findDefault').callsArgWithAsync(1, null, null);
    const removeAllByDatasetStub = this.stub(DatasetTransactionsRepository, 'removeAllByDataset').callsArgWithAsync(1, expectedError);

    datasetService.removeDatasetData(expectedDatasetName, expectedOwnerUser, (error) => {
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

      sinon.assert.calledTwice(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, sinon.match(`Removing datapoints`), sinon.match(2).or(sinon.match(0)));
      return done();
    });
  }));

  it('should return error when something went wrong during trying to remove dataset', sinon.test(function (done) {
    const removeById = (datasetId, onDatasetRemoved) => {
      expect(datasetId).to.deep.equal(expectedRemovableDataset._id);
      return onDatasetRemoved(expectedError);
    };

    const DatasetsRepositoryStub = _.defaults({removeById}, datasetsRepository);

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: {DatasetsRepository: DatasetsRepositoryStub},
      [transactionsRepositoryPath]: {DatasetTransactionsRepository: DatasetTransactionsRepository}
    });

    datasetsService.removeDatasetData(expectedDatasetName, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(expectedError);
      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Removing datapoints`, 0);
      return done();
    });
  }));

  it('should remove dataset without errors', sinon.test(function (done) {
    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: {DatasetsRepository: datasetsRepository},
      [transactionsRepositoryPath]: {DatasetTransactionsRepository: transactionsRepository}
    });

    datasetsService.removeDatasetData(expectedDatasetName, expectedOwnerUser, (error) => {
      expect(error).to.be.null;
      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Removing datapoints`, 0);
      return done();
    });
  }));

  it('should fail removing datapoints on error', sinon.test(function (done) {

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

    this.stub(DatasetSchemaRepository, 'removeByDataset', (datasetId, done) => {
      done();
    });

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

      sinon.assert.notCalled(unlockStub);

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

      return done();
    });
  }));

  it('should consider datapoints removal successful if no more datapoints returned from db', sinon.test(function (done) {

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

    this.stub(DatasetSchemaRepository, 'removeByDataset', (datasetId, done) => {
      done();
    });

    const datapointsRepository = {
      findIdsByDatasetAndLimit: () => {
      },
    };

    const findIdsByDatasetAndLimitStub = this.stub(datapointsRepository, 'findIdsByDatasetAndLimit', (datasetId, limit, done) => {
      done(null, []);
    });

    this.stub(DatapointsRepositoryFactory, 'versionAgnostic', () => {
      return datapointsRepository;
    });

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

      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Removing datapoints`, 0);

      return done();
    });
  }));

  it('should respond with an error if it has happened during datapoints removal', sinon.test(function (done) {

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

    this.stub(DatasetSchemaRepository, 'removeByDataset', (datasetId, done) => {
      done();
    });

    const datapointsRepository = {
      findIdsByDatasetAndLimit: () => {
      },
      removeByIds: () => {
      },
    };

    const removeByIdsStub = this.stub(datapointsRepository, 'removeByIds', (datasetId, done) => {
      done(expectedError);
    });

    const findIdsByDatasetAndLimitStub = this.stub(datapointsRepository, 'findIdsByDatasetAndLimit', (datasetId, limit, done) => {
      done(null, expectedFoundDatapointsIds);
    });

    this.stub(DatapointsRepositoryFactory, 'versionAgnostic', () => {
      return datapointsRepository;
    });

    datasetsService.removeDatasetData(expectedDatasetName, expectedOwnerUser, error => {
      expect(error).to.equal(expectedError);

      sinon.assert.calledOnce(lockStub);
      sinon.assert.calledWith(lockStub, expectedDatasetName);

      sinon.assert.notCalled(unlockStub);

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

      return done();
    });
  }));

  it('should respond with an error if it happens during concepts removal', sinon.test(function (done) {
    const expectedError = 'Concepts boo!';

    const lockStub = this.stub(DatasetsRepository, 'lock', datasetsRepository.lock);
    const findDefaultStub = this.stub(DatasetTransactionsRepository, 'findDefault', transactionsRepository.findDefault);
    const findByNameStub = this.stub(DatasetsRepository, 'findByName', datasetsRepository.findByName);

    this.stub(ConceptsRepositoryFactory, 'versionAgnostic', () => {
      return {
        removeByDataset: (datasetId, done) => {
          done(expectedError);
        }
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

      return done();
    });
  }));

  it('should respond with an error if it happens during entities removal', sinon.test(function (done) {
    const expectedError = 'Entities boo!';

    const lockStub = this.stub(DatasetsRepository, 'lock', datasetsRepository.lock);
    const findByNameStub = this.stub(DatasetsRepository, 'findByName', datasetsRepository.findByName);

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
          done(expectedError);
        }
      };
    });

    datasetsService.removeDatasetData(expectedDatasetName, expectedOwnerUser, (error) => {
      expect(error).to.equal(expectedError);

      sinon.assert.calledOnce(lockStub);
      sinon.assert.calledWith(lockStub, expectedDatasetName);

      sinon.assert.calledOnce(findByNameStub);
      sinon.assert.calledWith(findByNameStub, expectedDatasetName);

      done();
    });
  }));

  it('should remove datapoints recursively', sinon.test(function (done) {
    const expectedFoundDatapointsIds = ['1', '2'];

    const lockStub = this.stub(DatasetsRepository, 'lock', datasetsRepository.lock);
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

    this.stub(DatasetSchemaRepository, 'removeByDataset', (datasetId, done) => {
      done();
    });

    const datapointsRepository = {
      findIdsByDatasetAndLimit: () => {
      },
      removeByIds: () => {
      },
    };

    const removeByIdsStub = this.stub(datapointsRepository, 'removeByIds', (datasetId, done) => {
      done();
    });

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

  it('should track dataset removal statistics', sinon.test(function (done) {
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

    this.stub(DatasetSchemaRepository, 'removeByDataset', (datasetId, done) => {
      done();
    });

    const datapointsRepository = {
      findIdsByDatasetAndLimit: () => {
      },
      removeByIds: () => {
      },
    };

    this.stub(datapointsRepository, 'removeByIds', (datasetId, done) => {
      done();
    });

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

  it('should grab information about dataset removal process', sinon.test(function (done) {
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

  it('should respond with an error if it has happened while grabbing information about dataset removal process', sinon.test(function (done) {
    const datasetName = 'datasetName';
    const user = {
      _id: 'user42'
    };

    const expectedError = 'Boo!';

    const findByNameStub = this.stub(DatasetsRepository, 'findByName');
    findByNameStub.onFirstCall().callsArgWithAsync(1, expectedError);

    datasetsService.getRemovalStateForDataset(datasetName, user, (error, removalState) => {
      expect(removalState).to.not.exist;
      expect(error).to.equal(expectedError);
      done();
    });
  }));
});
