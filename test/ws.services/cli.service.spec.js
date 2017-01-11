'use strict';

const proxyqire = require('proxyquire');
const expect = require('chai').expect;
const sinon = require('sinon');
const constants = require('../../ws.utils/constants');

require('../../ws.repository');

describe('WS-CLI service', () => {
  it('should store last happened error in transaction if it was created at that moment', sinon.test(function (done) {

    const params = {
      commit: '8ad3096185b5b17bc80ae582870fb956f00019fd',
      lifecycleHooks: { onTransactionCreated: () => {} },
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git'
    };

    const expectedUser = {
      email: constants.DEFAULT_USER_EMAIL
    };

    const expectedDataset = {
      name: 'open-numbers/ddf--gapminder--systema_globalis'
    };

    const expectedTransactionId = 'txId';
    const expectedError = { toString: () => 'Boo!'};

    const flowStepCounterSpy = this.spy();

    const cliService = proxyqire('../../ws.services/cli.service', {
      '../ws.repository/ddf/users/users.repository': {
        findUserByEmail: (email, onFound) => {
          flowStepCounterSpy('findUserByEmail');
          onFound(null, expectedUser);
        }
      },
      '../ws.repository/ddf/datasets/datasets.repository': {
        findByGithubUrl: (githubUrl, onFound) => {
          flowStepCounterSpy('findByGithubUrl');
          onFound(null, null);
        }
      },
      '../ws.import/import-ddf': (options, onImported) => {
        flowStepCounterSpy('importService');
        onImported(expectedError, {dataset: expectedDataset, datasetName: expectedDataset.name, transactionId: expectedTransactionId});
      },
      './dataset-transactions.service': {
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
  }));

  it('should successfully execute dataset importing flow', sinon.test(function (done) {

    const params = {
      commit: '8ad3096185b5b17bc80ae582870fb956f00019fd',
      lifecycleHooks: { onTransactionCreated: () => {} },
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git'
    };

    const expectedUser = {
      email: constants.DEFAULT_USER_EMAIL
    };

    const expectedDataset = {
      name: 'open-numbers/ddf--gapminder--systema_globalis'
    };

    const importServiceExpectedOptions = {
      "commit": params.commit,
      "datasetName": expectedDataset.name,
      "github": params.github,
      "isDatasetPrivate": false,
      "lifecycleHooks": params.lifecycleHooks,
      "user": expectedUser
    };

    const flowStepCounterSpy = this.spy();

    const cliService = proxyqire('../../ws.services/cli.service', {
      '../ws.repository/ddf/users/users.repository': {
        findUserByEmail: (email, onFound) => {
          flowStepCounterSpy('findUserByEmail');
          expect(email).to.equal(constants.DEFAULT_USER_EMAIL);
          onFound(null, expectedUser);
        }
      },
      '../ws.repository/ddf/datasets/datasets.repository': {
        findByGithubUrl: (githubUrl, onFound) => {
          flowStepCounterSpy('findByGithubUrl');
          expect(githubUrl).to.equal(params.github);
          // Playing scenario where dataset doesn't exist
          onFound(null, null);
        },
        unlock: (datasetName, onUnlocked) => {
          flowStepCounterSpy('unlock');
          expect(datasetName).to.equal(expectedDataset.name);
          onUnlocked(null, expectedDataset);
        }
      },
      '../ws.import/import-ddf': (options, onImported) => {
        flowStepCounterSpy('importService');
        expect(options).to.deep.equal(importServiceExpectedOptions);
        onImported(null, {dataset: expectedDataset, datasetName: expectedDataset.name});
      }
    });

    cliService.importDataset(params, (error, context) => {
      expect(error).to.not.exist;

      expect(flowStepCounterSpy.withArgs('unlock').calledOnce).to.be.true;
      expect(flowStepCounterSpy.withArgs('findByGithubUrl').calledOnce).to.be.true;
      expect(flowStepCounterSpy.withArgs('findUserByEmail').calledOnce).to.be.true;
      expect(flowStepCounterSpy.withArgs('importService').calledOnce).to.be.true;

      expect(context).to.deep.equal({dataset: expectedDataset, datasetName: expectedDataset.name});
      done();
    });
  }));

  it('should yield an error cause dataset was not locked by the end of the importing', sinon.test(function (done) {

    const params = {
      commit: '8ad3096185b5b17bc80ae582870fb956f00019fd',
      lifecycleHooks: { onTransactionCreated: () => {} },
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git'
    };

    const expectedUser = {
      email: constants.DEFAULT_USER_EMAIL
    };

    const expectedDataset = {
      name: 'open-numbers/ddf--gapminder--systema_globalis'
    };

    const expectedError = `Version of dataset "${expectedDataset.name}" wasn't locked`;

    const flowStepCounterSpy = this.spy();

    const cliService = proxyqire('../../ws.services/cli.service', {
      '../ws.repository/ddf/users/users.repository': {
        findUserByEmail: (email, onFound) => {
          flowStepCounterSpy('findUserByEmail');
          onFound(null, expectedUser);
        }
      },
      '../ws.repository/ddf/datasets/datasets.repository': {
        findByGithubUrl: (githubUrl, onFound) => {
          flowStepCounterSpy('findByGithubUrl');
          onFound(null, null);
        },
        unlock: (datasetName, onUnlocked) => {
          flowStepCounterSpy('unlock');
          onUnlocked(null, null);
        }
      },
      '../ws.import/import-ddf': (options, onImported) => {
        flowStepCounterSpy('importService');
        onImported(null, {dataset: expectedDataset, datasetName: expectedDataset.name});
      }
    });

    cliService.importDataset(params, (error, context) => {
      expect(context).to.not.exist;

      expect(error).to.exist;
      expect(error).to.equal(expectedError);

      expect(flowStepCounterSpy.withArgs('unlock').calledOnce).to.be.true;
      expect(flowStepCounterSpy.withArgs('findByGithubUrl').calledOnce).to.be.true;
      expect(flowStepCounterSpy.withArgs('findUserByEmail').calledOnce).to.be.true;

      done();
    });
  }));

  it('should be impossible to import same dataset twice', sinon.test(function (done) {
    const params = {
      commit: '8ad3096185b5b17bc80ae582870fb956f00019fd',
      lifecycleHooks: { onTransactionCreated: () => {} },
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git'
    };

    const expectedUser = {
      email: constants.DEFAULT_USER_EMAIL
    };

    const expectedDataset = {
      name: 'open-numbers/ddf--gapminder--systema_globalis'
    };

    const expectedError = 'Dataset exists, cannot import same dataset twice';

    const flowStepCounterSpy = this.spy();

    const cliService = proxyqire('../../ws.services/cli.service', {
      '../ws.repository/ddf/users/users.repository': {
        findUserByEmail: (email, onFound) => {
          flowStepCounterSpy('findUserByEmail');
          expect(email).to.equal(constants.DEFAULT_USER_EMAIL);
          onFound(null, expectedUser);
        }
      },
      '../ws.repository/ddf/datasets/datasets.repository': {
        findByGithubUrl: (githubUrl, onFound) => {
          flowStepCounterSpy('findByGithubUrl');
          expect(githubUrl).to.equal(params.github);
          onFound(null, expectedDataset);
        }
      }
    });

    cliService.importDataset(params, error => {
      expect(error).to.exist;
      expect(error).to.equal(expectedError);

      expect(flowStepCounterSpy.withArgs('findByGithubUrl').calledOnce).to.be.true;
      expect(flowStepCounterSpy.withArgs('findUserByEmail').calledOnce).to.be.true;
      done();
    });
  }));


  it('should yield error when during dataset importing error occurred while searching for user', sinon.test(function (done) {
    const params = {
      commit: '8ad3096185b5b17bc80ae582870fb956f00019fd',
      lifecycleHooks: { onTransactionCreated: () => {} },
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git'
    };

    const expectedError = 'Boo!';

    const cliService = proxyqire('../../ws.services/cli.service', {
      '../ws.repository/ddf/users/users.repository': {
        findUserByEmail: (email, onFound) => {
          onFound(expectedError);
        }
      }
    });

    cliService.importDataset(params, error => {
      expect(error).to.exist;
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('should yield error when during dataset importing user was not found', sinon.test(function (done) {
    const params = {
      commit: '8ad3096185b5b17bc80ae582870fb956f00019fd',
      lifecycleHooks: { onTransactionCreated: () => {} },
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git'
    };

    const expectedError = 'User that tries to initiate import was not found';

    const cliService = proxyqire('../../ws.services/cli.service', {
      '../ws.repository/ddf/users/users.repository': {
        findUserByEmail: (email, onFound) => {
          onFound(null, null);
        }
      }
    });

    cliService.importDataset(params, error => {
      expect(error).to.exist;
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('should yield error when during dataset importing error occurred while searching for dataset', sinon.test(function (done) {
    const params = {
      commit: '8ad3096185b5b17bc80ae582870fb956f00019fd',
      lifecycleHooks: { onTransactionCreated: () => {} },
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git'
    };

    const expectedError = 'Boo!';
    const user = {};

    const cliService = proxyqire('../../ws.services/cli.service', {
      '../ws.repository/ddf/users/users.repository': {
        findUserByEmail: (email, onFound) => {
          onFound(null, user);
        }
      },
      '../ws.repository/ddf/datasets/datasets.repository': {
        findByGithubUrl: (githubUrl, onFound) => {
          onFound(expectedError);
        }
      },
    });

    cliService.importDataset(params, error => {
      expect(error).to.exist;
      expect(error).to.equal(expectedError);
      done();
    });
  }));
});
