import '../../ws.repository';

import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import { expect } from 'chai';

import * as ddfImportUtils from '../../ws.import/utils/import-ddf.utils';
import * as createEntitiesModule from '../../ws.import/import-entities';
import * as createConceptsModule from '../../ws.import/import-concepts';
import * as createDatapointsModule from '../../ws.import/import-datapoints';
import * as createTranslationsModule from '../../ws.import/import-translations';
import * as createDatasetSchemaModule from '../../ws.import/import-dataset-schema';

import { importDdf } from '../../ws.import/import-ddf';

const sandbox = sinonTest.configureTest(sinon);

describe('Import ddf dataset from git repository', () => {
  it('should import dataset successfully', sandbox(function (done: Function) {
    const context = {
      isDatasetPrivate: false,
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git',
      datasetName: 'open-numbers/ddf--gapminder--systema_globalis.git',
      commit: 'aaaaaaa',
      user: {email: 'dev@gapminder.org'},
      lifecycleHooks: {
        onTransactionCreated: this.spy()
      },
      transaction: {
        _id: 'txId',
        createdAt: 1111111
      }
    };

    const resolvePathToDdfFolderStub = this.stub(ddfImportUtils, 'resolvePathToDdfFolder').callsArgWithAsync(1, null, context);
    const createTransactionStub = this.stub(ddfImportUtils, 'createTransaction').callsArgWithAsync(1, null, context);
    const createDatasetStub = this.stub(ddfImportUtils, 'createDataset').callsArgWithAsync(1, null, context);
    const establishTransactionForDatasetStub = this.stub(ddfImportUtils, 'establishTransactionForDataset').callsArgWithAsync(1, null, context);
    const cloneDdfRepoStub = this.stub(ddfImportUtils, 'cloneDdfRepo').callsArgWithAsync(1, null, context);
    const validateDdfRepoStub = this.stub(ddfImportUtils, 'validateDdfRepo').callsArgWithAsync(1, null, context);
    const getDatapackageStub = this.stub(ddfImportUtils, 'getDatapackage').callsArgWithAsync(1, null, context);
    const updateTransactionLanguagesStub = this.stub(ddfImportUtils, 'updateTransactionLanguages').callsArgWithAsync(1, null, context);
    const createConceptsStub = this.stub(createConceptsModule, 'createConcepts').callsArgWithAsync(1, null, context);
    const createEntitiesStub = this.stub(createEntitiesModule, 'createEntities').callsArgWithAsync(1, null, context);
    const createDatapointsStub = this.stub(createDatapointsModule, 'createDatapoints').callsArgWithAsync(1, null, context);
    const createTranslationsStub = this.stub(createTranslationsModule, 'createTranslations').callsArgWithAsync(1, null, context);
    const createDatasetSchemaStub = this.stub(createDatasetSchemaModule, 'createDatasetSchema').callsArgWithAsync(1, null, context);
    const closeTransactionStub = this.stub(ddfImportUtils, 'closeTransaction').callsArgWithAsync(1, null, context);

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
        closeTransactionStub,
      );

      done();
    });
  }));

  it('should fail if error occurred during import', sandbox(function (done: Function) {
    const context = {
      isDatasetPrivate: false,
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git',
      datasetName: 'open-numbers/ddf--gapminder--systema_globalis.git',
      commit: 'aaaaaaa',
      user: {email: 'dev@gapminder.org'},
      lifecycleHooks: {
        onTransactionCreated: () => {}
      }
    };

    const expectedError = 'Boo!';
    this.stub(ddfImportUtils, 'resolvePathToDdfFolder').callsArgWithAsync(1, expectedError, context);

    importDdf(context, (error, externalContext) => {
      expect(error).to.equal(expectedError);
      expect(externalContext).to.deep.equal({
        datasetName: context.datasetName,
        version: undefined,
        transactionId: undefined
      });

      done();
    });
  }));

  it('should fail with transaction id if it was already created when error had happened', sandbox(function (done: Function) {
    const context = {
      isDatasetPrivate: false,
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git',
      datasetName: 'open-numbers/ddf--gapminder--systema_globalis.git',
      commit: 'aaaaaaa',
      user: {email: 'dev@gapminder.org'},
      lifecycleHooks: {
        onTransactionCreated: () => {}
      },
      transaction: {
        _id: 'txId',
        createdAt: 1111111
      }
    };

    const expectedError = 'Boo!';

    const resolvePathToDdfFolderStub = this.stub(ddfImportUtils, 'resolvePathToDdfFolder').callsArgWithAsync(1, null, context);
    const createTransactionStub = this.stub(ddfImportUtils, 'createTransaction').callsArgWithAsync(1, null, context);
    const createDatasetStub = this.stub(ddfImportUtils, 'createDataset').callsArgWithAsync(1, expectedError, context);

    importDdf(context, (error, externalContext) => {
      expect(error).to.equal(expectedError);
      expect(externalContext).to.deep.equal({
        transactionId: context.transaction._id
      });

      sinon.assert.callOrder(
        resolvePathToDdfFolderStub,
        createTransactionStub,
        createDatasetStub,
      );

      done();
    });
  }));

  it('should not fail when error has happened and transaction is not yet created', sandbox(function (done: Function) {
    const context = {
      isDatasetPrivate: false,
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git',
      commit: 'aaaaaaa',
      user: {email: 'dev@gapminder.org'},
      lifecycleHooks: {
        onTransactionCreated: () => {}
      },
    };

    const expectedError = 'Boo!';

    const resolvePathToDdfFolderStub = this.stub(ddfImportUtils, 'resolvePathToDdfFolder').callsArgWithAsync(1, expectedError, context);

    importDdf(context, (error, externalContext) => {
      expect(error).to.equal(expectedError);
      expect(externalContext.transactionId).to.be.undefined;
      expect(externalContext.version).to.be.undefined;
      expect(externalContext.datasetName).to.be.undefined;

      sinon.assert.calledOnce(resolvePathToDdfFolderStub);
      done();
    });
  }));
});
