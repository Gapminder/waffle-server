'use strict';

const proxyquire = require('proxyquire');
require('../../ws.repository');
const expect = require('chai').expect;

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
});
