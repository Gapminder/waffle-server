'use strict';
require('../../ws.config/db.config');
require('../../ws.repository/index');

const _ = require('lodash');
const proxyquire = require('proxyquire');
const expect = require('chai').expect;

const datasetTransactionsServicePath = '../../ws.services/dataset-transactions.service.js';
const datasetServicePath = './datasets.service';
const datasetRepositoryPath = '../ws.repository/ddf/datasets/datasets.repository';
const transactionsRepositoryPath = '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository';
const datasetIndexRepositoryPath = '../ws.repository/ddf/dataset-index/dataset-index.repository';

const shouldNotCall = () => expect.fail(null, null, 'This function should not be called');

describe('Dataset Transactions Service', () => {

  describe('Getting default dataset and transaction - Dataset name and transaction commit are given', () => {
    it('should treat given dataset as default when it was provided along with commit', done => {
      const expectedCommit = 'ab76c6a';
      const expectedDatasetName = 'iam/myDataset';
      const inputCommit = 'ab76c6a99e10a1035b4fbb82cb72fe82de5cec9f';

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: 'datasetId', name: datasetName});
          }
        },
        '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository': {
          findByDatasetAndCommit: (datasetId, commit, onTransactionFound) => {
            onTransactionFound(null, {isClosed: true, commit});
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, inputCommit, (error, {dataset, transaction}) => {
        expect(error).to.not.exist;
        expect(dataset.name).to.equal(expectedDatasetName);
        expect(transaction.commit).to.equal(expectedCommit);
        done();
      });
    });

    it('should respond with an error when it occurred during dataset searching', done => {
      const expectedDatasetName = 'iam/myDataset';
      const inputCommit = 'ab76c6a99e10a1035b4fbb82cb72fe82de5cec9f';
      const datasetSearchingError = 'Error during dataset searching';

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(datasetSearchingError);
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, inputCommit, (error, anything) => {
        expect(error).to.equal(datasetSearchingError);
        done();
      });
    });

    it('should respond with an error when dataset was not found', done => {
      const expectedDatasetName = 'iam/myDataset';
      const inputCommit = 'ab76c6a99e10a1035b4fbb82cb72fe82de5cec9f';
      const datasetSearchingError = `Dataset was not found: ${expectedDatasetName}`;

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, null);
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, inputCommit, (error, anything) => {
        expect(error).to.equal(datasetSearchingError);
        done();
      });
    });

    it('should respond with an error when default transaction was not found', done => {
      const expectedDatasetName = 'iam/myDataset';
      const inputCommit = 'ab76c6a99e10a1035b4fbb82cb72fe82de5cec9f';
      const expectedCommit = 'ab76c6a';
      const transactionSearchingError = `Given transaction was not found: '${expectedCommit}'`;

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: 'datasetId', name: datasetName});
          }
        },
        '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository': {
          findByDatasetAndCommit: (datasetId, commit, onTransactionFound) => {
            onTransactionFound(null);
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, inputCommit, (error, anything) => {
        expect(error).to.equal(transactionSearchingError);
        done();
      });
    });

    it('should respond with an error when transaction is still in progress', done => {
      const expectedDatasetName = 'iam/myDataset';
      const inputCommit = 'ab76c6a99e10a1035b4fbb82cb72fe82de5cec9f';
      const expectedCommit = 'ab76c6a';
      const transactionSearchingError = `Given transaction was not found: '${expectedCommit}'`;

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: 'datasetId', name: datasetName});
          }
        },
        '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository': {
          findByDatasetAndCommit: (datasetId, commit, onTransactionFound) => {
            onTransactionFound(null, {isClosed: false});
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, inputCommit, (error, anything) => {
        expect(error).to.equal(transactionSearchingError);
        done();
      });
    });

    it('should respond with an error when transaction has errors', done => {
      const expectedDatasetName = 'iam/myDataset';
      const inputCommit = 'ab76c6a99e10a1035b4fbb82cb72fe82de5cec9f';
      const expectedCommit = 'ab76c6a';
      const transactionSearchingError = `Given transaction was not found: '${expectedCommit}'`;

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: 'datasetId', name: datasetName});
          }
        },
        '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository': {
          findByDatasetAndCommit: (datasetId, commit, onTransactionFound) => {
            onTransactionFound(null, {lastError: 'Boom!'});
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, inputCommit, (error, anything) => {
        expect(error).to.equal(transactionSearchingError);
        done();
      });
    });

    it('should respond with an error when error occurred during transaction searching', done => {
      const expectedDatasetName = 'iam/myDataset';
      const inputCommit = 'ab76c6a99e10a1035b4fbb82cb72fe82de5cec9f';
      const transactionSearchingError = `Boom!`;

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: 'datasetId', name: datasetName});
          }
        },
        '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository': {
          findByDatasetAndCommit: (datasetId, commit, onTransactionFound) => {
            onTransactionFound(transactionSearchingError);
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, inputCommit, (error, anything) => {
        expect(error).to.equal(transactionSearchingError);
        done();
      });
    });
  });

  describe('Getting default dataset and transaction - Only dataset name is given', () => {
    it('should respond with an error when it occurred during dataset searching', done => {
      const expectedDatasetName = 'iam/myDataset';
      const datasetSearchingError = 'Error during dataset searching';

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(datasetSearchingError);
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, null, (error, anything) => {
        expect(error).to.equal(datasetSearchingError);
        done();
      });
    });

    it('should respond with an error when dataset was not found', done => {
      const expectedDatasetName = 'iam/myDataset';
      const datasetSearchingError = `Dataset was not found: ${expectedDatasetName}`;

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, null);
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, null, (error, anything) => {
        expect(error).to.equal(datasetSearchingError);
        done();
      });
    });

    it('should respond with an error when error occurred while searching default transaction', done => {
      const expectedDatasetName = 'iam/myDataset';
      const expectedDatasetId = 'datasetId';
      const transactionSearchingError = `'Error happened while searching for a default transaction'`;

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: expectedDatasetId});
          }
        },
        '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository': {
          findDefault: ({datasetId}, onTransactionFound) => {
            expect(datasetId).to.equal(expectedDatasetId);
            onTransactionFound(transactionSearchingError);
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, null, (error, anything) => {
        expect(error).to.equal(transactionSearchingError);
        done();
      });
    });

    it('should respond with default dataset and transaction when default transaction was found', done => {
      const expectedDatasetName = 'iam/myDataset';
      const expectedDatasetId = 'datasetId';
      const expectedCommit = 'ab76c6a';

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: expectedDatasetId});
          }
        },
        '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository': {
          findDefault: ({datasetId}, onTransactionFound) => {
            onTransactionFound(null, {dataset: datasetId, commit: expectedCommit});
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, null, (error, {dataset, transaction}) => {
        expect(error).to.not.exist;
        expect(dataset._id).to.equal(expectedDatasetId);
        expect(transaction.dataset).to.equal(expectedDatasetId);
        expect(transaction.commit).to.equal(expectedCommit);
        done();
      });
    });

    it('should search for latest completed transaction when no default found for given dataset', done => {
      const expectedDatasetName = 'iam/myDataset';
      const expectedDatasetId = 'datasetId';

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: expectedDatasetId});
          }
        },
        '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository': {
          findDefault: (anything, onTransactionFound) => {
            onTransactionFound(null);
          },
          findLatestCompletedByDataset: (datasetId, onTransactionFound) => {
            onTransactionFound(null, {isClosed: true, dataset: datasetId});
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, null, (error, {dataset, transaction}) => {
        expect(error).to.not.exist;

        expect(dataset._id).to.equal(expectedDatasetId);

        expect(transaction.dataset).to.equal(expectedDatasetId);
        expect(transaction.isClosed).to.be.true;

        done();
      });
    });

    it('should fail when error occurred while searching for latest completed transaction if no default exists', done => {
      const expectedDatasetName = 'iam/myDataset';
      const expectedDatasetId = 'datasetId';
      const transactionError = 'Boom!';

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: expectedDatasetId});
          }
        },
        '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository': {
          findDefault: (anything, onTransactionFound) => {
            onTransactionFound(null);
          },
          findLatestCompletedByDataset: (datasetId, onTransactionFound) => {
            onTransactionFound(transactionError);
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, null, (error, anything) => {
        expect(error).to.equal(transactionError);
        expect(anything).to.not.exist;

        done();
      });
    });

    it('should fail when transaction found is still in progress for given dataset', done => {
      const expectedDatasetName = 'iam/myDataset';
      const expectedDatasetId = 'datasetId';
      const transactionError = 'No versions were found for the given dataset';

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: expectedDatasetId});
          }
        },
        '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository': {
          findDefault: (anything, onTransactionFound) => {
            onTransactionFound(null);
          },
          findLatestCompletedByDataset: (datasetId, onTransactionFound) => {
            onTransactionFound(null, {isClosed: false});
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, null, (error, anything) => {
        expect(error).to.equal(transactionError);
        expect(anything).to.not.exist;

        done();
      });
    });

    it('should fail when transaction found has lastError set for given dataset', done => {
      const expectedDatasetName = 'iam/myDataset';
      const expectedDatasetId = 'datasetId';
      const transactionError = 'No versions were found for the given dataset';

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: expectedDatasetId});
          }
        },
        '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository': {
          findDefault: (anything, onTransactionFound) => {
            onTransactionFound(null);
          },
          findLatestCompletedByDataset: (datasetId, onTransactionFound) => {
            onTransactionFound(null, {lastError: 'Boom!', isClosed: true});
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, null, (error, anything) => {
        expect(error).to.equal(transactionError);
        expect(anything).to.not.exist;

        done();
      });
    });
  });

  describe('Getting default dataset and transaction - Only transaction commit is given', () => {
    it('should fail when error happened while searching for default transaction', done => {
      const expectedCommit = 'aaaaa42';
      const expectedError = 'Boom!';

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository': {
          findDefault: ({populateDataset}, onTransactionFound) => {
            expect(populateDataset).to.be.true;
            onTransactionFound(expectedError);
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(null, expectedCommit, (error, anything) => {
        expect(error).to.equal(expectedError);
        expect(anything).to.not.exist;
        done();
      });
    });

    it('should fail when default transaction was not found because default dataset was not set', done => {
      const expectedCommit = 'aaaaa42';
      const expectedError = `Default dataset was not set`;

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository': {
          findDefault: ({populateDataset}, onTransactionFound) => {
            expect(populateDataset).to.be.true;
            onTransactionFound();
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(null, expectedCommit, (error, anything) => {
        expect(error).to.equal(expectedError);
        expect(anything).to.not.exist;
        done();
      });
    });

    it('should find transaction by commit in the dataset which is currently default', done => {
      const expectedCommit = 'aaaaa42';
      const expectedDatasetId = 'expectedDatasetId';

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository': {
          findDefault: ({populateDataset}, onTransactionFound) => {
            expect(populateDataset).to.be.true;
            onTransactionFound(null, {dataset: {_id: expectedDatasetId}});
          },
          findByDatasetAndCommit: (datasetId, commit, onTransactionFound) => {
            onTransactionFound(null, {dataset: datasetId, commit, isClosed: true});
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(null, expectedCommit, (error, {dataset, transaction}) => {
        expect(error).to.not.exist;
        expect(dataset._id).to.equal(expectedDatasetId);
        expect(transaction.dataset).to.equal(expectedDatasetId);
        expect(transaction.commit).to.equal(expectedCommit);
        expect(transaction.isClosed).to.be.true;
        done();
      });
    });
  });

  describe('Getting default dataset and transaction - Neither commit nor datasetName are given', () => {
    it('should fail when error happened while searching for default transaction', done => {
      const expectedError = 'Boom!';

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository': {
          findDefault: ({populateDataset}, onTransactionFound) => {
            expect(populateDataset).to.be.true;
            onTransactionFound(expectedError);
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(null, null, (error, anything) => {
        expect(error).to.equal(expectedError);
        expect(anything).to.not.exist;
        done();
      });
    });

    it('should fail when not latest completed transaction was found', done => {
      const expectedError = 'Default dataset was not set';

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository': {
          findDefault: ({populateDataset}, onTransactionFound) => {
            expect(populateDataset).to.be.true;
            onTransactionFound();
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(null, null, (error, anything) => {
        expect(error).to.equal(expectedError);
        expect(anything).to.not.exist;
        done();
      });
    });

    it('should found default dataset and transaction', done => {
      const expectedError = 'Default dataset was not set';
      const expectedDatasetId = 'expectedDatasetId';
      const expectedTransactionId = 'expectedTransactionId';

      const datasetTransactionsService = proxyquire('../../ws.services/dataset-transactions.service.js', {
        '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository': {
          findDefault: ({populateDataset}, onTransactionFound) => {
            expect(populateDataset).to.be.true;
            onTransactionFound(null, {dataset: {_id: expectedDatasetId}, _id: expectedTransactionId});
          }
        }
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(null, null, (error, {dataset, transaction}) => {
        expect(error).to.not.exist;
        expect(dataset._id).to.equal(expectedDatasetId);
        expect(transaction._id).to.equal(expectedTransactionId);
        expect(transaction.dataset._id).to.equal(expectedDatasetId);
        done();
      });
    });
  });

  describe('Rollback latest transaction', () => {
    const expectedError = 'Something went wrong';
    const expectedDatasetId = 'expectedDatasetId';
    const expectedDatasetName = 'expectedDatasetName';
    const expectedTransactionId = 'expectedTransactionId';
    const expectedTransaction = {_id: expectedTransactionId, createdAt: Date.now()};
    const expectedUser = {_id: 'expectedUser'};

    const datasetIndexRepository = {
      rollback: (latestTransaction, onRolledback) => {
        expect(latestTransaction).to.be.equal(expectedTransaction);

        return onRolledback();
      }
    };

    const transactionRepository = {
      findLatestByDataset: (datasetId, onLatestTransactionFound) => {
        expect(datasetId).to.be.equal(expectedDatasetId);

        return onLatestTransactionFound(null, expectedTransaction);
      },
      removeById: (latestTransactionId, onTransactionRemoved) => {
        expect(latestTransactionId).to.be.equal(expectedTransaction._id);

        return onTransactionRemoved();
      },
      countByDataset: (datasetId, onTransactionsCounted) => {
        expect(datasetId).to.be.equal(expectedDatasetId);
        return onTransactionsCounted(null, 0);
      }
    };

    const datasetRepository = {
      forceLock: (datasetName, onDatasetLocked) => {
        expect(datasetName).to.be.equal(expectedDatasetName);

        return onDatasetLocked();
      },
      forceUnlock: (datasetName, onDatasetUnlocked) => {
        expect(datasetName).to.be.equal(expectedDatasetName);

        return onDatasetUnlocked();
      },
      removeById: (datasetId, onDatasetRemoved) => {
        expect(datasetId).to.be.equal(expectedDatasetId);

        return onDatasetRemoved();
      }
    };
    const datasetService = {
      findDatasetByNameAndValidateOwnership: (externalContext, onDatasetValidated) => {
        expect(externalContext.datasetName).to.be.equal(expectedDatasetName);
        expect(externalContext.user).to.be.equal(expectedUser);

        externalContext.datasetId = expectedDatasetId;
        return onDatasetValidated(null, externalContext);
      }
    };

    it('should fail when error happened while dataset ownership validating', done => {
      const findDatasetByNameAndValidateOwnership = (externalContext, onDatasetValidated) => {
        expect(externalContext.datasetName).to.be.equal(expectedDatasetName);
        expect(externalContext.user).to.be.equal(expectedUser);

        return onDatasetValidated(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({findLatestByDataset: shouldNotCall, countByDataset: shouldNotCall, removeById: shouldNotCall}, transactionRepository),
        [datasetServicePath]: _.defaults({findDatasetByNameAndValidateOwnership}, datasetService),
        [datasetRepositoryPath]: _.defaults({removeById: shouldNotCall, forceUnlock: shouldNotCall, forceLock: shouldNotCall}, datasetRepository),
        [datasetIndexRepositoryPath]: _.defaults({rollback: shouldNotCall}, datasetIndexRepository)
      });

      datasetTransactionsService.rollbackLatestTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.equal(expectedError);
        done();
      });
    });

    it('should fail when error happened while latest transaction search', done => {
      const findLatestByDataset = (datasetId, onLatestTransactionFound) => {
        expect(datasetId).to.be.equal(expectedDatasetId);

        return onLatestTransactionFound(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({findLatestByDataset, countByDataset: shouldNotCall, removeById: shouldNotCall}, transactionRepository),
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: _.defaults({removeById: shouldNotCall, forceUnlock: shouldNotCall, forceLock: shouldNotCall}, datasetRepository),
        [datasetIndexRepositoryPath]: _.defaults({rollback: shouldNotCall}, datasetIndexRepository)
      });

      datasetTransactionsService.rollbackLatestTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.equal(expectedError);
        done();
      });
    });

    it('should fail when latest transaction was not found', done => {
      const findLatestByDataset = (datasetId, onLatestTransactionFound) => {
        expect(datasetId).to.be.equal(expectedDatasetId);

        return onLatestTransactionFound(null, null);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({findLatestByDataset, countByDataset: shouldNotCall, removeById: shouldNotCall}, transactionRepository),
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: _.defaults({removeById: shouldNotCall, forceUnlock: shouldNotCall, forceLock: shouldNotCall}, datasetRepository),
        [datasetIndexRepositoryPath]: _.defaults({rollback: shouldNotCall}, datasetIndexRepository)
      });

      datasetTransactionsService.rollbackLatestTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.equal('There is nothing to rollback');
        done();
      });
    });

    it('should fail when error happened while dataset force locking', done => {
      const forceLock = (datasetName, onDatasetLocked) => {
        expect(datasetName).to.be.equal(expectedDatasetName);

        return onDatasetLocked(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({countByDataset: shouldNotCall, removeById: shouldNotCall}, transactionRepository),
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: _.defaults({removeById: shouldNotCall, forceUnlock: shouldNotCall, forceLock}, datasetRepository),
        [datasetIndexRepositoryPath]: _.defaults({rollback: shouldNotCall}, datasetIndexRepository)
      });

      datasetTransactionsService.rollbackLatestTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.equal(expectedError);
        done();
      });
    });

    it('should fail when error happened while documents removing in dataset index collection', function(done) {
      this.timeout(20000);

      const rollback = (latestTransaction, onRolledback) => {
        expect(latestTransaction).to.be.equal(expectedTransaction);

        return onRolledback(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({countByDataset: shouldNotCall, removeById: shouldNotCall}, transactionRepository),
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: _.defaults({removeById: shouldNotCall, forceUnlock: shouldNotCall}, datasetRepository),
        [datasetIndexRepositoryPath]: _.defaults({rollback}, datasetIndexRepository)
      });

      return datasetTransactionsService.rollbackLatestTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.equal(expectedError);
        return done();
      });
    });

    it('should fail when error happened while latest transaction removing', done => {
      const removeById = (latestTransactionId, onTransactionRemoved) => {
        expect(latestTransactionId).to.be.equal(expectedTransaction._id);

        return onTransactionRemoved(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({countByDataset: shouldNotCall, removeById}, transactionRepository),
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: _.defaults({removeById: shouldNotCall, forceUnlock: shouldNotCall}, datasetRepository),
        [datasetIndexRepositoryPath]: datasetIndexRepository
      });

      datasetTransactionsService.rollbackLatestTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.equal(expectedError);
        done();
      });
    });

    it('should fail when error happened while dataset force unlocking', done => {
      const forceUnlock = (datasetName, onDatasetUnlocked) => {
        expect(datasetName).to.be.equal(expectedDatasetName);

        return onDatasetUnlocked(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({countByDataset: shouldNotCall}, transactionRepository),
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: _.defaults({removeById: shouldNotCall, forceUnlock}, datasetRepository),
        [datasetIndexRepositoryPath]: datasetIndexRepository
      });

      datasetTransactionsService.rollbackLatestTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.equal(expectedError);
        done();
      });
    });

    it('should fail when error happened while getting transactions count by datasetId', done => {
      const countByDataset = (datasetId, onTransactionsCounted) => {
        expect(datasetId).to.be.equal(expectedDatasetId);
        return onTransactionsCounted(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({countByDataset}, transactionRepository),
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: _.defaults({removeById: shouldNotCall}, datasetRepository),
        [datasetIndexRepositoryPath]: datasetIndexRepository
      });

      datasetTransactionsService.rollbackLatestTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.equal(expectedError);
        done();
      });
    });

    it('should skip removing dataset step because it has transactions', done => {
      const countByDataset = (datasetId, onTransactionsCounted) => {
        expect(datasetId).to.be.equal(expectedDatasetId);
        return onTransactionsCounted(null, 1);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({countByDataset}, transactionRepository),
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: _.defaults({removeById: shouldNotCall}, datasetRepository),
        [datasetIndexRepositoryPath]: datasetIndexRepository
      });

      return datasetTransactionsService.rollbackLatestTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.not.exists;
        return done();
      });
    });

    it('should fail when error happened while dataset without any transaction removing', done => {
      const removeById = (datasetId, onDatasetRemoved) => {
        expect(datasetId).to.be.equal(expectedDatasetId);

        return onDatasetRemoved(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: transactionRepository,
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: _.defaults({removeById}, datasetRepository),
        [datasetIndexRepositoryPath]: datasetIndexRepository
      });

      return datasetTransactionsService.rollbackLatestTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.equal(expectedError);
        return done();
      });
    });

    it('should remove dataset if after rollback it hasn\'t any transaction', done => {
      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: transactionRepository,
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: datasetRepository,
        [datasetIndexRepositoryPath]: datasetIndexRepository
      });

      return datasetTransactionsService.rollbackLatestTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.not.exists;
        return done();
      });
    });

  });

  describe('Set default dataset', () => {
    const expectedError = 'Something went wrong';
    const expectedDatasetId = 'expectedDatasetId';
    const expectedDatasetName = 'expectedDatasetName';
    const expectedDataset = {
      _id: expectedDatasetId,
      name: expectedDatasetName
    };
    const expectedTransactionId = 'expectedTransactionId';
    const expectedTransactionCommit = 'aaaaaaa';
    const expectedTransaction = {_id: expectedTransactionId, createdAt: Date.now(), commit: expectedTransactionCommit, isClosed: true};
    const expectedUserId = 'expectedUser';

    const transactionRepository = {
      findByDatasetAndCommit: (datasetId, transactionCommit, onDatasetFound) => {
        expect(datasetId).to.be.equal(expectedDatasetId);
        expect(transactionCommit).to.be.equal(expectedTransactionCommit);

        return onDatasetFound(null, expectedTransaction);
      }
    };

    const datasetRepository = {
      findByNameAndUser: (datasetName, userId, onDatasetFound) => {
        expect(datasetName).to.be.equal(expectedDatasetName);
        expect(userId).to.be.equal(expectedUserId);

        return onDatasetFound(null, expectedDataset);
      }
    };

    it('should fail when error happened while failed dataset search by datasetName and userId', done => {
      const findByNameAndUser = (datasetName, userId, onDatasetFound) => {
        expect(datasetName).to.be.equal(expectedDatasetName);
        expect(userId).to.be.equal(expectedUserId);

        return onDatasetFound(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({findByDatasetAndCommit: shouldNotCall, setAsDefault: shouldNotCall}, transactionRepository),
        [datasetRepositoryPath]: _.defaults({findByNameAndUser}, datasetRepository)
      });

      datasetTransactionsService.setTransactionAsDefault(expectedUserId, expectedDatasetName, expectedTransactionCommit, (error, result) => {
        expect(error).to.equal(expectedError);
        expect(result).to.not.exist;

        done();
      });
    });

    it('should fail when isn\'t found dataset by datasetName and userId', done => {
      const findByNameAndUser = (datasetName, userId, onDatasetFound) => {
        expect(datasetName).to.be.equal(expectedDatasetName);
        expect(userId).to.be.equal(expectedUserId);

        return onDatasetFound(null, null);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({findByDatasetAndCommit: shouldNotCall, setAsDefault: shouldNotCall}, transactionRepository),
        [datasetRepositoryPath]: _.defaults({findByNameAndUser}, datasetRepository)
      });

      datasetTransactionsService.setTransactionAsDefault(expectedUserId, expectedDatasetName, expectedTransactionCommit, (error, result) => {
        expect(error).to.equal(`Given dataset was not found: '${expectedDatasetName}'`);
        expect(result).to.not.exist;

        done();
      });
    });

    it('should fail when dataset is private', done => {
      const findByNameAndUser = (datasetName, userId, onDatasetFound) => {
        expect(datasetName).to.be.equal(expectedDatasetName);
        expect(userId).to.be.equal(expectedUserId);

        return onDatasetFound(null, _.defaults({private: true}, expectedDataset));
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({findByDatasetAndCommit: shouldNotCall, setAsDefault: shouldNotCall}, transactionRepository),
        [datasetRepositoryPath]: _.defaults({findByNameAndUser}, datasetRepository)
      });

      datasetTransactionsService.setTransactionAsDefault(expectedUserId, expectedDatasetName, expectedTransactionCommit, (error, result) => {
        expect(error).to.equal(`Private dataset cannot be default`);
        expect(result).to.not.exist;

        done();
      });
    });

    it('should fail when error happened while failed transaction search by datasetId and transactionCommit', done => {
      const findByDatasetAndCommit = (datasetId, transactionCommit, onDatasetFound) => {
        expect(datasetId).to.be.equal(expectedDatasetId);
        expect(transactionCommit).to.be.equal(expectedTransactionCommit);

        return onDatasetFound(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({findByDatasetAndCommit, setAsDefault: shouldNotCall}, transactionRepository),
        [datasetRepositoryPath]: datasetRepository
      });

      datasetTransactionsService.setTransactionAsDefault(expectedUserId, expectedDatasetName, expectedTransactionCommit, (error, result) => {
        expect(error).to.equal(expectedError);
        expect(result).to.not.exist;

        done();
      });
    });

    it('should fail when isn\'t found transaction', done => {
      const findByDatasetAndCommit = (datasetId, transactionCommit, onDatasetFound) => {
        expect(datasetId).to.be.equal(expectedDatasetId);
        expect(transactionCommit).to.be.equal(expectedTransactionCommit);

        return onDatasetFound(null, null);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({findByDatasetAndCommit, setAsDefault: shouldNotCall}, transactionRepository),
        [datasetRepositoryPath]: datasetRepository
      });

      datasetTransactionsService.setTransactionAsDefault(expectedUserId, expectedDatasetName, expectedTransactionCommit, (error, result) => {
        expect(error).to.equal(`Given transaction was not found: '${expectedTransactionCommit}'`);
        expect(result).to.not.exist;

        done();
      });
    });

    it('should fail when is found opened transaction', done => {
      const findByDatasetAndCommit = (datasetId, transactionCommit, onDatasetFound) => {
        expect(datasetId).to.be.equal(expectedDatasetId);
        expect(transactionCommit).to.be.equal(expectedTransactionCommit);

        return onDatasetFound(null, _.defaults({isClosed: false}));
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({findByDatasetAndCommit, setAsDefault: shouldNotCall}, transactionRepository),
        [datasetRepositoryPath]: datasetRepository
      });

      datasetTransactionsService.setTransactionAsDefault(expectedUserId, expectedDatasetName, expectedTransactionCommit, (error, result) => {
        expect(error).to.equal(`Given transaction was not found: '${expectedTransactionCommit}'`);
        expect(result).to.not.exist;

        done();
      });
    });

    it('should fail when is found opened transaction', done => {
      const findByDatasetAndCommit = (datasetId, transactionCommit, onDatasetFound) => {
        expect(datasetId).to.be.equal(expectedDatasetId);
        expect(transactionCommit).to.be.equal(expectedTransactionCommit);

        return onDatasetFound(null, _.defaults({lastError: "Last error"}, expectedTransaction));
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({findByDatasetAndCommit, setAsDefault: shouldNotCall}, transactionRepository),
        [datasetRepositoryPath]: datasetRepository
      });

      datasetTransactionsService.setTransactionAsDefault(expectedUserId, expectedDatasetName, expectedTransactionCommit, (error, result) => {
        expect(error).to.equal(`Given transaction was not found: '${expectedTransactionCommit}'`);
        expect(result).to.not.exist;

        done();
      });
    });

    it('should fail when is found corrupted transaction', done => {
      const findByDatasetAndCommit = (datasetId, transactionCommit, onDatasetFound) => {
        expect(datasetId).to.be.equal(expectedDatasetId);
        expect(transactionCommit).to.be.equal(expectedTransactionCommit);

        return onDatasetFound(null, _.defaults({isClosed: false, lastError: "Test"}, expectedTransaction));
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({findByDatasetAndCommit, setAsDefault: shouldNotCall}, transactionRepository),
        [datasetRepositoryPath]: datasetRepository
      });

      datasetTransactionsService.setTransactionAsDefault(expectedUserId, expectedDatasetName, expectedTransactionCommit, (error, result) => {
        expect(error).to.equal(`Given transaction was not found: '${expectedTransactionCommit}'`);
        expect(result).to.not.exist;
        done();
      });
    });

    it('should fail when error happened while set transaction as default', done => {
      const setAsDefault = (userId, datasetId, transactionId, onDatasetFound) => {
        expect(userId).to.be.equal(expectedUserId);
        expect(datasetId).to.be.equal(expectedDatasetId);
        expect(transactionId).to.be.equal(expectedTransactionId);

        return onDatasetFound(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({setAsDefault}, transactionRepository),
        [datasetRepositoryPath]: datasetRepository
      });

      datasetTransactionsService.setTransactionAsDefault(expectedUserId, expectedDatasetName, expectedTransactionCommit, (error, result) => {
        expect(error).to.equal(expectedError);
        expect(result).to.not.exist;
        done();
      });
    });

    it('should set choosen transaction as default', done => {
      const setAsDefault = (userId, datasetId, transactionId, onDatasetFound) => {
        expect(userId).to.be.equal(expectedUserId);
        expect(datasetId).to.be.equal(expectedDatasetId);
        expect(transactionId).to.be.equal(expectedTransactionId);

        return onDatasetFound();
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({setAsDefault}, transactionRepository),
        [datasetRepositoryPath]: datasetRepository
      });

      datasetTransactionsService.setTransactionAsDefault(expectedUserId, expectedDatasetName, expectedTransactionCommit, (error, result) => {
        expect(error).to.not.exist;
        expect(result).to.be.deep.equal({
          name: expectedDatasetName,
          commit: expectedTransactionCommit,
          createdAt: new Date(expectedTransaction.createdAt)
        });
        done();
      });
    });
  })
});
