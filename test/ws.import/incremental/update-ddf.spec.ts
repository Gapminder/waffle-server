import '../../../ws.config/db.config';
import '../../../ws.repository';
import * as _ from 'lodash';
import * as sinon from 'sinon';
import { expect } from 'chai';
import * as createDatasetSchema from '../../../ws.import/import-dataset-schema';
import * as updateConceptsTranslations from '../../../ws.import/incremental/translations/update-concept-translations';
import * as updateDatapointsTranslations from '../../../ws.import/incremental/translations/update-datapoint-translations';
import * as updateEntitiesTranslation from '../../../ws.import/incremental/translations/update-entity-translations';
import * as updateConcepts from '../../../ws.import/incremental/update-concepts';
import * as updateDatapoints from '../../../ws.import/incremental/update-datapoints';
import { updateDdf } from '../../../ws.import/incremental/update-ddf';
import * as updateEntities from '../../../ws.import/incremental/update-entities';
import * as ddfImportUtils from '../../../ws.import/utils/import-ddf.utils';
import { logger } from '../../../ws.config/log';

const sandbox = sinon.createSandbox();

describe('Dataset incremental update', () => {

  afterEach(() => sandbox.restore());

  it('should update dataset', (done: Function) => {
    // *** Prepared Data
    const options = {
      user: {
        _id: 'USERID',
        name: 'user'
      },
      github: 'github',
      commit: 'AAAAAAA',
      hashFrom: 'AAAAAAA',
      hashTo: 'BBBBBBB',
      datasetName: 'dataset',
      lifecycleHooks: sandbox.spy()
    };

    // *** Expected Data
    const expectedVersion = Date.now();
    const expectedTransactionId = 'TRANSACTIONID';

    const extendedOptions1 = _.defaults({
      transaction: {
        createdAt: expectedVersion,
        _id: expectedTransactionId
      }
    }, options);

    const extendedOptions2 = _.defaults({
      dataset: {
        name: options.datasetName
      }
    }, extendedOptions1);

    const expectedData = {
      datasetName: options.datasetName,
      version: expectedVersion,
      transactionId: expectedTransactionId
    };

    const indexOfCallback = 1;
    const expectedError = null;

    // *** Stubbed functions
    const resolvePathToDdfFolderStub = sandbox.stub(ddfImportUtils, 'resolvePathToDdfFolder');
    resolvePathToDdfFolderStub.callsArgWithAsync(indexOfCallback, expectedError, options);

    const createTransactionStub = sandbox.stub(ddfImportUtils, 'createTransaction');
    createTransactionStub.callsArgWithAsync(indexOfCallback, expectedError, extendedOptions1);

    const findDatasetStub = sandbox.stub(ddfImportUtils, 'findDataset');
    findDatasetStub.callsArgWithAsync(indexOfCallback, expectedError, extendedOptions2);

    const establishTransactionForDatasetStub = sandbox.stub(ddfImportUtils, 'establishTransactionForDataset');
    establishTransactionForDatasetStub.callsArgWithAsync(indexOfCallback, expectedError, extendedOptions2);

    const findPreviousTransactionStub = sandbox.stub(ddfImportUtils, 'findPreviousTransaction');
    findPreviousTransactionStub.callsArgWithAsync(indexOfCallback, expectedError, extendedOptions2);

    const lifecycleHookStub = sandbox.stub();
    lifecycleHookStub.callsArgWithAsync(indexOfCallback, expectedError, extendedOptions2);

    const activateLifecycleHookStub = sandbox.stub(ddfImportUtils, 'activateLifecycleHook');
    activateLifecycleHookStub.returns(lifecycleHookStub);

    const cloneDdfRepoStub = sandbox.stub(ddfImportUtils, 'cloneDdfRepo');
    cloneDdfRepoStub.callsArgWithAsync(indexOfCallback, expectedError, extendedOptions2);

    const validateDdfRepoStub = sandbox.stub(ddfImportUtils, 'validateDdfRepo');
    validateDdfRepoStub.callsArgWithAsync(indexOfCallback, expectedError, extendedOptions2);

    const getDatapackageStub = sandbox.stub(ddfImportUtils, 'getDatapackage');
    getDatapackageStub.callsArgWithAsync(indexOfCallback, expectedError, extendedOptions2);

    const generateDiffForDatasetUpdateStub = sandbox.stub(ddfImportUtils, 'generateDiffForDatasetUpdate');
    generateDiffForDatasetUpdateStub.callsArgWithAsync(indexOfCallback, expectedError, extendedOptions2);

    const getAllConceptsStub = sandbox.stub(ddfImportUtils, 'getAllConcepts');
    getAllConceptsStub.callsArgWithAsync(indexOfCallback, expectedError, extendedOptions2);

    const getAllPreviousConceptsStub = sandbox.stub(ddfImportUtils, 'getAllPreviousConcepts');
    getAllPreviousConceptsStub.callsArgWithAsync(indexOfCallback, expectedError, extendedOptions2);

    const closeTransactionStub = sandbox.stub(ddfImportUtils, 'closeTransaction');
    closeTransactionStub.callsArgWithAsync(indexOfCallback, expectedError, extendedOptions2);

    const updateConceptsStub = sandbox.stub(updateConcepts, 'updateConcepts');
    updateConceptsStub.callsArgWithAsync(indexOfCallback, expectedError, extendedOptions2);

    const updateEntitiesStub = sandbox.stub(updateEntities, 'updateEntities');
    updateEntitiesStub.callsArgWithAsync(indexOfCallback, expectedError, extendedOptions2);

    const updateDatapointsStub = sandbox.stub(updateDatapoints, 'updateDatapoints');
    updateDatapointsStub.callsArgWithAsync(indexOfCallback, expectedError, extendedOptions2);

    const updateConceptsTranslationsStub = sandbox.stub(updateConceptsTranslations, 'updateConceptsTranslations');
    updateConceptsTranslationsStub.callsArgWithAsync(indexOfCallback, expectedError, extendedOptions2);

    const updateEntitiesTranslationStub = sandbox.stub(updateEntitiesTranslation, 'updateEntitiesTranslation');
    updateEntitiesTranslationStub.callsArgWithAsync(indexOfCallback, expectedError, extendedOptions2);

    const updateDatapointsTranslationsStub = sandbox.stub(updateDatapointsTranslations, 'updateDatapointsTranslations');
    updateDatapointsTranslationsStub.callsArgWithAsync(indexOfCallback, expectedError, extendedOptions2);

    const createDatasetSchemaStub = sandbox.stub(createDatasetSchema, 'createDatasetSchema');
    createDatasetSchemaStub.callsArgWithAsync(indexOfCallback, expectedError, extendedOptions2);

    // *** Assertions
    const onDatasetUpdatedSpy = sandbox.spy(() => {
      sinon.assert.calledOnce(activateLifecycleHookStub);
      sinon.assert.calledOnce(resolvePathToDdfFolderStub);
      sinon.assert.calledOnce(createTransactionStub);
      sinon.assert.calledOnce(findDatasetStub);
      sinon.assert.calledOnce(establishTransactionForDatasetStub);
      sinon.assert.calledOnce(findPreviousTransactionStub);
      sinon.assert.calledOnce(lifecycleHookStub);
      sinon.assert.calledOnce(cloneDdfRepoStub);
      sinon.assert.calledOnce(validateDdfRepoStub);
      sinon.assert.calledOnce(getDatapackageStub);
      sinon.assert.calledOnce(generateDiffForDatasetUpdateStub);
      sinon.assert.calledOnce(getAllConceptsStub);
      sinon.assert.calledOnce(getAllPreviousConceptsStub);
      sinon.assert.calledOnce(closeTransactionStub);
      sinon.assert.calledOnce(updateConceptsStub);
      sinon.assert.calledOnce(updateEntitiesStub);
      sinon.assert.calledOnce(updateDatapointsStub);
      sinon.assert.calledOnce(updateConceptsTranslationsStub);
      sinon.assert.calledOnce(updateEntitiesTranslationStub);
      sinon.assert.calledOnce(updateDatapointsTranslationsStub);
      sinon.assert.calledOnce(createDatasetSchemaStub);
      sinon.assert.calledOnce(onDatasetUpdatedSpy);
      sinon.assert.calledWithExactly(onDatasetUpdatedSpy, expectedError, expectedData);

      return done();
    });
    sandbox.stub(logger, 'info');

    updateDdf(options, onDatasetUpdatedSpy);
  });

  it('should respond with an error when smth went wrong during the process of establishing transaction for dataset', (done: Function) => {
    // *** Prepared Data
    const options = {
      user: {
        _id: 'USERID',
        name: 'user'
      },
      github: 'github',
      commit: 'AAAAAAA',
      hashFrom: 'AAAAAAA',
      hashTo: 'BBBBBBB',
      datasetName: 'dataset',
      lifecycleHooks: sandbox.spy()
    };

    // *** Expected Data
    const expectedVersion = Date.now();
    const expectedTransactionId = 'TRANSACTIONID';

    const extendedOptions1 = _.defaults({
      transaction: {
        createdAt: expectedVersion,
        _id: expectedTransactionId
      }
    }, options);

    const extendedOptions2 = _.defaults({
      dataset: {
        name: options.datasetName
      }
    }, extendedOptions1);

    const expectedData = {
      transactionId: expectedTransactionId
    };

    const indexOfCallback = 1;
    const expectedError1 = null;
    const expectedError2 = 'Boo!';

    // *** Stubbed functions
    const resolvePathToDdfFolderStub = sandbox.stub(ddfImportUtils, 'resolvePathToDdfFolder');
    resolvePathToDdfFolderStub.callsArgWithAsync(indexOfCallback, expectedError1, options);

    const createTransactionStub = sandbox.stub(ddfImportUtils, 'createTransaction');
    createTransactionStub.callsArgWithAsync(indexOfCallback, expectedError1, extendedOptions1);

    const findDatasetStub = sandbox.stub(ddfImportUtils, 'findDataset');
    findDatasetStub.callsArgWithAsync(indexOfCallback, expectedError1, extendedOptions2);

    const establishTransactionForDatasetStub = sandbox.stub(ddfImportUtils, 'establishTransactionForDataset');
    establishTransactionForDatasetStub.callsArgWithAsync(indexOfCallback, expectedError2, extendedOptions2);

    const findPreviousTransactionStub = sandbox.stub(ddfImportUtils, 'findPreviousTransaction');
    const lifecycleHookStub = sandbox.stub();

    const activateLifecycleHookStub = sandbox.stub(ddfImportUtils, 'activateLifecycleHook');
    activateLifecycleHookStub.returns(lifecycleHookStub);

    const cloneDdfRepoStub = sandbox.stub(ddfImportUtils, 'cloneDdfRepo');
    const validateDdfRepoStub = sandbox.stub(ddfImportUtils, 'validateDdfRepo');
    const getDatapackageStub = sandbox.stub(ddfImportUtils, 'getDatapackage');
    const generateDiffForDatasetUpdateStub = sandbox.stub(ddfImportUtils, 'generateDiffForDatasetUpdate');
    const getAllConceptsStub = sandbox.stub(ddfImportUtils, 'getAllConcepts');
    const getAllPreviousConceptsStub = sandbox.stub(ddfImportUtils, 'getAllPreviousConcepts');
    const updateConceptsStub = sandbox.stub(updateConcepts, 'updateConcepts');
    const updateEntitiesStub = sandbox.stub(updateEntities, 'updateEntities');
    const updateDatapointsStub = sandbox.stub(updateDatapoints, 'updateDatapoints');
    const updateConceptsTranslationsStub = sandbox.stub(updateConceptsTranslations, 'updateConceptsTranslations');
    const updateEntitiesTranslationStub = sandbox.stub(updateEntitiesTranslation, 'updateEntitiesTranslation');
    const updateDatapointsTranslationsStub = sandbox.stub(updateDatapointsTranslations, 'updateDatapointsTranslations');
    const createDatasetSchemaStub = sandbox.stub(createDatasetSchema, 'createDatasetSchema');
    const closeTransactionStub = sandbox.stub(ddfImportUtils, 'closeTransaction');

    // *** Assertions
    const onDatasetUpdatedSpy = sandbox.spy(() => {
      sinon.assert.calledOnce(activateLifecycleHookStub);
      sinon.assert.calledOnce(resolvePathToDdfFolderStub);
      sinon.assert.calledOnce(createTransactionStub);
      sinon.assert.calledOnce(findDatasetStub);
      sinon.assert.calledOnce(establishTransactionForDatasetStub);
      sinon.assert.notCalled(lifecycleHookStub);
      sinon.assert.notCalled(findPreviousTransactionStub);
      sinon.assert.notCalled(cloneDdfRepoStub);
      sinon.assert.notCalled(validateDdfRepoStub);
      sinon.assert.notCalled(getDatapackageStub);
      sinon.assert.notCalled(generateDiffForDatasetUpdateStub);
      sinon.assert.notCalled(getAllConceptsStub);
      sinon.assert.notCalled(getAllPreviousConceptsStub);
      sinon.assert.notCalled(updateConceptsStub);
      sinon.assert.notCalled(updateEntitiesStub);
      sinon.assert.notCalled(updateDatapointsStub);
      sinon.assert.notCalled(updateConceptsTranslationsStub);
      sinon.assert.notCalled(updateEntitiesTranslationStub);
      sinon.assert.notCalled(updateDatapointsTranslationsStub);
      sinon.assert.notCalled(createDatasetSchemaStub);
      sinon.assert.notCalled(closeTransactionStub);
      sinon.assert.calledOnce(onDatasetUpdatedSpy);
      sinon.assert.calledWithExactly(onDatasetUpdatedSpy, expectedError2, expectedData);

      return done();
    });
    sandbox.stub(logger, 'info');

    updateDdf(options, onDatasetUpdatedSpy);
  });

  it('should respond with an error when smth went wrong during the process of creating transaction', (done: Function) => {
    // *** Prepared Data
    const options = {
      user: {
        _id: 'USERID',
        name: 'user'
      },
      github: 'github',
      commit: 'AAAAAAA',
      hashFrom: 'AAAAAAA',
      hashTo: 'BBBBBBB',
      datasetName: 'dataset',
      lifecycleHooks: sandbox.spy()
    };

    // *** Expected Data
    const expectedData = {
      datasetName: undefined,
      transactionId: undefined,
      version: undefined
    };

    const indexOfCallback = 1;
    const expectedError1 = null;
    const expectedError2 = 'Boo!';

    // *** Stubbed functions
    const resolvePathToDdfFolderStub = sandbox.stub(ddfImportUtils, 'resolvePathToDdfFolder');
    resolvePathToDdfFolderStub.callsArgWithAsync(indexOfCallback, expectedError1, options);

    const createTransactionStub = sandbox.stub(ddfImportUtils, 'createTransaction');
    createTransactionStub.callsArgWithAsync(indexOfCallback, expectedError2, options);

    const findDatasetStub = sandbox.stub(ddfImportUtils, 'findDataset');
    const establishTransactionForDatasetStub = sandbox.stub(ddfImportUtils, 'establishTransactionForDataset');
    const findPreviousTransactionStub = sandbox.stub(ddfImportUtils, 'findPreviousTransaction');
    const lifecycleHookStub = sandbox.stub();

    const activateLifecycleHookStub = sandbox.stub(ddfImportUtils, 'activateLifecycleHook');
    activateLifecycleHookStub.returns(lifecycleHookStub);

    const cloneDdfRepoStub = sandbox.stub(ddfImportUtils, 'cloneDdfRepo');
    const validateDdfRepoStub = sandbox.stub(ddfImportUtils, 'validateDdfRepo');
    const getDatapackageStub = sandbox.stub(ddfImportUtils, 'getDatapackage');
    const generateDiffForDatasetUpdateStub = sandbox.stub(ddfImportUtils, 'generateDiffForDatasetUpdate');
    const getAllConceptsStub = sandbox.stub(ddfImportUtils, 'getAllConcepts');
    const getAllPreviousConceptsStub = sandbox.stub(ddfImportUtils, 'getAllPreviousConcepts');
    const updateConceptsStub = sandbox.stub(updateConcepts, 'updateConcepts');
    const updateEntitiesStub = sandbox.stub(updateEntities, 'updateEntities');
    const updateDatapointsStub = sandbox.stub(updateDatapoints, 'updateDatapoints');
    const updateConceptsTranslationsStub = sandbox.stub(updateConceptsTranslations, 'updateConceptsTranslations');
    const updateEntitiesTranslationStub = sandbox.stub(updateEntitiesTranslation, 'updateEntitiesTranslation');
    const updateDatapointsTranslationsStub = sandbox.stub(updateDatapointsTranslations, 'updateDatapointsTranslations');
    const createDatasetSchemaStub = sandbox.stub(createDatasetSchema, 'createDatasetSchema');
    const closeTransactionStub = sandbox.stub(ddfImportUtils, 'closeTransaction');

    // *** Assertions
    const onDatasetUpdatedSpy = sandbox.spy(() => {
      sinon.assert.calledOnce(activateLifecycleHookStub);
      sinon.assert.calledOnce(resolvePathToDdfFolderStub);
      sinon.assert.calledOnce(createTransactionStub);
      sinon.assert.notCalled(findDatasetStub);
      sinon.assert.notCalled(establishTransactionForDatasetStub);
      sinon.assert.notCalled(lifecycleHookStub);
      sinon.assert.notCalled(findPreviousTransactionStub);
      sinon.assert.notCalled(cloneDdfRepoStub);
      sinon.assert.notCalled(validateDdfRepoStub);
      sinon.assert.notCalled(getDatapackageStub);
      sinon.assert.notCalled(generateDiffForDatasetUpdateStub);
      sinon.assert.notCalled(getAllConceptsStub);
      sinon.assert.notCalled(getAllPreviousConceptsStub);
      sinon.assert.notCalled(updateConceptsStub);
      sinon.assert.notCalled(updateEntitiesStub);
      sinon.assert.notCalled(updateDatapointsStub);
      sinon.assert.notCalled(updateConceptsTranslationsStub);
      sinon.assert.notCalled(updateEntitiesTranslationStub);
      sinon.assert.notCalled(updateDatapointsTranslationsStub);
      sinon.assert.notCalled(createDatasetSchemaStub);
      sinon.assert.notCalled(closeTransactionStub);
      sinon.assert.calledOnce(onDatasetUpdatedSpy);
      sinon.assert.calledWithExactly(onDatasetUpdatedSpy, expectedError2, expectedData);

      return done();
    });

    updateDdf(options, onDatasetUpdatedSpy);
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

    updateDdf(context, (error, externalContext) => {
      expect(error).to.equal(expectedError);
      expect(externalContext.transactionId).to.be.undefined;
      expect(externalContext.version).to.be.undefined;
      expect(externalContext.datasetName).to.be.undefined;

      sinon.assert.calledOnce(resolvePathToDdfFolderStub);
      done();
    });
  });
});
