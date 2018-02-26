import 'mocha';

import '../../ws.repository';

import { expect } from 'chai';
import * as _ from 'lodash';
import * as proxyquire from 'proxyquire';
import * as sinon from 'sinon';
import * as crypto from 'crypto';

import * as securityUtils from '../../ws.utils/security';
import * as cliService from '../../ws.services/cli.service';
import * as datasetsService from '../../ws.services/datasets.service';
import * as datasetTransactionsService from '../../ws.services/dataset-transactions.service';
import * as incrementalUpdateService from '../../ws.import/incremental/update-ddf';
import { DatasetsRepository } from '../../ws.repository/ddf/datasets/datasets.repository';
import { DatasetTransactionsRepository } from '../../ws.repository/ddf/dataset-transactions/dataset-transactions.repository';
import { constants } from '../../ws.utils/constants';
import { usersRepository } from '../../ws.repository/ddf/users/users.repository';

const sandbox = sinon.createSandbox();

const cliServicePath = '../../ws.services/cli.service';

const cachePath = '../ws.utils/redis-cache';
const usersRepositoryPath = '../ws.repository/ddf/users/users.repository';
const datasetsRepositoryPath = '../ws.repository/ddf/datasets/datasets.repository';
const importDdfServicePath = '../ws.import/import-ddf';
const datasetsServicePath = './datasets.service';
const datasetTransactionsServicePath = './dataset-transactions.service';

describe('WS-CLI service', () => {

  afterEach(() => sandbox.restore());

  it('should store last happened error in transaction if it was created at that moment', (done: Function) => {

    const params = {
      commit: '8ad3096185b5b17bc80ae582870fb956f00019fd',
      lifecycleHooks: {
        onTransactionCreated: () => {
        }
      },
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git'
    };

    const expectedUser = {
      email: constants.DEFAULT_USER_EMAIL
    };

    const expectedDataset = {
      name: 'open-numbers/ddf--gapminder--systema_globalis'
    };

    const expectedTransactionId = 'txId';
    const expectedError = { toString: () => 'Boo!' };

    const flowStepCounterSpy = sandbox.spy();

    const cliService = proxyquire(cliServicePath, {
      [usersRepositoryPath]: {
        usersRepository: {
          findUserByEmail: (email, onFound) => {
            flowStepCounterSpy('findUserByEmail');
            onFound(null, expectedUser);
          }
        }
      },
      [datasetsRepositoryPath]: {
        DatasetsRepository: {
          findByGithubUrl: (githubUrl, onFound) => {
            flowStepCounterSpy('findByGithubUrl');
            onFound(null, null);
          }
        }
      },
      [importDdfServicePath]: {
        importDdf: (options, onImported) => {
          flowStepCounterSpy('importService');
          onImported(expectedError, {
            dataset: expectedDataset,
            datasetName: expectedDataset.name,
            transactionId: expectedTransactionId
          });
        }
      },
      [datasetTransactionsServicePath]: {
        setLastError: (transactionId, message, onSet) => {
          flowStepCounterSpy('setLastError');
          expect(transactionId).to.equal(expectedTransactionId);
          expect(message).to.equal(expectedError.toString());

          onSet();
        }
      }
    });

    cliService.importDataset(params, (error, context) => {
      expect(context).to.not.exist;
      expect(error).to.equal(expectedError);

      expect(flowStepCounterSpy.withArgs('setLastError').calledOnce).to.be.true;
      expect(flowStepCounterSpy.withArgs('findByGithubUrl').calledOnce).to.be.true;
      expect(flowStepCounterSpy.withArgs('findUserByEmail').calledOnce).to.be.true;
      expect(flowStepCounterSpy.withArgs('importService').calledOnce).to.be.true;

      done();
    });
  });

  it('should successfully execute dataset importing flow', (done: Function) => {

    const params = {
      commit: '8ad3096185b5b17bc80ae582870fb956f00019fd',
      lifecycleHooks: {
        onTransactionCreated: () => {
        }
      },
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git'
    };

    const expectedUser = {
      email: constants.DEFAULT_USER_EMAIL
    };

    const expectedDataset = {
      name: 'open-numbers/ddf--gapminder--systema_globalis'
    };

    const importServiceExpectedOptions = {
      commit: params.commit,
      datasetName: expectedDataset.name,
      github: params.github,
      isDatasetPrivate: false,
      lifecycleHooks: params.lifecycleHooks,
      user: expectedUser
    };

    const flowStepCounterSpy = sandbox.spy();

    const cliService = proxyquire(cliServicePath, {
      [usersRepositoryPath]: {
        usersRepository: {
          findUserByEmail: (email, onFound) => {
            flowStepCounterSpy('findUserByEmail');
            expect(email).to.equal(constants.DEFAULT_USER_EMAIL);
            onFound(null, expectedUser);
          }
        }
      },
      [datasetsRepositoryPath]: {
        DatasetsRepository: {
          findByGithubUrl: (githubUrl, onFound) => {
            flowStepCounterSpy('findByGithubUrl');
            expect(githubUrl).to.equal(params.github);
            // Playing scenario where dataset doesn't exist
            onFound(null, null);
          }
        }
      },
      [datasetsServicePath]: {
        unlockDataset: (externalContext, onUnlocked) => {
          flowStepCounterSpy('unlockDataset');
          expect(externalContext).to.deep.equal({
            datasetName: expectedDataset.name,
            dataset: expectedDataset
          });
          externalContext.dataset.isLocked = false;
          return onUnlocked(null, externalContext);
        }
      },
      [importDdfServicePath]: {
        importDdf: (options, onImported) => {
          flowStepCounterSpy('importService');
          expect(options).to.deep.equal(importServiceExpectedOptions);
          onImported(null, { dataset: expectedDataset, datasetName: expectedDataset.name });
        }
      }
    });

    cliService.importDataset(params, (error, context) => {
      expect(error).to.not.exist;

      expect(flowStepCounterSpy.withArgs('unlockDataset').calledOnce).to.be.true;
      expect(flowStepCounterSpy.withArgs('findByGithubUrl').calledOnce).to.be.true;
      expect(flowStepCounterSpy.withArgs('findUserByEmail').calledOnce).to.be.true;
      expect(flowStepCounterSpy.withArgs('importService').calledOnce).to.be.true;

      expect(context).to.deep.equal({
        dataset: _.defaults({ isLocked: false }, expectedDataset),
        datasetName: expectedDataset.name
      });
      done();
    });
  });

  it('should yield an error cause dataset was not locked by the end of the importing', (done: Function) => {

    const params = {
      commit: '8ad3096185b5b17bc80ae582870fb956f00019fd',
      lifecycleHooks: {
        onTransactionCreated: () => {
        }
      },
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git'
    };

    const expectedUser = {
      email: constants.DEFAULT_USER_EMAIL
    };

    const expectedDataset = {
      name: 'open-numbers/ddf--gapminder--systema_globalis'
    };

    const expectedError = `Version of dataset "${expectedDataset.name}" wasn't locked or dataset is absent`;

    const flowStepCounterSpy = sandbox.spy();

    const cliService = proxyquire(cliServicePath, {
      [usersRepositoryPath]: {
        usersRepository: {
          findUserByEmail: (email, onFound) => {
            flowStepCounterSpy('findUserByEmail');
            onFound(null, expectedUser);
          }
        }
      },
      [datasetsRepositoryPath]: {
        DatasetsRepository: {
          findByGithubUrl: (githubUrl, onFound) => {
            flowStepCounterSpy('findByGithubUrl');
            onFound(null, null);
          }
        }
      },
      [datasetsServicePath]: {
        unlockDataset: (externalContext, onUnlocked) => {
          flowStepCounterSpy('unlockDataset');
          expect(externalContext).to.deep.equal({
            datasetName: expectedDataset.name,
            dataset: expectedDataset
          });
          return onUnlocked(expectedError, null);
        }
      },
      [importDdfServicePath]: {
        importDdf: (options, onImported) => {
          flowStepCounterSpy('importService');
          onImported(null, { dataset: expectedDataset, datasetName: expectedDataset.name });
        }
      }
    });

    cliService.importDataset(params, (error, context) => {
      expect(context).to.not.exist;

      expect(error).to.exist;
      expect(error).to.equal(expectedError);

      expect(flowStepCounterSpy.withArgs('unlockDataset').calledOnce).to.be.true;
      expect(flowStepCounterSpy.withArgs('findByGithubUrl').calledOnce).to.be.true;
      expect(flowStepCounterSpy.withArgs('findUserByEmail').calledOnce).to.be.true;

      done();
    });
  });

  it('should be impossible to import same dataset twice', (done: Function) => {

    const params = {
      commit: '8ad3096185b5b17bc80ae582870fb956f00019fd',
      lifecycleHooks: {
        onTransactionCreated: () => {
        }
      },
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git'
    };

    const expectedUser = {
      email: constants.DEFAULT_USER_EMAIL
    };

    const expectedDataset = {
      name: 'open-numbers/ddf--gapminder--systema_globalis'
    };

    const expectedError = 'Dataset exists, cannot import same dataset twice';

    const flowStepCounterSpy = sandbox.spy();

    const cliService = proxyquire(cliServicePath, {
      [usersRepositoryPath]: {
        usersRepository: {
          findUserByEmail: (email, onFound) => {
            flowStepCounterSpy('findUserByEmail');
            expect(email).to.equal(constants.DEFAULT_USER_EMAIL);
            onFound(null, expectedUser);
          }
        }
      },
      [datasetsRepositoryPath]: {
        DatasetsRepository: {
          findByGithubUrl: (githubUrl, onFound) => {
            flowStepCounterSpy('findByGithubUrl');
            expect(githubUrl).to.equal(params.github);
            onFound(null, expectedDataset);
          }
        }
      }
    });

    cliService.importDataset(params, (error) => {
      expect(error).to.exist;
      expect(error).to.equal(expectedError);

      expect(flowStepCounterSpy.withArgs('findByGithubUrl').calledOnce).to.be.true;
      expect(flowStepCounterSpy.withArgs('findUserByEmail').calledOnce).to.be.true;
      done();
    });
  });

  it('should yield error when during dataset importing error occurred while searching for user', (done: Function) => {

    const params = {
      commit: '8ad3096185b5b17bc80ae582870fb956f00019fd',
      lifecycleHooks: {
        onTransactionCreated: () => {
        }
      },
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git'
    };

    const expectedError = 'Boo!';

    const cliService = proxyquire(cliServicePath, {
      [usersRepositoryPath]: {
        usersRepository: {
          findUserByEmail: (email, onFound) => {
            onFound(expectedError);
          }
        }
      }
    });

    cliService.importDataset(params, (error) => {
      expect(error).to.exist;
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('should yield error when during dataset importing user was not found', (done: Function) => {

    const params = {
      commit: '8ad3096185b5b17bc80ae582870fb956f00019fd',
      lifecycleHooks: {
        onTransactionCreated: () => {
        }
      },
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git'
    };

    const expectedError = 'User that tries to initiate import was not found';

    const cliService = proxyquire(cliServicePath, {
      [usersRepositoryPath]: {
        usersRepository: {
          findUserByEmail: (email, onFound) => {
            onFound(null, null);
          }
        }
      }
    });

    cliService.importDataset(params, (error) => {
      expect(error).to.exist;
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('should yield error when during dataset importing error occurred while searching for dataset', (done: Function) => {

    const params = {
      commit: '8ad3096185b5b17bc80ae582870fb956f00019fd',
      lifecycleHooks: {
        onTransactionCreated: () => {
        }
      },
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git'
    };

    const expectedError = 'Boo!';
    const user = {};

    const cliService = proxyquire(cliServicePath, {
      [usersRepositoryPath]: {
        usersRepository: {
          findUserByEmail: (email, onFound) => {
            onFound(null, user);
          }
        }
      },
      [datasetsRepositoryPath]: {
        DatasetsRepository: {
          findByGithubUrl: (githubUrl, onFound) => {
            onFound(expectedError);
          }
        }
      }
    });

    cliService.importDataset(params, (error) => {
      expect(error).to.exist;
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('should find datasets in progress', (done: Function) => {

    const expectedUserId = 'userId';

    const foundDatasets = [{
      name: 'fake',
      path: 'fakePath'
    }];

    const findDatasetsInProgressByUserStub = sandbox.stub(DatasetsRepository, 'findDatasetsInProgressByUser').callsFake((userId, onFound) => {
      onFound(null, foundDatasets);
    });

    const cliService = proxyquire(cliServicePath, {});

    cliService.getDatasetsInProgress(expectedUserId, (error, datasets) => {
      expect(error).to.not.exist;
      expect(datasets).to.deep.equal([{ name: 'fake', githubUrl: 'fakePath' }]);

      sinon.assert.calledOnce(findDatasetsInProgressByUserStub);
      sinon.assert.calledWith(findDatasetsInProgressByUserStub, expectedUserId);

      done();
    });
  });

  it('should find datasets in progress: error happened', (done: Function) => {

    const expectedUserId = 'userId';
    const expectedError = 'Boo!';

    const findDatasetsInProgressByUserStub = sandbox.stub(DatasetsRepository, 'findDatasetsInProgressByUser').callsFake((userId, onFound) => {
      onFound(expectedError);
    });

    const cliService = proxyquire(cliServicePath, {});

    cliService.getDatasetsInProgress(expectedUserId, (error, datasets) => {
      expect(error).to.equal(expectedError);
      expect(datasets).to.not.exist;

      sinon.assert.calledOnce(findDatasetsInProgressByUserStub);
      sinon.assert.calledWith(findDatasetsInProgressByUserStub, expectedUserId);

      done();
    });
  });

  it('should not update dataset incrementally: fail searching user', (done: Function) => {
    const expectedError = 'User searching error';

    sandbox.stub(usersRepository, 'findUserByEmail').callsArgWithAsync(1, expectedError);
    sandbox.stub(datasetsService, 'unlockDataset').callsArgAsync(1);

    cliService.updateIncrementally({}, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('should not update dataset incrementally: fail cause user is not found', (done: Function) => {
    const expectedError = 'User that tries to initiate import was not found';

    sandbox.stub(usersRepository, 'findUserByEmail').callsArgWithAsync(1, null, null);
    sandbox.stub(datasetsService, 'unlockDataset').callsArgAsync(1);

    cliService.updateIncrementally({}, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('should not update dataset incrementally: fail searching dataset', (done: Function) => {
    const user = {
      email: 'dev@gapminder.org'
    };

    const context = {
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git'
    };

    const expectedError = 'Error while searching for dataset';

    sandbox.stub(usersRepository, 'findUserByEmail').callsArgWithAsync(1, null, user);
    sandbox.stub(DatasetsRepository, 'findByGithubUrl').callsArgWithAsync(1, expectedError);
    sandbox.stub(datasetsService, 'unlockDataset').callsArgAsync(1);

    cliService.updateIncrementally(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('should not update dataset incrementally: fail cause dataset did not pass validation', (done: Function) => {
    const user = {
      email: 'dev@gapminder.org'
    };

    const context = {
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git'
    };

    const dataset = {};

    const expectedError = 'Owner is not valid';

    sandbox.stub(usersRepository, 'findUserByEmail').callsArgWithAsync(1, null, user);
    sandbox.stub(DatasetsRepository, 'findByGithubUrl').callsArgWithAsync(1, null, dataset);
    sandbox.stub(securityUtils, 'validateDatasetOwner').callsArgWithAsync(1, expectedError);
    sandbox.stub(datasetsService, 'unlockDataset').callsArgAsync(1);

    cliService.updateIncrementally(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('should not update dataset incrementally: fail while transaction searching', (done: Function) => {
    const user = {
      email: 'dev@gapminder.org'
    };

    const dataset = {
      _id: 'dsId'
    };

    const context = {
      commit: 'aaaaaaa',
      dataset,
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git'
    };

    const expectedError = 'Transaction verification failed';

    sandbox.stub(usersRepository, 'findUserByEmail').callsArgWithAsync(1, null, user);
    sandbox.stub(DatasetsRepository, 'findByGithubUrl').callsArgWithAsync(1, null, dataset);
    sandbox.stub(securityUtils, 'validateDatasetOwner').callsArgWithAsync(1, null, context);
    sandbox.stub(datasetsService, 'lockDataset').callsArgWithAsync(1, null, context);
    sandbox.stub(DatasetTransactionsRepository, 'findByDatasetAndCommit').callsArgWithAsync(2, expectedError);

    sandbox.stub(datasetsService, 'unlockDataset').callsArgAsync(1);

    cliService.updateIncrementally(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('should not update dataset incrementally: fail when user is trying to apply same version twice', (done: Function) => {
    const user = {
      email: 'dev@gapminder.org'
    };

    const dataset = {
      _id: 'dsId'
    };

    const context = {
      commit: 'aaaaaaa',
      dataset,
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git'
    };

    const transaction = { commit: 'aaaaaaa' };

    const expectedError = `Version of dataset "${context.github}" with commit: "${transaction.commit}" was already applied`;

    sandbox.stub(usersRepository, 'findUserByEmail').callsArgWithAsync(1, null, user);
    sandbox.stub(DatasetsRepository, 'findByGithubUrl').callsArgWithAsync(1, null, dataset);
    sandbox.stub(securityUtils, 'validateDatasetOwner').callsArgWithAsync(1, null, context);
    sandbox.stub(datasetsService, 'lockDataset').callsArgWithAsync(1, null, context);
    sandbox.stub(DatasetTransactionsRepository, 'findByDatasetAndCommit').callsArgWithAsync(2, null, transaction);

    sandbox.stub(datasetsService, 'unlockDataset').callsArgAsync(1);

    cliService.updateIncrementally(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('should update dataset incrementally', (done: Function) => {
    const user = {
      email: 'dev@gapminder.org'
    };

    const dataset = {
      _id: 'dsId',
      name: 'ds'
    };

    const commit = 'aaaaaaa';

    const context = {
      lifecycleHooks: {
        onTransaction: () => {
        }
      },
      datasetName: dataset.name,
      hashFrom: '7777777',
      hashTo: commit,
      commit,
      dataset,
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git'
    };

    const findUserByEmailStub = sandbox.stub(usersRepository, 'findUserByEmail').callsArgWithAsync(1, null, user);
    const findByGithubUrlStub = sandbox.stub(DatasetsRepository, 'findByGithubUrl').callsArgWithAsync(1, null, dataset);
    const validateDatasetOwnerStub = sandbox.stub(securityUtils, 'validateDatasetOwner').callsArgWithAsync(1, null, context);
    const lockDatasetStub = sandbox.stub(datasetsService, 'lockDataset').callsArgWithAsync(1, null, context);
    const findByDatasetAndCommitStub = sandbox.stub(DatasetTransactionsRepository, 'findByDatasetAndCommit').callsArgWithAsync(2, null, null);
    const updateDdfStub = sandbox.stub(incrementalUpdateService, 'updateDdf').callsArgWithAsync(1, null, context);

    const unlockDatasetStub = sandbox.stub(datasetsService, 'unlockDataset');
    unlockDatasetStub
      .onFirstCall()
      .callsArgWithAsync(1, null, context);

    cliService.updateIncrementally(context, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext).to.equal(context);

      sinon.assert.calledOnce(unlockDatasetStub);

      sinon.assert.calledOnce(findUserByEmailStub);
      sinon.assert.calledWith(findUserByEmailStub, constants.DEFAULT_USER_EMAIL);

      sinon.assert.calledOnce(findByGithubUrlStub);
      sinon.assert.calledWith(findByGithubUrlStub, context.github);

      sinon.assert.calledOnce(findByDatasetAndCommitStub);
      sinon.assert.calledWith(findByDatasetAndCommitStub, dataset._id, commit);

      sinon.assert.calledOnce(updateDdfStub);
      const expectedUpdateOptions = {
        lifecycleHooks: context.lifecycleHooks,
        datasetName: context.datasetName,
        commit,
        github: context.github,
        user,
        hashFrom: context.hashFrom,
        hashTo: context.hashTo
      };
      sinon.assert.calledWith(updateDdfStub, expectedUpdateOptions, sinon.match.func);

      sinon.assert.callOrder(
        findUserByEmailStub,
        findByGithubUrlStub,
        validateDatasetOwnerStub,
        lockDatasetStub,
        findByDatasetAndCommitStub,
        updateDdfStub,
        unlockDatasetStub
      );

      done();
    });
  });

  it('should update dataset incrementally: should save error if update has failed', (done: Function) => {
    const user = {
      email: 'dev@gapminder.org'
    };

    const dataset = {
      _id: 'dsId',
      name: 'ds'
    };

    const commit = 'aaaaaaa';

    const context = {
      lifecycleHooks: {
        onTransaction: () => {
        }
      },
      datasetName: dataset.name,
      hashFrom: '7777777',
      hashTo: commit,
      commit,
      dataset,
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git',
      transactionId: 'txId'
    };

    const expectedError = 'Boo! during inc update';

    sandbox.stub(usersRepository, 'findUserByEmail').callsArgWithAsync(1, null, user);
    sandbox.stub(DatasetsRepository, 'findByGithubUrl').callsArgWithAsync(1, null, dataset);
    sandbox.stub(securityUtils, 'validateDatasetOwner').callsArgWithAsync(1, null, context);
    sandbox.stub(datasetsService, 'lockDataset').callsArgWithAsync(1, null, context);
    sandbox.stub(DatasetTransactionsRepository, 'findByDatasetAndCommit').callsArgWithAsync(2, null, null);
    sandbox.stub(incrementalUpdateService, 'updateDdf').callsArgWithAsync(1, expectedError, context);
    const setLastErrorStub = sandbox.stub(datasetTransactionsService, 'setLastError').callsArgAsync(2);
    const unlockDatasetStub = sandbox.stub(datasetsService, 'unlockDataset');

    cliService.updateIncrementally(context, (error) => {
      expect(error).to.equal(expectedError);

      sinon.assert.calledOnce(setLastErrorStub);
      sinon.assert.notCalled(unlockDatasetStub);
      done();
    });
  });

  it('should respond with an error when it occurred while searching for private datasets', (done: Function) => {
    const expectedError = 'Private datasets search has failed';

    sandbox.stub(DatasetsRepository, 'findPrivateByUser').callsArgWithAsync(1, expectedError);

    cliService.getPrivateDatasets(null, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('should serve private datasets', (done: Function) => {
    const datasets = [
      {
        name: 'ds1',
        path: 'path1'
      },
      {
        name: 'ds2',
        path: 'path2'
      }
    ];

    sandbox.stub(DatasetsRepository, 'findPrivateByUser').callsArgWithAsync(1, null, datasets);

    cliService.getPrivateDatasets(null, (error, privateDatasets) => {
      expect(error).to.not.exist;

      expect(privateDatasets).to.deep.equal([
        {
          name: 'ds1',
          githubUrl: 'path1'
        },
        {
          name: 'ds2',
          githubUrl: 'path2'
        }
      ]);

      done();
    });
  });

  it('should collect available datasets and versions', (done: Function) => {
    const datasetsWithVersions = [
      {
        id: 'ds1Id',
        name: 'ds1',
        path: 'dsPath1',
        isDefault: true,
        versions: [
          {
            commit: '1111111',
            isDefault: true,
            createdAt: 1111111
          }
        ]
      },
      {
        id: 'ds2Id',
        name: 'ds2',
        path: 'dsPath2',
        isDefault: false,
        versions: [
          {
            commit: '2222222',
            isDefault: false,
            createdAt: 2222222
          },
          {
            commit: '3333333',
            isDefault: false,
            createdAt: 3333333
          }
        ]
      }];

    const userId = 'userId';
    const findDatasetsWithVersionsStub = sandbox.stub(datasetsService, 'findDatasetsWithVersions').callsArgWithAsync(1, null, datasetsWithVersions);

    cliService.getAvailableDatasetsAndVersions(userId, (error, available) => {
      expect(error).to.not.exist;

      sinon.assert.calledWith(findDatasetsWithVersionsStub, userId);

      expect(available).to.deep.equal([
        {
          createdAt: 1111111,
          datasetName: 'ds1',
          githubUrl: 'dsPath1',
          version: '1111111',
          isDefault: true
        },
        {
          createdAt: 2222222,
          datasetName: 'ds2',
          githubUrl: 'dsPath2',
          version: '2222222',
          isDefault: false
        },
        {
          createdAt: 3333333,
          datasetName: 'ds2',
          githubUrl: 'dsPath2',
          version: '3333333',
          isDefault: false
        }
      ]);

      done();
    });
  });

  it('should respond with an error if it occurred while searching for available datasets and versions', (done: Function) => {
    const expectedError = '[Error] datasets and versions search';
    sandbox.stub(datasetsService, 'findDatasetsWithVersions').callsArgWithAsync(1, expectedError);

    cliService.getAvailableDatasetsAndVersions(null, (error) => {
      expect(error).to.equal(expectedError);

      done();
    });
  });

  it('gets removable datasets: fail if error occurred', (done: Function) => {
    const expectedError = '[Error] removalbe datasets';
    sandbox.stub(datasetsService, 'findDatasetsWithVersions').callsArgWithAsync(1, expectedError);

    cliService.getRemovableDatasets(null, (error) => {
      expect(error).to.equal(expectedError);

      done();
    });
  });

  it('gets removable datasets', (done: Function) => {
    const datasetsWithVersions = [
      {
        id: 'ds1Id',
        name: 'ds1',
        path: 'dsPath1',
        isDefault: true,
        versions: [
          {
            commit: '1111111',
            isDefault: true,
            createdAt: 1111111
          }
        ]
      },
      {
        id: 'ds2Id',
        name: 'ds2',
        path: 'dsPath2',
        isDefault: false,
        versions: [
          {
            commit: '2222222',
            isDefault: false,
            createdAt: 2222222
          },
          {
            commit: '3333333',
            isDefault: false,
            createdAt: 3333333
          }
        ]
      }];

    const userId = 'userId';
    sandbox.stub(datasetsService, 'findDatasetsWithVersions').callsArgWithAsync(1, null, datasetsWithVersions);

    cliService.getRemovableDatasets(userId, (error, available) => {
      expect(error).to.not.exist;
      expect(available).to.deep.equal([{ name: 'ds2', githubUrl: 'dsPath2' }]);

      done();
    });
  });

  it('gets commit of latest dataset version: fail on dataset not found error', (done: Function) => {
    const expectedError = '[Error] dataset was not found';

    sandbox.stub(DatasetsRepository, 'findByGithubUrl').callsArgWithAsync(1, expectedError);

    cliService.getCommitOfLatestDatasetVersion(null, null, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('gets commit of latest dataset version: validation failed on dataset not found', (done: Function) => {
    const expectedError = 'Dataset was not found, hence hash commit of it\'s latest version cannot be acquired';

    const user = {
      email: 'dev@gapminder.org'
    };

    const github = 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git';

    const context = {
      github,
      user
    };

    sandbox.stub(DatasetsRepository, 'findByGithubUrl').callsArgWithAsync(1, null, {});
    sandbox.stub(securityUtils, 'validateDatasetOwner').callsArgWithAsync(1, null, context);

    cliService.getCommitOfLatestDatasetVersion(github, user, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('gets commit of latest dataset version: validation failed cause dataset is locked', (done: Function) => {
    const expectedError = 'Dataset was locked. Please, start rollback process.';

    const user = {
      email: 'dev@gapminder.org'
    };

    const github = 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git';

    const context = {
      github,
      user,
      dataset: {
        isLocked: true
      }
    };

    sandbox.stub(DatasetsRepository, 'findByGithubUrl').callsArgWithAsync(1, null, context.dataset);
    sandbox.stub(securityUtils, 'validateDatasetOwner').callsArgWithAsync(1, null, context);

    cliService.getCommitOfLatestDatasetVersion(github, user, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('gets commit of latest dataset version: fails if transaction searching results in error', (done: Function) => {
    const expectedError = 'Transaction search has failed';

    const user = {
      email: 'dev@gapminder.org'
    };

    const github = 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git';

    const context = {
      github,
      user,
      dataset: {}
    };

    sandbox.stub(DatasetsRepository, 'findByGithubUrl').callsArgWithAsync(1, null, context.dataset);
    sandbox.stub(securityUtils, 'validateDatasetOwner').callsArgWithAsync(1, null, context);
    sandbox.stub(DatasetTransactionsRepository, 'findLatestByDataset').callsArgWithAsync(1, expectedError);

    cliService.getCommitOfLatestDatasetVersion(github, user, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('gets commit of latest dataset version', (done: Function) => {
    const user = {
      email: 'dev@gapminder.org'
    };

    const github = 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git';

    const context = {
      github,
      user,
      dataset: {}
    };

    const transaction = {
      _id: 'txId'
    };

    sandbox.stub(DatasetsRepository, 'findByGithubUrl').callsArgWithAsync(1, null, context.dataset);
    sandbox.stub(securityUtils, 'validateDatasetOwner').callsArgWithAsync(1, null, _.cloneDeep(context));
    sandbox.stub(DatasetTransactionsRepository, 'findLatestByDataset').callsArgWithAsync(1, null, transaction);

    cliService.getCommitOfLatestDatasetVersion(github, user, (error, externalContext) => {
      expect(error).to.not.exist;

      expect(externalContext).to.deep.equal(Object.assign({}, context, { transaction }));
      done();
    });
  });

  it('searches for dataset with its versions', (done: Function) => {
    const userId = 'user';
    const result = {};
    const findDatasetsWithVersionsStub = sandbox.stub(datasetsService, 'findDatasetsWithVersions').callsArgWithAsync(1, null, result);

    cliService.findDatasetsWithVersions(userId, (error, actual) => {
      expect(error).to.not.exist;
      expect(actual).to.equal(result);

      sinon.assert.calledWith(findDatasetsWithVersionsStub, userId, sinon.match.func);
      done();
    });
  });

  it('searches for dataset with its versions: error has happened', (done: Function) => {
    const expectedError = 'Boo!';
    sandbox.stub(datasetsService, 'findDatasetsWithVersions').callsArgWithAsync(1, expectedError);

    cliService.findDatasetsWithVersions(null, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('sets transaction as default: error has happened', (done: Function) => {
    const expectedError = 'Boo!';
    sandbox.stub(datasetTransactionsService, 'setTransactionAsDefault').callsArgWithAsync(3, expectedError);

    cliService.setTransactionAsDefault(null, null, null, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('sets transaction as default', (done: Function) => {
    const userId = 'uId';
    const datasetName = 'ds';
    const transactionCommit = 'aaaaaaa';

    const setTransactionAsDefaultStub = sandbox.stub(datasetTransactionsService, 'setTransactionAsDefault').callsArgWithAsync(3, null, null);

    cliService.setTransactionAsDefault(userId, datasetName, transactionCommit, (error) => {
      expect(error).to.not.exist;

      sinon.assert.calledWith(setTransactionAsDefaultStub, userId, datasetName, transactionCommit, sinon.match.func);
      done();
    });
  });

  it('cleans DDF redis cache', (done: Function) => {
    const delStub = sandbox.stub().callsArgWithAsync(1, null);

    const cliService = proxyquire(cliServicePath, {
      [cachePath]: {
        cache: {
          del: delStub
        }
      }
    });

    cliService.cleanDdfRedisCache((error) => {
      expect(error).to.not.exist;

      sinon.assert.calledOnce(delStub);
      sinon.assert.calledWithExactly(delStub, `${constants.DDF_REDIS_CACHE_NAME_DDFQL}*`, sinon.match.func);
      done();
    });
  });

  it('sets access token for dataset: fails in case of token generation error', (done: Function) => {
    const expectedError = 'Boo!';
    sandbox.stub(crypto, 'randomBytes').callsArgWithAsync(1, expectedError);

    cliService.setAccessTokenForDataset(null, null, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('sets access token for dataset', (done: Function) => {
    const datasetName = 'ds';
    const userId = 'uId';

    const stringifiedBuffer = sandbox.stub().returns('hexed');
    const buffer = {
      toString: stringifiedBuffer
    };

    sandbox.stub(crypto, 'randomBytes').callsArgWithAsync(1, null, buffer);
    const setAccessTokenForPrivateDatasetStub = sandbox.stub(DatasetsRepository, 'setAccessTokenForPrivateDataset').callsArgAsync(1);

    cliService.setAccessTokenForDataset(datasetName, userId, (error) => {
      expect(error).to.not.exist;

      sinon.assert.calledOnce(stringifiedBuffer);
      sinon.assert.calledWith(stringifiedBuffer, 'hex');

      sinon.assert.calledOnce(setAccessTokenForPrivateDatasetStub);
      sinon.assert.calledWithExactly(setAccessTokenForPrivateDatasetStub, {
        userId,
        datasetName,
        accessToken: 'hexed'
      }, sinon.match.func);

      done();
    });
  });
});
