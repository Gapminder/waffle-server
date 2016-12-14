require('../../ws.config/db.config');
require('../../ws.repository/index');

const _ = require('lodash');
const async = require('async');
const constants = require('../../ws.utils/constants');
const proxyquire = require('proxyquire');
const chai  = require('chai');
const expect = chai.expect;

const datasetsRepositoryPath = '../ws.repository/ddf/datasets/datasets.repository';
const transactionsRepositoryPath = '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository';
const datasetIndexRepositoryPath = '../ws.repository/ddf/dataset-index/dataset-index.repository';

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
    expect(datasetPath).to.be.equal(expectedDatasetPath);
    return onDatasetFound(null, expectedRemovableDataset);
  },
  unlock: (datasetPath, onDatasetFound) => {
    expect(datasetPath).to.be.equal(expectedDatasetPath);
    return onDatasetFound(null, expectedRemovableDataset);
  },
  findByName: (datasetPath, onDatasetFound) => {
    expect(datasetPath).to.be.equal(expectedDatasetPath);
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

describe('remove dataset', function() {

  it('should return error when something went wrong during trying to find dataset', (done) => {
    const findByName = (datasetPath, onDatasetFound) => {
      expect(datasetPath).to.be.equal(expectedDatasetPath);
      return onDatasetFound(expectedError);
    };

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: _.defaults({findByName}, datasetsRepository)
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(expectedError);
      return done();
    });
  });

  it('should return error when remove non-existed dataset', (done) => {
    const findByName = (datasetPath, onDatasetFound) => {
      expect(datasetPath).to.be.equal(expectedDatasetPath);
      return onDatasetFound(null, null);
    };

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: _.defaults({findByName}, datasetsRepository)
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(`Dataset was not found for the given name: ${expectedDatasetPath}`);
      return done();
    });
  });

  it('should return error when not owner tries to remove dataset', (done) => {
    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: datasetsRepository
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedNotOwnerUser, (error) => {
      expect(error).to.be.equal(`You cannot perform operations on dataset which is not created by you.`);
      return done();
    });
  });

  it('should return error when something went wrong during trying to lock dataset', (done) => {
    const lock = (datasetPath, onDatasetFound) => {
      expect(datasetPath).to.be.equal(expectedDatasetPath);
      return onDatasetFound(expectedError);
    };

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: _.defaults({lock}, datasetsRepository)
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(expectedError);
      return done();
    });
  });

  it('should return error when dataset is locked', (done) => {
    const lock = (datasetPath, onDatasetFound) => {
      expect(datasetPath).to.be.equal(expectedDatasetPath);
      return onDatasetFound();
    };

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: _.defaults({lock}, datasetsRepository)
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(`Version of dataset "${expectedDatasetPath}" was already locked`);
      return done();
    });
  });

  it('should return error when something went wrong during trying to find default transaction for current dataset', (done) => {
    const findDefault = (options, onTransactionFound) => {
      expect(options).to.deep.equal({datasetId: expectedRemovableDataset._id});
      return onTransactionFound(expectedError);
    };

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: datasetsRepository,
      [transactionsRepositoryPath]: _.defaults({findDefault}, transactionsRepository)
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(expectedError);
      return done();
    });
  });

  it('should return error when something went wrong during trying to unlock dataset', (done) => {
    const expectedTansactions = {
      _id: '581375e0c217aa1a36712f0e',
      commit: '1234567',
      isDefault: true,
      isClosed: true,
      createdBy: expectedOwnerUserId,
      dataset: expectedRemovableDataset._id
    };

    const unlock = (datasetPath, onDatasetFound) => {
      expect(datasetPath).to.be.equal(expectedDatasetPath);
      return onDatasetFound(expectedError);
    };
    const findDefault = (options, onTransactionFound) => {
      expect(options).to.deep.equal({datasetId: expectedRemovableDataset._id});
      return onTransactionFound(null, expectedTansactions);
    };

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: _.defaults({unlock}, datasetsRepository),
      [transactionsRepositoryPath]: _.defaults({findDefault}, transactionsRepository)
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(expectedError);
      return done();
    });
  });

  it('should return error when dataset has default version', (done) => {
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

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: datasetsRepository,
      [transactionsRepositoryPath]: _.defaults({findDefault}, transactionsRepository)
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.equal('Default dataset couldn\'t be removed');
      return done();
    });
  });

  it('should return error when something went wrong during trying to remove all documents from collection datasetindexes', function(done) {
    this.timeout(20000);

    const datasetIndexRepository = {
      removeByDataset: (datasetId, onDatasetIndexRemoved) => {
        expect(datasetId).to.deep.equal(expectedRemovableDataset._id);
        return onDatasetIndexRemoved(expectedError);
      }
    };

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: datasetsRepository,
      [transactionsRepositoryPath]: transactionsRepository,
      [datasetIndexRepositoryPath]: datasetIndexRepository
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(expectedError);
      return done();
    });
  });

  it('should return error when something went wrong during trying to remove all transactions for current dataset', (done) => {
    const removeAllByDataset = (datasetId, onTransactionsRemoved) => {
      expect(datasetId).to.deep.equal(expectedRemovableDataset._id);
      return onTransactionsRemoved(expectedError);
    };

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: datasetsRepository,
      [transactionsRepositoryPath]: _.defaults({removeAllByDataset}, transactionsRepository)
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(expectedError);
      return done();
    });
  });

  it('should return error when something went wrong during trying to remove dataset', (done) => {
    const removeById = (datasetId, onDatasetRemoved) => {
      expect(datasetId).to.deep.equal(expectedRemovableDataset._id);
      return onDatasetRemoved(expectedError);
    };

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: _.defaults({removeById}, datasetsRepository),
      [transactionsRepositoryPath]: transactionsRepository
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(expectedError);
      return done();
    });
  });

  it('should remove dataset without errors', (done) => {
    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: datasetsRepository,
      [transactionsRepositoryPath]: transactionsRepository
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.undefined;
      return done();
    });
  });

});
