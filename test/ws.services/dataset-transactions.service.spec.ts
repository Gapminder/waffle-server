import 'mocha';

import '../../ws.repository';
import '../../ws.config/db.config';

import * as _ from 'lodash';
import {expect} from 'chai';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import * as proxyquire from 'proxyquire';

import * as datasetTransactionsService from '../../ws.services/dataset-transactions.service';
import * as datasetsService from '../../ws.services/datasets.service';
import { DatasetTracker } from '../../ws.services/datasets-tracker';
import { DatasetTransactionsRepository } from '../../ws.repository/ddf/dataset-transactions/dataset-transactions.repository';
import { logger } from '../../ws.config/log';

const datasetTransactionsServicePath = '../../ws.services/dataset-transactions.service';
const datasetServicePath = './datasets.service';
const datasetRepositoryPath = '../ws.repository/ddf/datasets/datasets.repository';
const transactionsRepositoryPath = '../ws.repository/ddf/dataset-transactions/dataset-transactions.repository';
const datasetIndexRepositoryPath = '../ws.repository/ddf/dataset-index/dataset-index.repository';
const conceptsRepositoryPath = '../ws.repository/ddf/concepts/concepts.repository';
const entitiesRepositoryPath = '../ws.repository/ddf/entities/entities.repository';
const datapointsRepositoryPath = '../ws.repository/ddf/data-points/data-points.repository';

const shouldNotCall = () => expect.fail(null, null, 'This function should not be called');

const sandbox = sinonTest.configureTest(sinon);

describe('Dataset Transactions Service', () => {

  describe('Getting default dataset and transaction - Dataset name and transaction commit are given', () => {

    it('should treat given dataset as default when it was provided along with commit', (done) => {
      const expectedCommit = 'ab76c6a';
      const expectedDatasetName = 'iam/myDataset';
      const inputCommit = 'ab76c6a99e10a1035b4fbb82cb72fe82de5cec9f';

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [datasetRepositoryPath]: {DatasetsRepository: {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: 'datasetId', name: datasetName});
          }
        }},
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: {
          findByDatasetAndCommit: (datasetId, commit, onTransactionFound) => {
            onTransactionFound(null, {isClosed: true, commit});
          }
        }}
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, inputCommit, (error, {dataset, transaction}) => {
        expect(error).to.not.exist;
        expect(dataset.name).to.equal(expectedDatasetName);
        expect(transaction.commit).to.equal(expectedCommit);
        done();
      });
    });

    it('should respond with an error when it occurred during dataset searching', (done) => {
      const expectedDatasetName = 'iam/myDataset';
      const inputCommit = 'ab76c6a99e10a1035b4fbb82cb72fe82de5cec9f';
      const datasetSearchingError = 'Error during dataset searching';

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [datasetRepositoryPath]: {DatasetsRepository: {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(datasetSearchingError);
          }
        }}
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, inputCommit, (error, anything) => {
        expect(error).to.equal(datasetSearchingError);
        done();
      });
    });

    it('should respond with an error when dataset was not found', (done) => {
      const expectedDatasetName = 'iam/myDataset';
      const inputCommit = 'ab76c6a99e10a1035b4fbb82cb72fe82de5cec9f';
      const datasetSearchingError = `Dataset was not found: ${expectedDatasetName}`;

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [datasetRepositoryPath]: {DatasetsRepository: {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, null);
          }
        }}
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, inputCommit, (error, anything) => {
        expect(error).to.equal(datasetSearchingError);
        done();
      });
    });

    it('should respond with an error when default transaction was not found', (done) => {
      const expectedDatasetName = 'iam/myDataset';
      const inputCommit = 'ab76c6a99e10a1035b4fbb82cb72fe82de5cec9f';
      const expectedCommit = 'ab76c6a';
      const transactionSearchingError = `Given transaction was not found: '${expectedCommit}'`;

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [datasetRepositoryPath]: {DatasetsRepository: {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: 'datasetId', name: datasetName});
          }
        }},
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: {
          findByDatasetAndCommit: (datasetId, commit, onTransactionFound) => {
            onTransactionFound(null);
          }
        }}
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, inputCommit, (error, anything) => {
        expect(error).to.equal(transactionSearchingError);
        done();
      });
    });

    it('should respond with an error when transaction is still in progress', (done) => {
      const expectedDatasetName = 'iam/myDataset';
      const inputCommit = 'ab76c6a99e10a1035b4fbb82cb72fe82de5cec9f';
      const expectedCommit = 'ab76c6a';
      const transactionSearchingError = `Given transaction was not found: '${expectedCommit}'`;

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [datasetRepositoryPath]: {DatasetsRepository: {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: 'datasetId', name: datasetName});
          }
        }},
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: {
          findByDatasetAndCommit: (datasetId, commit, onTransactionFound) => {
            onTransactionFound(null, {isClosed: false});
          }
        }}
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, inputCommit, (error, anything) => {
        expect(error).to.equal(transactionSearchingError);
        done();
      });
    });

    it('should respond with an error when transaction has errors', (done) => {
      const expectedDatasetName = 'iam/myDataset';
      const inputCommit = 'ab76c6a99e10a1035b4fbb82cb72fe82de5cec9f';
      const expectedCommit = 'ab76c6a';
      const transactionSearchingError = `Given transaction was not found: '${expectedCommit}'`;

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [datasetRepositoryPath]: {DatasetsRepository: {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: 'datasetId', name: datasetName});
          }
        }},
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: {
          findByDatasetAndCommit: (datasetId, commit, onTransactionFound) => {
            onTransactionFound(null, {lastError: 'Boom!'});
          }
        }}
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, inputCommit, (error, anything) => {
        expect(error).to.equal(transactionSearchingError);
        done();
      });
    });

    it('should respond with an error when error occurred during transaction searching', (done) => {
      const expectedDatasetName = 'iam/myDataset';
      const inputCommit = 'ab76c6a99e10a1035b4fbb82cb72fe82de5cec9f';
      const transactionSearchingError = `Boom!`;

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [datasetRepositoryPath]: {DatasetsRepository: {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: 'datasetId', name: datasetName});
          }
        }},
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: {
          findByDatasetAndCommit: (datasetId, commit, onTransactionFound) => {
            onTransactionFound(transactionSearchingError);
          }
        }}
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, inputCommit, (error, anything) => {
        expect(error).to.equal(transactionSearchingError);
        done();
      });
    });
  });

  describe('Getting default dataset and transaction - Only dataset name is given', () => {

    it('should respond with an error when it occurred during dataset searching', (done) => {
      const expectedDatasetName = 'iam/myDataset';
      const datasetSearchingError = 'Error during dataset searching';

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [datasetRepositoryPath]: {DatasetsRepository: {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(datasetSearchingError);
          }
        }}
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, null, (error, anything) => {
        expect(error).to.equal(datasetSearchingError);
        done();
      });
    });

    it('should respond with an error when dataset was not found', (done) => {
      const expectedDatasetName = 'iam/myDataset';
      const datasetSearchingError = `Dataset was not found: ${expectedDatasetName}`;

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [datasetRepositoryPath]: {DatasetsRepository: {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, null);
          }
        }}
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, null, (error, anything) => {
        expect(error).to.equal(datasetSearchingError);
        done();
      });
    });

    it('should respond with an error when error occurred while searching default transaction', (done) => {
      const expectedDatasetName = 'iam/myDataset';
      const expectedDatasetId = 'datasetId';
      const transactionSearchingError = `'Error happened while searching for a default transaction'`;

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [datasetRepositoryPath]: {DatasetsRepository: {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: expectedDatasetId});
          }
        }},
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: {
          findDefault: ({datasetId}, onTransactionFound) => {
            expect(datasetId).to.equal(expectedDatasetId);
            onTransactionFound(transactionSearchingError);
          }
        }}
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, null, (error, anything) => {
        expect(error).to.equal(transactionSearchingError);
        done();
      });
    });

    it('should respond with default dataset and transaction when default transaction was found', (done) => {
      const expectedDatasetName = 'iam/myDataset';
      const expectedDatasetId = 'datasetId';
      const expectedCommit = 'ab76c6a';

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [datasetRepositoryPath]: {DatasetsRepository: {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: expectedDatasetId});
          }
        }},
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: {
          findDefault: ({datasetId}, onTransactionFound) => {
            onTransactionFound(null, {dataset: datasetId, commit: expectedCommit});
          }
        }}
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, null, (error, {dataset, transaction}) => {
        expect(error).to.not.exist;
        expect(dataset._id).to.equal(expectedDatasetId);
        expect(transaction.dataset).to.equal(expectedDatasetId);
        expect(transaction.commit).to.equal(expectedCommit);
        done();
      });
    });

    it('should search for latest completed transaction when no default found for given dataset', (done) => {
      const expectedDatasetName = 'iam/myDataset';
      const expectedDatasetId = 'datasetId';

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [datasetRepositoryPath]: {DatasetsRepository: {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: expectedDatasetId});
          }
        }},
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: {
          findDefault: (anything, onTransactionFound) => {
            onTransactionFound(null);
          },
          findLatestCompletedByDataset: (datasetId, onTransactionFound) => {
            onTransactionFound(null, {isClosed: true, dataset: datasetId});
          }
        }}
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, null, (error, {dataset, transaction}) => {
        expect(error).to.not.exist;

        expect(dataset._id).to.equal(expectedDatasetId);

        expect(transaction.dataset).to.equal(expectedDatasetId);
        expect(transaction.isClosed).to.be.true;

        done();
      });
    });

    it('should fail when error occurred while searching for latest completed transaction if no default exists', (done) => {
      const expectedDatasetName = 'iam/myDataset';
      const expectedDatasetId = 'datasetId';
      const transactionError = 'Boom!';

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [datasetRepositoryPath]: {DatasetsRepository: {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: expectedDatasetId});
          }
        }},
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: {
          findDefault: (anything, onTransactionFound) => {
            onTransactionFound(null);
          },
          findLatestCompletedByDataset: (datasetId, onTransactionFound) => {
            onTransactionFound(transactionError);
          }
        }}
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, null, (error, anything) => {
        expect(error).to.equal(transactionError);
        expect(anything).to.not.exist;

        done();
      });
    });

    it('should fail when transaction found is still in progress for given dataset', (done) => {
      const expectedDatasetName = 'iam/myDataset';
      const expectedDatasetId = 'datasetId';
      const transactionError = 'No versions were found for the given dataset';

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [datasetRepositoryPath]: {DatasetsRepository: {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: expectedDatasetId});
          }
        }},
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: {
          findDefault: (anything, onTransactionFound) => {
            onTransactionFound(null);
          },
          findLatestCompletedByDataset: (datasetId, onTransactionFound) => {
            onTransactionFound(null, {isClosed: false});
          }
        }}
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, null, (error, anything) => {
        expect(error).to.equal(transactionError);
        expect(anything).to.not.exist;

        done();
      });
    });

    it('should fail when transaction found has lastError set for given dataset', (done) => {
      const expectedDatasetName = 'iam/myDataset';
      const expectedDatasetId = 'datasetId';
      const transactionError = 'No versions were found for the given dataset';

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [datasetRepositoryPath]: {DatasetsRepository: {
          findByName: (datasetName, onDatasetFound) => {
            onDatasetFound(null, {_id: expectedDatasetId});
          }
        }},
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: {
          findDefault: (anything, onTransactionFound) => {
            onTransactionFound(null);
          },
          findLatestCompletedByDataset: (datasetId, onTransactionFound) => {
            onTransactionFound(null, {lastError: 'Boom!', isClosed: true});
          }
        }}
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(expectedDatasetName, null, (error, anything) => {
        expect(error).to.equal(transactionError);
        expect(anything).to.not.exist;

        done();
      });
    });
  });

  describe('Getting default dataset and transaction - Only transaction commit is given', () => {

    it('should fail when error happened while searching for default transaction', (done) => {
      const expectedCommit = 'aaaaa42';
      const expectedError = 'Boom!';

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: {
          findDefault: ({populateDataset}, onTransactionFound) => {
            expect(populateDataset).to.be.true;
            onTransactionFound(expectedError);
          }
        }}
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(null, expectedCommit, (error, anything) => {
        expect(error).to.equal(expectedError);
        expect(anything).to.not.exist;
        done();
      });
    });

    it('should fail when default transaction was not found because default dataset was not set', (done) => {
      const expectedCommit = 'aaaaa42';
      const expectedError = `Default dataset was not set`;

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: {
          findDefault: ({populateDataset}, onTransactionFound) => {
            expect(populateDataset).to.be.true;
            onTransactionFound();
          }
        }}
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(null, expectedCommit, (error, anything) => {
        expect(error).to.equal(expectedError);
        expect(anything).to.not.exist;
        done();
      });
    });

    it('should find transaction by commit in the dataset which is currently default', (done) => {
      const expectedCommit = 'aaaaa42';
      const expectedDatasetId = 'expectedDatasetId';

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: {
          findDefault: ({populateDataset}, onTransactionFound) => {
            expect(populateDataset).to.be.true;
            onTransactionFound(null, {dataset: {_id: expectedDatasetId}});
          },
          findByDatasetAndCommit: (datasetId, commit, onTransactionFound) => {
            onTransactionFound(null, {dataset: datasetId, commit, isClosed: true});
          }
        }}
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

    it('should fail when error happened while searching for default transaction', (done) => {
      const expectedError = 'Boom!';

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: {
          findDefault: ({populateDataset}, onTransactionFound) => {
            expect(populateDataset).to.be.true;
            onTransactionFound(expectedError);
          }
        }}
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(null, null, (error, anything) => {
        expect(error).to.equal(expectedError);
        expect(anything).to.not.exist;
        done();
      });
    });

    it('should fail when not latest completed transaction was found', (done) => {
      const expectedError = 'Default dataset was not set';

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: {
          findDefault: ({populateDataset}, onTransactionFound) => {
            expect(populateDataset).to.be.true;
            onTransactionFound();
          }
        }}
      });

      datasetTransactionsService.findDefaultDatasetAndTransaction(null, null, (error, anything) => {
        expect(error).to.equal(expectedError);
        expect(anything).to.not.exist;
        done();
      });
    });

    it('should found default dataset and transaction', (done) => {
      const expectedError = 'Default dataset was not set';
      const expectedDatasetId = 'expectedDatasetId';
      const expectedTransactionId = 'expectedTransactionId';

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: {
          findDefault: ({populateDataset}, onTransactionFound) => {
            expect(populateDataset).to.be.true;
            onTransactionFound(null, {dataset: {_id: expectedDatasetId}, _id: expectedTransactionId});
          }
        }}
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

  describe('Rollback failed transaction', () => {

    const expectedError = 'Something went wrong';
    const expectedDatasetId = 'expectedDatasetId';
    const expectedDatasetName = 'expectedDatasetName';
    const expectedTransactionId = 'expectedTransactionId';
    const expectedTransaction = {_id: expectedTransactionId, createdAt: Date.now()};
    const expectedUser = {_id: 'expectedUser'};

    const datasetIndexRepository = {
      rollback: (failedTransaction, onRolledback) => {
        expect(failedTransaction).to.be.equal(expectedTransaction);

        return onRolledback();
      }
    };

    const conceptsRepository = {
      rollback: (failedTransaction, onRolledback) => {
        expect(failedTransaction).to.be.equal(expectedTransaction);

        return onRolledback();
      },
      versionAgnostic: function () {
        return this;
      }
    };

    const entitiesRepository = {
      rollback: (failedTransaction, onRolledback) => {
        expect(failedTransaction).to.be.equal(expectedTransaction);

        return onRolledback();
      },
      versionAgnostic: function () { return this; }
    };

    const datapointsRepository = {
      rollback: (failedTransaction, onRolledback) => {
        expect(failedTransaction).to.be.equal(expectedTransaction);

        return onRolledback();
      },
      versionAgnostic: function () { return this; }
    };

    const transactionRepository = {
      findLatestFailedByDataset: (datasetId, onFailedTransactionFound) => {
        expect(datasetId).to.be.equal(expectedDatasetId);

        return onFailedTransactionFound(null, expectedTransaction);
      },
      removeById: (failedTransactionId, onTransactionRemoved) => {
        expect(failedTransactionId).to.be.equal(expectedTransaction._id);

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

    it('should fail when error happened while dataset ownership validating', (done) => {
      const findDatasetByNameAndValidateOwnership = (externalContext, onDatasetValidated) => {
        expect(externalContext.datasetName).to.be.equal(expectedDatasetName);
        expect(externalContext.user).to.be.equal(expectedUser);

        return onDatasetValidated(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: _.defaults({findLatestFailedByDataset: shouldNotCall, countByDataset: shouldNotCall, removeById: shouldNotCall}, transactionRepository),
        [datasetServicePath]: _.defaults({findDatasetByNameAndValidateOwnership}, datasetService),
        [datasetRepositoryPath]: {DatasetsRepository: _.defaults({removeById: shouldNotCall, forceUnlock: shouldNotCall, forceLock: shouldNotCall}, datasetRepository)},
        [datasetIndexRepositoryPath]: {DatasetSchemaRepository: _.defaults({rollback: shouldNotCall}, datasetIndexRepository)}
      });

      datasetTransactionsService.rollbackFailedTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.equal(expectedError);
        done();
      });
    });

    it('should fail when error happened while failed transaction search', (done) => {
      const findLatestFailedByDataset = (datasetId, onFailedTransactionFound) => {
        expect(datasetId).to.be.equal(expectedDatasetId);

        return onFailedTransactionFound(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: _.defaults({findLatestFailedByDataset, countByDataset: shouldNotCall, removeById: shouldNotCall}, transactionRepository)},
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: {DatasetsRepository: _.defaults({removeById: shouldNotCall, forceUnlock: shouldNotCall, forceLock: shouldNotCall}, datasetRepository)},
        [datasetIndexRepositoryPath]: {DatasetSchemaRepository: _.defaults({rollback: shouldNotCall}, datasetIndexRepository)}
      });

      datasetTransactionsService.rollbackFailedTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.equal(expectedError);
        done();
      });
    });

    it('should fail when failed transaction was not found', (done) => {
      const findLatestFailedByDataset = (datasetId, onFailedTransactionFound) => {
        expect(datasetId).to.be.equal(expectedDatasetId);

        return onFailedTransactionFound(null, null);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: _.defaults({findLatestFailedByDataset, countByDataset: shouldNotCall, removeById: shouldNotCall}, transactionRepository)},
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: {DatasetsRepository: _.defaults({removeById: shouldNotCall, forceUnlock: shouldNotCall, forceLock: shouldNotCall}, datasetRepository)},
        [datasetIndexRepositoryPath]: {DatasetSchemaRepository: _.defaults({rollback: shouldNotCall}, datasetIndexRepository)}
      });

      datasetTransactionsService.rollbackFailedTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.equal('There is nothing to rollback - all transactions are completed successfully');
        done();
      });
    });

    it('should fail when error happened while dataset force locking', (done) => {
      const forceLock = (datasetName, onDatasetLocked) => {
        expect(datasetName).to.be.equal(expectedDatasetName);

        return onDatasetLocked(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: _.defaults({countByDataset: shouldNotCall, removeById: shouldNotCall}, transactionRepository)},
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: {DatasetsRepository: _.defaults({removeById: shouldNotCall, forceUnlock: shouldNotCall, forceLock}, datasetRepository)},
        [datasetIndexRepositoryPath]: {DatasetSchemaRepository: _.defaults({rollback: shouldNotCall}, datasetIndexRepository)}
      });

      datasetTransactionsService.rollbackFailedTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.equal(expectedError);
        done();
      });
    });

    it('should fail when error happened while documents removing in dataset index collection', function(done: Function) {
      const rollback = (failedTransaction, onRolledback) => {
        expect(failedTransaction).to.be.equal(expectedTransaction);

        return onRolledback(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: _.defaults({countByDataset: shouldNotCall, removeById: shouldNotCall}, transactionRepository)},
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: {DatasetsRepository: _.defaults({removeById: shouldNotCall, forceUnlock: shouldNotCall}, datasetRepository)},
        [datasetIndexRepositoryPath]: {DatasetSchemaRepository: _.defaults({rollback}, datasetIndexRepository)},
        [conceptsRepositoryPath]: {ConceptsRepositoryFactory: conceptsRepository},
        [entitiesRepositoryPath]: {EntitiesRepositoryFactory: entitiesRepository},
        [datapointsRepositoryPath]: {DatapointsRepositoryFactory: datapointsRepository}
      });

      return datasetTransactionsService.rollbackFailedTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.equal(expectedError);
        return done();
      });
    });

    it('should fail when error happened while failed transaction removing', (done: Function) => {
      const removeById = (failedTransactionId: string, onTransactionRemoved: Function) => {
        expect(failedTransactionId).to.be.equal(expectedTransaction._id);

        return onTransactionRemoved(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: _.defaults({countByDataset: shouldNotCall, removeById}, transactionRepository)},
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: {DatasetsRepository: _.defaults({removeById: shouldNotCall, forceUnlock: shouldNotCall}, datasetRepository)},
        [datasetIndexRepositoryPath]: {DatasetSchemaRepository: datasetIndexRepository},
        [conceptsRepositoryPath]: {ConceptsRepositoryFactory: conceptsRepository},
        [entitiesRepositoryPath]: {EntitiesRepositoryFactory: entitiesRepository},
        [datapointsRepositoryPath]: {DatapointsRepositoryFactory: datapointsRepository}
      });

      return datasetTransactionsService.rollbackFailedTransactionFor(expectedDatasetName, expectedUser, (error: string) => {
        expect(error).to.equal(expectedError);
        return done();
      });
    });

    it('should fail when error happened while dataset force unlocking', (done: Function) => {
      const forceUnlock = (datasetName, onDatasetUnlocked) => {
        expect(datasetName).to.be.equal(expectedDatasetName);

        return onDatasetUnlocked(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: _.defaults({countByDataset: shouldNotCall}, transactionRepository)},
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: {DatasetsRepository: _.defaults({removeById: shouldNotCall, forceUnlock}, datasetRepository)},
        [datasetIndexRepositoryPath]: {DatasetSchemaRepository: datasetIndexRepository},
        [conceptsRepositoryPath]: {ConceptsRepositoryFactory: conceptsRepository},
        [entitiesRepositoryPath]: {EntitiesRepositoryFactory: entitiesRepository},
        [datapointsRepositoryPath]: {DatapointsRepositoryFactory: datapointsRepository}
      });

      datasetTransactionsService.rollbackFailedTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.equal(expectedError);
        done();
      });
    });

    it('should fail when error happened while getting transactions count by datasetId', (done: Function) => {
      const countByDataset = (datasetId, onTransactionsCounted) => {
        expect(datasetId).to.be.equal(expectedDatasetId);
        return onTransactionsCounted(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: _.defaults({countByDataset}, transactionRepository)},
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: {DatasetsRepository: _.defaults({removeById: shouldNotCall}, datasetRepository)},
        [datasetIndexRepositoryPath]: {DatasetSchemaRepository: datasetIndexRepository},
        [conceptsRepositoryPath]: {ConceptsRepositoryFactory: conceptsRepository},
        [entitiesRepositoryPath]: {EntitiesRepositoryFactory: entitiesRepository},
        [datapointsRepositoryPath]: {DatapointsRepositoryFactory: datapointsRepository}
      });

      datasetTransactionsService.rollbackFailedTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.equal(expectedError);
        done();
      });
    });

    it('should skip removing dataset step because it has transactions', (done: Function) => {
      const countByDataset = (datasetId, onTransactionsCounted) => {
        expect(datasetId).to.be.equal(expectedDatasetId);
        return onTransactionsCounted(null, 1);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: _.defaults({countByDataset}, transactionRepository)},
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: {DatasetsRepository: _.defaults({removeById: shouldNotCall}, datasetRepository)},
        [datasetIndexRepositoryPath]: {DatasetSchemaRepository: datasetIndexRepository},
        [conceptsRepositoryPath]: {ConceptsRepositoryFactory: conceptsRepository},
        [entitiesRepositoryPath]: {EntitiesRepositoryFactory: entitiesRepository},
        [datapointsRepositoryPath]: {DatapointsRepositoryFactory: datapointsRepository}
      });

      return datasetTransactionsService.rollbackFailedTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.not.exist;
        return done();
      });
    });

    it('should fail when error happened while dataset without any transaction removing', (done: Function) => {
      const removeById = (datasetId, onDatasetRemoved) => {
        expect(datasetId).to.be.equal(expectedDatasetId);

        return onDatasetRemoved(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: transactionRepository},
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: {DatasetsRepository: _.defaults({removeById}, datasetRepository)},
        [datasetIndexRepositoryPath]: {DatasetSchemaRepository: datasetIndexRepository},
        [conceptsRepositoryPath]: {ConceptsRepositoryFactory: conceptsRepository},
        [entitiesRepositoryPath]: {EntitiesRepositoryFactory: entitiesRepository},
        [datapointsRepositoryPath]: {DatapointsRepositoryFactory: datapointsRepository}
      });

      return datasetTransactionsService.rollbackFailedTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.equal(expectedError);
        return done();
      });
    });

    it('should remove dataset if after rollback it hasn\'t any transaction', (done: Function) => {
      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: transactionRepository},
        [datasetServicePath]: datasetService,
        [datasetRepositoryPath]: {DatasetsRepository: datasetRepository},
        [datasetIndexRepositoryPath]: {DatasetSchemaRepository: datasetIndexRepository},
        [conceptsRepositoryPath]: {ConceptsRepositoryFactory: conceptsRepository},
        [entitiesRepositoryPath]: {EntitiesRepositoryFactory: entitiesRepository},
        [datapointsRepositoryPath]: {DatapointsRepositoryFactory: datapointsRepository}
      });

      return datasetTransactionsService.rollbackFailedTransactionFor(expectedDatasetName, expectedUser, (error) => {
        expect(error).to.not.exist;
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

    it('should fail when error happened while failed dataset search by datasetName and userId', (done) => {
      const findByNameAndUser = (datasetName, userId, onDatasetFound) => {
        expect(datasetName).to.be.equal(expectedDatasetName);
        expect(userId).to.be.equal(expectedUserId);

        return onDatasetFound(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: _.defaults({findByDatasetAndCommit: shouldNotCall, setAsDefault: shouldNotCall}, transactionRepository)},
        [datasetRepositoryPath]: {DatasetsRepository: _.defaults({findByNameAndUser}, datasetRepository)}
      });

      datasetTransactionsService.setTransactionAsDefault(expectedUserId, expectedDatasetName, expectedTransactionCommit, (error, result) => {
        expect(error).to.equal(expectedError);
        expect(result).to.not.exist;

        done();
      });
    });

    it('should fail when isn\'t found dataset by datasetName and userId', (done) => {
      const findByNameAndUser = (datasetName, userId, onDatasetFound) => {
        expect(datasetName).to.be.equal(expectedDatasetName);
        expect(userId).to.be.equal(expectedUserId);

        return onDatasetFound(null, null);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: _.defaults({findByDatasetAndCommit: shouldNotCall, setAsDefault: shouldNotCall}, transactionRepository)},
        [datasetRepositoryPath]: {DatasetsRepository: _.defaults({findByNameAndUser}, datasetRepository)}
      });

      datasetTransactionsService.setTransactionAsDefault(expectedUserId, expectedDatasetName, expectedTransactionCommit, (error, result) => {
        expect(error).to.equal(`Given dataset was not found: '${expectedDatasetName}'`);
        expect(result).to.not.exist;

        done();
      });
    });

    it('should fail when dataset is private', (done) => {
      const findByNameAndUser = (datasetName, userId, onDatasetFound) => {
        expect(datasetName).to.be.equal(expectedDatasetName);
        expect(userId).to.be.equal(expectedUserId);

        return onDatasetFound(null, _.defaults({private: true}, expectedDataset));
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: _.defaults({findByDatasetAndCommit: shouldNotCall, setAsDefault: shouldNotCall}, transactionRepository)},
        [datasetRepositoryPath]: {DatasetsRepository: _.defaults({findByNameAndUser}, datasetRepository)}
      });

      datasetTransactionsService.setTransactionAsDefault(expectedUserId, expectedDatasetName, expectedTransactionCommit, (error, result) => {
        expect(error).to.equal(`Private dataset cannot be default`);
        expect(result).to.not.exist;

        done();
      });
    });

    it('should fail when error happened while failed transaction search by datasetId and transactionCommit', (done) => {
      const findByDatasetAndCommit = (datasetId, transactionCommit, onDatasetFound) => {
        expect(datasetId).to.be.equal(expectedDatasetId);
        expect(transactionCommit).to.be.equal(expectedTransactionCommit);

        return onDatasetFound(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: _.defaults({findByDatasetAndCommit, setAsDefault: shouldNotCall}, transactionRepository)},
        [datasetRepositoryPath]: {DatasetsRepository: datasetRepository}
      });

      datasetTransactionsService.setTransactionAsDefault(expectedUserId, expectedDatasetName, expectedTransactionCommit, (error, result) => {
        expect(error).to.equal(expectedError);
        expect(result).to.not.exist;

        done();
      });
    });

    it('should fail when isn\'t found transaction', (done) => {
      const findByDatasetAndCommit = (datasetId, transactionCommit, onDatasetFound) => {
        expect(datasetId).to.be.equal(expectedDatasetId);
        expect(transactionCommit).to.be.equal(expectedTransactionCommit);

        return onDatasetFound(null, null);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: _.defaults({findByDatasetAndCommit, setAsDefault: shouldNotCall}, transactionRepository)},
        [datasetRepositoryPath]: {DatasetsRepository: datasetRepository}
      });

      datasetTransactionsService.setTransactionAsDefault(expectedUserId, expectedDatasetName, expectedTransactionCommit, (error, result) => {
        expect(error).to.equal(`Given transaction was not found: '${expectedTransactionCommit}'`);
        expect(result).to.not.exist;

        done();
      });
    });

    it('should fail when is found opened transaction', (done) => {
      const findByDatasetAndCommit = (datasetId, transactionCommit, onDatasetFound) => {
        expect(datasetId).to.be.equal(expectedDatasetId);
        expect(transactionCommit).to.be.equal(expectedTransactionCommit);

        return onDatasetFound(null, _.defaults({isClosed: false}));
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: _.defaults({findByDatasetAndCommit, setAsDefault: shouldNotCall}, transactionRepository)},
        [datasetRepositoryPath]: {DatasetsRepository: datasetRepository}
      });

      datasetTransactionsService.setTransactionAsDefault(expectedUserId, expectedDatasetName, expectedTransactionCommit, (error, result) => {
        expect(error).to.equal(`Given transaction was not found: '${expectedTransactionCommit}'`);
        expect(result).to.not.exist;

        done();
      });
    });

    it('should fail when is found opened transaction', (done) => {
      const findByDatasetAndCommit = (datasetId, transactionCommit, onDatasetFound) => {
        expect(datasetId).to.be.equal(expectedDatasetId);
        expect(transactionCommit).to.be.equal(expectedTransactionCommit);

        return onDatasetFound(null, _.defaults({lastError: 'Last error'}, expectedTransaction));
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: _.defaults({findByDatasetAndCommit, setAsDefault: shouldNotCall}, transactionRepository)},
        [datasetRepositoryPath]: {DatasetsRepository: datasetRepository}
      });

      datasetTransactionsService.setTransactionAsDefault(expectedUserId, expectedDatasetName, expectedTransactionCommit, (error, result) => {
        expect(error).to.equal(`Given transaction was not found: '${expectedTransactionCommit}'`);
        expect(result).to.not.exist;

        done();
      });
    });

    it('should fail when is found corrupted transaction', (done) => {
      const findByDatasetAndCommit = (datasetId, transactionCommit, onDatasetFound) => {
        expect(datasetId).to.be.equal(expectedDatasetId);
        expect(transactionCommit).to.be.equal(expectedTransactionCommit);

        return onDatasetFound(null, _.defaults({isClosed: false, lastError: 'Test'}, expectedTransaction));
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: _.defaults({findByDatasetAndCommit, setAsDefault: shouldNotCall}, transactionRepository)},
        [datasetRepositoryPath]: {DatasetsRepository: datasetRepository}
      });

      datasetTransactionsService.setTransactionAsDefault(expectedUserId, expectedDatasetName, expectedTransactionCommit, (error, result) => {
        expect(error).to.equal(`Given transaction was not found: '${expectedTransactionCommit}'`);
        expect(result).to.not.exist;
        done();
      });
    });

    it('should fail when error happened while set transaction as default', (done) => {
      const setAsDefault = (userId, datasetId, transactionId, onDatasetFound) => {
        expect(userId).to.be.equal(expectedUserId);
        expect(datasetId).to.be.equal(expectedDatasetId);
        expect(transactionId).to.be.equal(expectedTransactionId);

        return onDatasetFound(expectedError);
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: _.defaults({setAsDefault}, transactionRepository)},
        [datasetRepositoryPath]: {DatasetsRepository: datasetRepository}
      });

      datasetTransactionsService.setTransactionAsDefault(expectedUserId, expectedDatasetName, expectedTransactionCommit, (error, result) => {
        expect(error).to.equal(expectedError);
        expect(result).to.not.exist;
        done();
      });
    });

    it('should set choosen transaction as default', (done) => {
      const setAsDefault = (userId, datasetId, transactionId, onDatasetFound) => {
        expect(userId).to.be.equal(expectedUserId);
        expect(datasetId).to.be.equal(expectedDatasetId);
        expect(transactionId).to.be.equal(expectedTransactionId);

        return onDatasetFound();
      };

      const datasetTransactionsService = proxyquire(datasetTransactionsServicePath, {
        [transactionsRepositoryPath]: {DatasetTransactionsRepository: _.defaults({setAsDefault}, transactionRepository)},
        [datasetRepositoryPath]: {DatasetsRepository: datasetRepository}
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
  });

  it('should set last error', sandbox(function () {
    const setLastErrorSpy = this.spy(DatasetTransactionsRepository, 'setLastError');

    const transactionId = 'txId';
    const lastErrorMessage = 'Boo!';
    const onErrorSet = this.spy();
    datasetTransactionsService.setLastError(transactionId, lastErrorMessage, onErrorSet);

    sinon.assert.calledOnce(setLastErrorSpy);
    sinon.assert.calledWith(setLastErrorSpy, transactionId, lastErrorMessage, onErrorSet);
  }));

  it('should get latest transaction status by dataset name', sandbox(function (done: Function) {
    const externalContext = {
      datasetId: 'dsId',
      datasetName: 'dsName'
    };
    const latestTransaction = {
      createdAt: Date.now(),
      lastError: 'lastError',
      commit: 'aaaaaaa',
      isClosed: true
    };

    const expectedModifiedObjects = {
      concepts: 0,
      entities: 0,
      datapoints: 0,
      translations: 0
    };

    const user = {
      email: 'dev@gapminder.org'
    };

    const DatasetTrackerSpy = this.spy(DatasetTracker, 'get');

    const findDatasetByNameAndValidateOwnershipStub =
      this.stub(datasetsService, 'findDatasetByNameAndValidateOwnership')
        .callsArgWith(1, null, externalContext);

    this.stub(DatasetTransactionsRepository, 'findLatestByDataset').callsArgWithAsync(1, null, latestTransaction);

    datasetTransactionsService.getStatusOfLatestTransactionByDatasetName(externalContext.datasetName, user, (error, status) => {
      expect(error).to.not.exist;
      expect(status).to.deep.equal({
        datasetName: externalContext.datasetName,
        transaction: {
          lastError: latestTransaction.lastError,
          commit: latestTransaction.commit,
          status: 'Completed',
          createdAt: new Date(latestTransaction.createdAt)
        },
        modifiedObjects: expectedModifiedObjects
      });

      sinon.assert.calledOnce(findDatasetByNameAndValidateOwnershipStub);
      sinon.assert.calledWith(findDatasetByNameAndValidateOwnershipStub, {datasetName: externalContext.datasetName, user});
      sinon.assert.calledOnce(DatasetTrackerSpy);
      sinon.assert.calledWith(DatasetTrackerSpy, externalContext.datasetName);

      sinon.restore(DatasetTracker.get);

      done();
    });
  }));

  it('should determine transaction progress', sandbox(function (done: Function) {
    const externalContext = {
      datasetId: 'dsId',
      datasetName: 'dsName'
    };
    const latestTransaction = {
      createdAt: Date.now(),
      lastError: 'lastError',
      commit: 'aaaaaaa',
      isClosed: false
    };

    const expectedModifiedObjects = {
      concepts: 590,
      entities: 400,
      datapoints: 190000,
      translations: 0
    };

    const user = {
      email: 'dev@gapminder.org'
    };

    const getStateStub = this.stub().returns(expectedModifiedObjects);

    const DatasetTrackerStub = this.stub(DatasetTracker, 'get').callsFake(() => {
      return {getState: getStateStub};
    });

    this.stub(datasetsService, 'findDatasetByNameAndValidateOwnership').callsArgWith(1, null, externalContext);
    this.stub(DatasetTransactionsRepository, 'findLatestByDataset').callsArgWithAsync(1, null, latestTransaction);

    datasetTransactionsService.getStatusOfLatestTransactionByDatasetName(externalContext.datasetName, user, (error, status) => {
      expect(error).to.not.exist;
      expect(status).to.deep.equal({
        datasetName: externalContext.datasetName,
        transaction: {
          lastError: latestTransaction.lastError,
          commit: latestTransaction.commit,
          status: 'In progress',
          createdAt: new Date(latestTransaction.createdAt)
        },
        modifiedObjects: expectedModifiedObjects
      });

      sinon.assert.calledOnce(getStateStub);
      sinon.assert.calledOnce(DatasetTrackerStub);
      sinon.assert.calledWith(DatasetTrackerStub, externalContext.datasetName);

      sinon.restore(DatasetTracker.get);

      done();
    });
  }));

  it('shouldn\'t get latest transaction status by dataset name: fail because of dataset ownership check', sandbox(function (done: Function) {
    const expectedError = 'Ownership check failed';
    this.stub(datasetsService, 'findDatasetByNameAndValidateOwnership').callsArgWith(1, expectedError);

    datasetTransactionsService.getStatusOfLatestTransactionByDatasetName(null, null, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('shouldn\'t get latest transaction status by dataset name: fail finding latest transaction', sandbox(function (done: Function) {
    const expectedError = 'Latest transaction search failed';
    this.stub(datasetsService, 'findDatasetByNameAndValidateOwnership').callsArgWith(1, null, {});
    this.stub(DatasetTransactionsRepository, 'findLatestByDataset').callsArgWithAsync(1, expectedError);

    datasetTransactionsService.getStatusOfLatestTransactionByDatasetName(null, null, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('shouldn\'t get latest transaction status by dataset name: fail cause there is no latest transaction', sandbox(function (done: Function) {
    const expectedError = `Transaction is absent for dataset: sg`;
    this.stub(datasetsService, 'findDatasetByNameAndValidateOwnership').callsArgWith(1, null, {datasetName: 'sg'});
    this.stub(DatasetTransactionsRepository, 'findLatestByDataset').callsArgWithAsync(1, null);

    datasetTransactionsService.getStatusOfLatestTransactionByDatasetName(null, null, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));
});
