import '../../ws.repository';

import * as sinon from 'sinon';
import { expect } from 'chai';

import * as ddfImportUtils from '../../ws.import/utils/import-ddf.utils';
import * as createEntitiesModule from '../../ws.import/import-entities';
import * as createConceptsModule from '../../ws.import/import-concepts';
import * as createDatapointsModule from '../../ws.import/import-datapoints';
import * as createTranslationsModule from '../../ws.import/import-translations';
import * as createDatasetSchemaModule from '../../ws.import/import-dataset-schema';

import * as importService from '../../ws.import/import-ddf';
import * as cliService from '../../ws.services/cli.service';
import * as cliUtils from '../../test/cli.utils';
import * as reposService from '../../ws.services/repos.service';

import {logger} from '../../ws.config/log';
import {config} from '../../ws.config/config';

const sandbox = sinon.createSandbox();

describe('Import ddf dataset from git repository', () => {

  afterEach(() => sandbox.restore());

  it('should import dataset successfully', (done: Function) => {
    const context = {
      isDatasetPrivate: false,
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git',
      datasetName: 'open-numbers/ddf--gapminder--systema_globalis.git',
      commit: 'aaaaaaa',
      user: {email: 'dev@gapminder.org'},
      lifecycleHooks: {
        onTransactionCreated: sandbox.spy()
      },
      transaction: {
        _id: 'txId',
        createdAt: 1111111
      }
    };

    const resolvePathToDdfFolderStub = sandbox.stub(ddfImportUtils, 'resolvePathToDdfFolder').callsArgWithAsync(1, null, context);
    const createTransactionStub = sandbox.stub(ddfImportUtils, 'createTransaction').callsArgWithAsync(1, null, context);
    const createDatasetStub = sandbox.stub(ddfImportUtils, 'createDataset').callsArgWithAsync(1, null, context);
    const establishTransactionForDatasetStub = sandbox.stub(ddfImportUtils, 'establishTransactionForDataset').callsArgWithAsync(1, null, context);
    const cloneDdfRepoStub = sandbox.stub(ddfImportUtils, 'cloneDdfRepo').callsArgWithAsync(1, null, context);
    const validateDdfRepoStub = sandbox.stub(ddfImportUtils, 'validateDdfRepo').callsArgWithAsync(1, null, context);
    const getDatapackageStub = sandbox.stub(ddfImportUtils, 'getDatapackage').callsArgWithAsync(1, null, context);
    const updateTransactionLanguagesStub = sandbox.stub(ddfImportUtils, 'updateTransactionLanguages').callsArgWithAsync(1, null, context);
    const createConceptsStub = sandbox.stub(createConceptsModule, 'createConcepts').callsArgWithAsync(1, null, context);
    const createEntitiesStub = sandbox.stub(createEntitiesModule, 'createEntities').callsArgWithAsync(1, null, context);
    const createDatapointsStub = sandbox.stub(createDatapointsModule, 'createDatapoints').callsArgWithAsync(1, null, context);
    const createTranslationsStub = sandbox.stub(createTranslationsModule, 'createTranslations').callsArgWithAsync(1, null, context);
    const createDatasetSchemaStub = sandbox.stub(createDatasetSchemaModule, 'createDatasetSchema').callsArgWithAsync(1, null, context);
    const closeTransactionStub = sandbox.stub(ddfImportUtils, 'closeTransaction').callsArgWithAsync(1, null, context);
    sandbox.stub(logger, 'info');

    importService.importDdf(context, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext).to.deep.equal({
        datasetName: context.datasetName,
        version: context.transaction.createdAt,
        transactionId: context.transaction._id
      });

      sinon.assert.callOrder(
        resolvePathToDdfFolderStub,
        createTransactionStub,
        createDatasetStub,
        establishTransactionForDatasetStub,
        context.lifecycleHooks.onTransactionCreated,
        cloneDdfRepoStub,
        validateDdfRepoStub,
        getDatapackageStub,
        updateTransactionLanguagesStub,
        createConceptsStub,
        createEntitiesStub,
        createDatapointsStub,
        createTranslationsStub,
        createDatasetSchemaStub,
        closeTransactionStub
      );

      done();
    });
  });

  it('should fail if error occurred during import', (done: Function) => {
    const context = {
      isDatasetPrivate: false,
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git',
      datasetName: 'open-numbers/ddf--gapminder--systema_globalis.git',
      commit: 'aaaaaaa',
      user: {email: 'dev@gapminder.org'},
      lifecycleHooks: {
        onTransactionCreated: () => {
        }
      }
    };

    const expectedError = 'Boo!';
    sandbox.stub(ddfImportUtils, 'resolvePathToDdfFolder').callsArgWithAsync(1, expectedError, context);
    sandbox.stub(logger, 'info');

    importService.importDdf(context, (error, externalContext) => {
      expect(error).to.equal(expectedError);
      expect(externalContext).to.deep.equal({
        datasetName: context.datasetName,
        version: undefined,
        transactionId: undefined
      });

      done();
    });
  });

  it('should fail with transaction id if it was already created when error had happened', (done: Function) => {
    const context = {
      isDatasetPrivate: false,
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git',
      datasetName: 'open-numbers/ddf--gapminder--systema_globalis.git',
      commit: 'aaaaaaa',
      user: {email: 'dev@gapminder.org'},
      lifecycleHooks: {
        onTransactionCreated: () => {
        }
      },
      transaction: {
        _id: 'txId',
        createdAt: 1111111
      }
    };

    const expectedError = 'Boo!';

    const resolvePathToDdfFolderStub = sandbox.stub(ddfImportUtils, 'resolvePathToDdfFolder').callsArgWithAsync(1, null, context);
    const createTransactionStub = sandbox.stub(ddfImportUtils, 'createTransaction').callsArgWithAsync(1, null, context);
    const createDatasetStub = sandbox.stub(ddfImportUtils, 'createDataset').callsArgWithAsync(1, expectedError, context);
    sandbox.stub(logger, 'info');

    importService.importDdf(context, (error, externalContext) => {
      expect(error).to.equal(expectedError);
      expect(externalContext).to.deep.equal({
        transactionId: context.transaction._id
      });

      sinon.assert.callOrder(
        resolvePathToDdfFolderStub,
        createTransactionStub,
        createDatasetStub
      );

      done();
    });
  });

  it('should not fail when error has happened and transaction is not yet created', (done: Function) => {
    const context = {
      isDatasetPrivate: false,
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git',
      commit: 'aaaaaaa',
      user: {email: 'dev@gapminder.org'},
      lifecycleHooks: {
        onTransactionCreated: () => {
        }
      }
    };

    const expectedError = 'Boo!';

    const resolvePathToDdfFolderStub = sandbox.stub(ddfImportUtils, 'resolvePathToDdfFolder').callsArgWithAsync(1, expectedError, context);
    sandbox.stub(logger, 'info');

    importService.importDdf(context, (error, externalContext) => {
      expect(error).to.equal(expectedError);
      expect(externalContext.transactionId).to.be.undefined;
      expect(externalContext.version).to.be.undefined;
      expect(externalContext.datasetName).to.be.undefined;

      sinon.assert.calledOnce(resolvePathToDdfFolderStub);
      done();
    });
  });
});

describe('importService.importDdfRepos', () => {
  let originalThreshingMachine = config.THRASHING_MACHINE;
  let defaultDatasets = config.DEFAULT_DATASETS;

  beforeEach(() => {
    config.THRASHING_MACHINE = true;
    config.DEFAULT_DATASETS = [
      '#1',
      '#2',
      '#3'
    ];
  });

  afterEach(() => {
    config.THRASHING_MACHINE = originalThreshingMachine;
    config.DEFAULT_DATASETS = defaultDatasets;
  });

  it('should start import all dataset from config in db', sandbox(function (): any {
    const cloneStub = this.stub(reposService, 'cloneRepo');
    cloneStub
      .onFirstCall().callsArgWithAsync(2, null)
      .onSecondCall().callsArgWithAsync(2, null)
      .onThirdCall().callsArgWithAsync(2, null)
      .threw();
    const getRepoNameForDatasetStub = this.stub(reposService, 'getRepoNameForDataset');
    getRepoNameForDatasetStub
      .onFirstCall().returns(config.DEFAULT_DATASETS[0])
      .onSecondCall().returns(config.DEFAULT_DATASETS[1])
      .onThirdCall().returns(config.DEFAULT_DATASETS[2])
      .threw();
    const getCommitsByGithubUrlStub = this.stub(cliUtils, 'getCommitsByGithubUrl');
    getCommitsByGithubUrlStub
      .onFirstCall().callsArgWithAsync(1, null, ['aaaaaaa'])
      .onSecondCall().callsArgWithAsync(1, null, ['bbbbbbb'])
      .onThirdCall().callsArgWithAsync(1, null, ['ccccccc'])
      .threw();
    const importDatasetStub = this.stub(cliService, 'importDataset').callsArgWithAsync(1, null);
    this.stub(logger, 'info');

    return importService.importDdfRepos().then(() => {
      sinon.assert.calledThrice(cloneStub);
      sinon.assert.calledThrice(getRepoNameForDatasetStub);
      sinon.assert.calledThrice(getCommitsByGithubUrlStub);

      sinon.assert.calledWith(importDatasetStub, sinon.match({datasetName: '#1', github: '#1', commit: 'aaaaaaa'}), sinon.match.func);
      sinon.assert.calledWith(importDatasetStub, sinon.match({datasetName: '#2', github: '#2', commit: 'bbbbbbb'}), sinon.match.func);
      sinon.assert.calledWith(importDatasetStub, sinon.match({datasetName: '#3', github: '#3', commit: 'ccccccc'}), sinon.match.func);

      sinon.assert.callCount(importDatasetStub, config.DEFAULT_DATASETS.length);
    });
  }));

  it('should import only 2 datasets due to the error for getting commits list', sandbox(function (): any {
    const expectedError = 'Cannot get repo commits list';

    const cloneStub = this.stub(reposService, 'cloneRepo');
    cloneStub
      .onFirstCall().callsArgWithAsync(2, null)
      .onSecondCall().callsArgWithAsync(2, null)
      .threw();
    const getRepoNameForDatasetStub = this.stub(reposService, 'getRepoNameForDataset');
    getRepoNameForDatasetStub
      .onFirstCall().returns(config.DEFAULT_DATASETS[0])
      .onSecondCall().returns(config.DEFAULT_DATASETS[1])
      .onThirdCall().returns(config.DEFAULT_DATASETS[2])
      .threw();
    const getCommitsByGithubUrlStub = this.stub(cliUtils, 'getCommitsByGithubUrl');
    getCommitsByGithubUrlStub
      .onFirstCall().callsArgWithAsync(1, expectedError)
      .onSecondCall().callsArgWithAsync(1, null, ['bbbbbbb'])
      .onThirdCall().callsArgWithAsync(1, null, ['ccccccc'])
      .threw();
    const importDatasetStub = this.stub(cliService, 'importDataset').callsArgWithAsync(1, null);

    const errorStub = this.stub(logger, 'error');

    return importService.importDdfRepos().then(() => {
      sinon.assert.calledOnce(errorStub);
      sinon.assert.calledWith(errorStub, expectedError);

      sinon.assert.calledThrice(getRepoNameForDatasetStub);
      sinon.assert.calledThrice(getCommitsByGithubUrlStub);
      sinon.assert.calledTwice(cloneStub);
      sinon.assert.calledTwice(importDatasetStub);
      sinon.assert.calledWith(importDatasetStub, sinon.match({datasetName: '#2', github: '#2', commit: 'bbbbbbb'}), sinon.match.func);
      sinon.assert.calledWith(importDatasetStub, sinon.match({datasetName: '#3', github: '#3', commit: 'ccccccc'}), sinon.match.func);
    });
  }));

  it('shouldn\'t import any dataset due to the import error', sandbox(function (): any {
    const expectedError = 'Cannot import dataset';

    const cloneStub = this.stub(reposService, 'cloneRepo');
    cloneStub
      .onFirstCall().callsArgWithAsync(2, null)
      .onSecondCall().callsArgWithAsync(2, null)
      .onThirdCall().callsArgWithAsync(2, null)
      .threw();
    const getRepoNameForDatasetStub = this.stub(reposService, 'getRepoNameForDataset');
    getRepoNameForDatasetStub
      .onFirstCall().returns(config.DEFAULT_DATASETS[0])
      .onSecondCall().returns(config.DEFAULT_DATASETS[1])
      .onThirdCall().returns(config.DEFAULT_DATASETS[2])
      .threw();
    const getCommitsByGithubUrlStub = this.stub(cliUtils, 'getCommitsByGithubUrl');
    getCommitsByGithubUrlStub
      .onFirstCall().callsArgWithAsync(1, null, ['aaaaaaa'])
      .onSecondCall().callsArgWithAsync(1, null, ['bbbbbbb'])
      .onThirdCall().callsArgWithAsync(1, null, ['ccccccc'])
      .threw();
    const importDatasetStub = this.stub(cliService, 'importDataset').callsArgWithAsync(1, expectedError);

    const errorStub = this.stub(logger, 'error');

    return importService.importDdfRepos().then(() => {
      sinon.assert.calledThrice(errorStub);
      sinon.assert.calledWith(errorStub, expectedError);

      sinon.assert.calledThrice(cloneStub);
      sinon.assert.calledThrice(getRepoNameForDatasetStub);
      sinon.assert.calledThrice(getCommitsByGithubUrlStub);
      sinon.assert.calledThrice(importDatasetStub);
      sinon.assert.calledWith(importDatasetStub, sinon.match({datasetName: '#1', github: '#1', commit: 'aaaaaaa'}), sinon.match.func);
      sinon.assert.calledWith(importDatasetStub, sinon.match({datasetName: '#2', github: '#2', commit: 'bbbbbbb'}), sinon.match.func);
      sinon.assert.calledWith(importDatasetStub, sinon.match({datasetName: '#3', github: '#3', commit: 'ccccccc'}), sinon.match.func);
    });
  }));

  it('should not import any repos', sandbox(function (): any {
    config.THRASHING_MACHINE = false;

    const cloneStub = this.stub(reposService, 'cloneRepo');
    const getRepoNameForDatasetStub = this.stub(reposService, 'getRepoNameForDataset');
    const getCommitsByGithubUrlStub = this.stub(cliUtils, 'getCommitsByGithubUrl');
    const importDatasetStub = this.stub(cliService, 'importDataset');
    this.stub(logger, 'info');

    return importService.importDdfRepos().then(() => {
      sinon.assert.notCalled(cloneStub);
      sinon.assert.notCalled(getRepoNameForDatasetStub);
      sinon.assert.notCalled(getCommitsByGithubUrlStub);
      sinon.assert.notCalled(importDatasetStub);
    });
  }));
});
