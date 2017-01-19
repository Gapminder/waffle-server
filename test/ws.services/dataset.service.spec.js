require('../../ws.config/db.config');
require('../../ws.repository/index');

const _ = require('lodash');
const async = require('async');
const constants = require('../../ws.utils/constants');
const proxyquire = require('proxyquire');
const sinon  = require('sinon');
const chai  = require('chai');
const expect = chai.expect;

const indexRepository = require('../../ws.repository/ddf/dataset-index/dataset-index.repository');
const conceptsRepositoryFactory = require('../../ws.repository/ddf/concepts/concepts.repository');
const entitiesRepositoryFactory = require('../../ws.repository/ddf/entities/entities.repository');
const datapointsRepositoryFactory = require('../../ws.repository/ddf/data-points/data-points.repository');

const shouldNotCall = () => expect.fail(null, null, 'This function should not be called');

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
      [datasetsRepositoryPath]: _.defaults({findByName, lock: shouldNotCall, unlock: shouldNotCall, removeById: shouldNotCall}, datasetsRepository),
      [transactionsRepositoryPath]: _.defaults({findDefault: shouldNotCall, removeAllByDataset: shouldNotCall}, transactionsRepository)
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
      [datasetsRepositoryPath]: _.defaults({findByName, lock: shouldNotCall, unlock: shouldNotCall, removeById: shouldNotCall}, datasetsRepository),
      [transactionsRepositoryPath]: _.defaults({findDefault: shouldNotCall, removeAllByDataset: shouldNotCall}, transactionsRepository)
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.be.equal(`Dataset was not found for the given name: ${expectedDatasetPath}`);
      return done();
    });
  });

  it('should return error when not owner tries to remove dataset', (done) => {
    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: _.defaults({lock: shouldNotCall, unlock: shouldNotCall, removeById: shouldNotCall}, datasetsRepository),
      [transactionsRepositoryPath]: _.defaults({findDefault: shouldNotCall, removeAllByDataset: shouldNotCall}, transactionsRepository)
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
      [datasetsRepositoryPath]: _.defaults({lock, unlock: shouldNotCall, removeById: shouldNotCall}, datasetsRepository),
      [transactionsRepositoryPath]: _.defaults({findDefault: shouldNotCall, removeAllByDataset: shouldNotCall}, transactionsRepository)
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
      [datasetsRepositoryPath]: _.defaults({lock, unlock: shouldNotCall, removeById: shouldNotCall}, datasetsRepository),
      [transactionsRepositoryPath]: _.defaults({findDefault: shouldNotCall, removeAllByDataset: shouldNotCall}, transactionsRepository)
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
      [datasetsRepositoryPath]: _.defaults({unlock: shouldNotCall, removeById: shouldNotCall}, datasetsRepository),
      [transactionsRepositoryPath]: _.defaults({findDefault, removeAllByDataset: shouldNotCall}, transactionsRepository)
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
      [datasetsRepositoryPath]: _.defaults({unlock, removeById: shouldNotCall}, datasetsRepository),
      [transactionsRepositoryPath]: _.defaults({findDefault, removeAllByDataset: shouldNotCall}, transactionsRepository)
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
      [datasetsRepositoryPath]: _.defaults({removeById: shouldNotCall}, datasetsRepository),
      [transactionsRepositoryPath]: _.defaults({findDefault, removeAllByDataset: shouldNotCall}, transactionsRepository)
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
      [datasetsRepositoryPath]: _.defaults({removeById: shouldNotCall}, datasetsRepository),
      [transactionsRepositoryPath]: _.defaults({removeAllByDataset: shouldNotCall}, transactionsRepository),
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
      [datasetsRepositoryPath]: _.defaults({removeById: shouldNotCall}, datasetsRepository),
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

  it('should fail removing datapoints on error', sinon.test(function(done) {

    const expectedError = 'Boo!';

    this.stub(conceptsRepositoryFactory, 'versionAgnostic', () => {
      return {
        removeByDataset: (datasetId, done) => {
          done();
        }
      };
    });

    this.stub(entitiesRepositoryFactory, 'versionAgnostic', () => {
      return {
        removeByDataset: (datasetId, done) => {
          done();
        }
      };
    });

    this.stub(indexRepository, 'removeByDataset', (datasetId, done) => {
      done();
    });

    this.stub(datapointsRepositoryFactory, 'versionAgnostic', () => {
      return {
        findIdsByDatasetAndLimit: (datasetId, limit, done) => {
          done(expectedError);
        }
      };
    });

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: datasetsRepository,
      [transactionsRepositoryPath]: transactionsRepository
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, error => {
      expect(error).to.equal(expectedError);
      return done();
    });
  }));

  it('should consider datapoints removal successful if no more datapoints returned from db', sinon.test(function(done) {
    this.stub(conceptsRepositoryFactory, 'versionAgnostic', () => {
      return {
        removeByDataset: (datasetId, done) => {
          done();
        }
      };
    });

    this.stub(entitiesRepositoryFactory, 'versionAgnostic', () => {
      return {
        removeByDataset: (datasetId, done) => {
          done();
        }
      };
    });

    this.stub(indexRepository, 'removeByDataset', (datasetId, done) => {
      done();
    });

    const datapointsRepository = {
      findIdsByDatasetAndLimit: () => {},
    };

    const findIdsByDatasetAndLimitStub = this.stub(datapointsRepository, 'findIdsByDatasetAndLimit', (datasetId, limit, done) => {
      done(null, []);
    });

    this.stub(datapointsRepositoryFactory, 'versionAgnostic', () => {
      return datapointsRepository;
    });

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: datasetsRepository,
      [transactionsRepositoryPath]: transactionsRepository
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, error => {
      expect(error).to.not.exist;

      sinon.assert.calledOnce(findIdsByDatasetAndLimitStub);
      sinon.assert.calledWith(findIdsByDatasetAndLimitStub, expectedRemovableDataset._id, 50000);

      return done();
    });
  }));

  it('should respond with an error if it has happened during datapoints removal', sinon.test(function(done) {

    const expectedError = 'Boo!';
    const expectedFoundDatapointsIds = ['1', '2'];

    this.stub(conceptsRepositoryFactory, 'versionAgnostic', () => {
      return {
        removeByDataset: (datasetId, done) => {
          done();
        }
      };
    });

    this.stub(entitiesRepositoryFactory, 'versionAgnostic', () => {
      return {
        removeByDataset: (datasetId, done) => {
          done();
        }
      };
    });

    this.stub(indexRepository, 'removeByDataset', (datasetId, done) => {
      done();
    });

    const datapointsRepository = {
      findIdsByDatasetAndLimit: () => {},
      removeByIds: () => {},
    };

    const removeByIdsStub = this.stub(datapointsRepository, 'removeByIds', (datasetId, done) => {
      done(expectedError);
    });

    const findIdsByDatasetAndLimitStub = this.stub(datapointsRepository, 'findIdsByDatasetAndLimit', (datasetId, limit, done) => {
      done(null, expectedFoundDatapointsIds);
    });

    this.stub(datapointsRepositoryFactory, 'versionAgnostic', () => {
      return datapointsRepository;
    });

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: datasetsRepository,
      [transactionsRepositoryPath]: transactionsRepository
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, error => {
      expect(error).to.equal(expectedError);

      sinon.assert.calledOnce(findIdsByDatasetAndLimitStub);
      sinon.assert.calledWith(findIdsByDatasetAndLimitStub, expectedRemovableDataset._id, 50000);

      sinon.assert.calledOnce(removeByIdsStub);
      sinon.assert.calledWith(removeByIdsStub, expectedFoundDatapointsIds);

      return done();
    });
  }));


  it('should remove datapoints recursively', sinon.test(function(done) {

    const expectedError = 'Boo!';
    const expectedFoundDatapointsIds = ['1', '2'];

    this.stub(conceptsRepositoryFactory, 'versionAgnostic', () => {
      return {
        removeByDataset: (datasetId, done) => {
          done();
        }
      };
    });

    this.stub(entitiesRepositoryFactory, 'versionAgnostic', () => {
      return {
        removeByDataset: (datasetId, done) => {
          done();
        }
      };
    });

    this.stub(indexRepository, 'removeByDataset', (datasetId, done) => {
      done();
    });

    const datapointsRepository = {
      findIdsByDatasetAndLimit: () => {},
      removeByIds: () => {},
    };

    const removeByIdsStub = this.stub(datapointsRepository, 'removeByIds', (datasetId, done) => {
      done();
    });


    const findIdsByDatasetAndLimitStub = this.stub(datapointsRepository, 'findIdsByDatasetAndLimit');
    findIdsByDatasetAndLimitStub
      .onFirstCall().callsArgWith(2, null, expectedFoundDatapointsIds)
      .onSecondCall().callsArgWith(2, null, []);

    this.stub(datapointsRepositoryFactory, 'versionAgnostic', () => {
      return datapointsRepository;
    });

    const datasetsService = proxyquire('../../ws.services/datasets.service', {
      [datasetsRepositoryPath]: datasetsRepository,
      [transactionsRepositoryPath]: transactionsRepository
    });

    datasetsService.removeDatasetData(expectedDatasetPath, expectedOwnerUser, (error) => {
      expect(error).to.not.exist;

      sinon.assert.calledTwice(findIdsByDatasetAndLimitStub);
      sinon.assert.calledWith(findIdsByDatasetAndLimitStub, expectedRemovableDataset._id, 50000);

      sinon.assert.calledOnce(removeByIdsStub);
      sinon.assert.calledWith(removeByIdsStub, expectedFoundDatapointsIds);

      return done();
    });
  }));
});
