import '../../ws.repository';

import * as sinon from 'sinon';
import { expect } from 'chai';

import * as ddfImportUtils from '../../ws.import/utils/import-ddf.utils';
import * as createEntitiesModule from '../../ws.import/import-entities';
import * as createConceptsModule from '../../ws.import/import-concepts';
import * as createDatapointsModule from '../../ws.import/import-datapoints';
import * as createTranslationsModule from '../../ws.import/import-translations';
import * as createDatasetSchemaModule from '../../ws.import/import-dataset-schema';

import { importDdf } from '../../ws.import/import-ddf';
import { logger } from '../../ws.config/log';

const sandbox = sinon.createSandbox();

describe('Import ddf dataset from git repository', () => {

  afterEach(() => sandbox.restore());

  it('should import dataset successfully', (done: Function) => {
    const context = {
      isDatasetPrivate: false,
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git',
      datasetName: 'open-numbers/ddf--gapminder--systema_globalis.git',
      commit: 'aaaaaaa',
      user: { email: 'dev@gapminder.org' },
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

    importDdf(context, (error, externalContext) => {
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
      user: { email: 'dev@gapminder.org' },
      lifecycleHooks: {
        onTransactionCreated: () => {
        }
      }
    };

    const expectedError = 'Boo!';
    sandbox.stub(ddfImportUtils, 'resolvePathToDdfFolder').callsArgWithAsync(1, expectedError, context);
    sandbox.stub(logger, 'info');

    importDdf(context, (error, externalContext) => {
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
      user: { email: 'dev@gapminder.org' },
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

    importDdf(context, (error, externalContext) => {
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
      user: { email: 'dev@gapminder.org' },
      lifecycleHooks: {
        onTransactionCreated: () => {
        }
      }
    };

    const expectedError = 'Boo!';

    const resolvePathToDdfFolderStub = sandbox.stub(ddfImportUtils, 'resolvePathToDdfFolder').callsArgWithAsync(1, expectedError, context);
    sandbox.stub(logger, 'info');

    importDdf(context, (error, externalContext) => {
      expect(error).to.equal(expectedError);
      expect(externalContext.transactionId).to.be.undefined;
      expect(externalContext.version).to.be.undefined;
      expect(externalContext.datasetName).to.be.undefined;

      sinon.assert.calledOnce(resolvePathToDdfFolderStub);
      done();
    });
  });
});
