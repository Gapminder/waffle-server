import '../../../ws.repository';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import { config } from '../../../ws.config/config';
import * as ddfImportUtils from '../../../ws.import/utils/import-ddf.utils';
import * as reposService from '../../../ws.services/repos.service';
import * as datapackageParser from '../../../ws.import/utils/datapackage.parser';
import * as wsCli from 'waffle-server-import-cli';

import { ConceptsRepositoryFactory } from '../../../ws.repository/ddf/concepts/concepts.repository';
import { DatasetTransactionsRepository } from '../../../ws.repository/ddf/dataset-transactions/dataset-transactions.repository';
import { DatasetsRepository } from '../../../ws.repository/ddf/datasets/datasets.repository';
import { logger } from '../../../ws.config/log';
import { constants } from '../../../ws.utils/constants';

const sandbox = sinonTest.configureTest(sinon);

describe('Ddf import utils', () => {
  it('gets all concepts', sandbox(function (done: Function) {
    const context = {
      dataset: {
        _id: 'dsId'
      },
      transaction: {
        createdAt: 1111111
      }
    };

    const foundConcepts = [
      {
        gid: 'time',
        properties: {
          concept_type: 'time'
        }
      },
      {
        gid: 'year',
        properties: {
          concept_type: 'year'
        }
      },
      {
        gid: 'name',
        properties: {
          concept_type: 'string'
        }
      },
      {
        gid: 'geo',
        properties: {
          concept_type: constants.CONCEPT_TYPE_ENTITY_DOMAIN
        }
      }
    ];

    const findAllPopulatedStub = this.stub().callsArgWithAsync(0, null, foundConcepts);
    const latestVersionStub = this.stub(ConceptsRepositoryFactory, 'latestVersion').returns({findAllPopulated: findAllPopulatedStub});

    ddfImportUtils.getAllConcepts(context, (error, externalContext) => {
      expect(error).to.not.exist;

      sinon.assert.alwaysCalledWith(latestVersionStub, context.dataset._id, context.transaction.createdAt);
      expect(externalContext.concepts).to.deep.equal({
        time: {
          gid: 'time',
          properties: {
            concept_type: 'time'
          }
        },
        year: {
          gid: 'year',
          properties: {
            concept_type: 'year'
          }
        },
        name: {
          gid: 'name',
          properties: {
            concept_type: 'string'
          }
        },
        geo: {
          gid: 'geo',
          properties: {
            concept_type: constants.CONCEPT_TYPE_ENTITY_DOMAIN
          }
        }
      });

      expect(externalContext.timeConcepts).to.deep.equal({
        time: {
          gid: 'time',
          properties: {
            concept_type: 'time'
          }
        },
        year: {
          gid: 'year',
          properties: {
            concept_type: 'year'
          }
        }
      });

      done();
    });
  }));

  it('cannot get all concepts: error while db access', sandbox(function (done: Function) {
    const context = {
      dataset: {
        _id: 'dsId'
      },
      transaction: {
        createdAt: 1111111
      }
    };

    const expectedError = '[Error]: db access error';

    const findAllPopulatedStub = this.stub().callsArgWithAsync(0, expectedError);
    this.stub(ConceptsRepositoryFactory, 'latestVersion').returns({findAllPopulated: findAllPopulatedStub});

    ddfImportUtils.getAllConcepts(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('gets all previous concepts', sandbox(function (done: Function) {
    const context = {
      dataset: {
        _id: 'dsId'
      },
      previousTransaction: {
        createdAt: 2222222
      }
    };

    const foundConcepts = [
      {
        gid: 'name',
        properties: {
          concept_type: 'string'
        }
      },
      {
        gid: 'geo',
        properties: {
          concept_type: constants.CONCEPT_TYPE_ENTITY_DOMAIN
        }
      }
    ];

    const findAllPopulatedStub = this.stub().callsArgWithAsync(0, null, foundConcepts);
    const currentVersionStub = this.stub(ConceptsRepositoryFactory, 'currentVersion').returns({findAllPopulated: findAllPopulatedStub});

    ddfImportUtils.getAllPreviousConcepts(context, (error, externalContext) => {
      expect(error).to.not.exist;

      sinon.assert.alwaysCalledWith(currentVersionStub, context.dataset._id, context.previousTransaction.createdAt);
      expect(externalContext.previousConcepts).to.deep.equal({
        name: {
          gid: 'name',
          properties: {
            concept_type: 'string'
          }
        },
        geo: {
          gid: 'geo',
          properties: {
            concept_type: constants.CONCEPT_TYPE_ENTITY_DOMAIN
          }
        }
      });
      done();
    });
  }));

  it('cannot get all previous concepts: fails while accessing db', sandbox(function (done: Function) {
    const context = {
      dataset: {
        _id: 'dsId'
      },
      previousTransaction: {
        createdAt: 2222222
      }
    };

    const expectedError = '[Error]: db access error';

    const findAllPopulatedStub = this.stub().callsArgWithAsync(0, expectedError);
    this.stub(ConceptsRepositoryFactory, 'currentVersion').returns({findAllPopulated: findAllPopulatedStub});

    ddfImportUtils.getAllPreviousConcepts(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('clones ddf repo', sandbox(function (done: Function) {
    const context = {
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git',
      commit: 'fafafaf'
    };

    const repoInfo = {pathToRepo: '/path/to/repo'};

    const expectedContext = Object.assign({}, context, {repoInfo});

    const cloneRepoStub = this.stub(reposService, 'cloneRepo').callsArgWithAsync(2, null, repoInfo);

    ddfImportUtils.cloneDdfRepo(context, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext).to.deep.equal(expectedContext);

      sinon.assert.alwaysCalledWith(cloneRepoStub, context.github, context.commit);

      done();
    });
  }));

  it('fails while cloning ddf repo', sandbox(function (done: Function) {
    const expectedError = '[Error]: repo cloning error';

    const context = {
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git',
      commit: 'fafafaf'
    };

    this.stub(reposService, 'cloneRepo').callsArgWithAsync(2, expectedError);

    ddfImportUtils.cloneDdfRepo(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('fails while generating diff for dataset update: diff error has happened', sandbox(function (done: Function) {
    const expectedError = '[Error]: diff error';

    const context = {
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git',
      hashFrom: 'fafafaf',
      hashTo: 'fffffff'
    };

    this.stub(wsCli, 'generateDiff').callsArgWithAsync(1, expectedError);

    ddfImportUtils.generateDiffForDatasetUpdate(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('generates diff for dataset update', sandbox(function (done: Function) {
    const context = {
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git',
      hashFrom: 'fafafaf',
      hashTo: 'fffffff'
    };

    const diffResult = {
      diff: '/path/to/diff',
      lang: '/path/to/lang/diff'
    };

    const expectedContext = Object.assign({}, context, {
      pathToDatasetDiff: diffResult.diff,
      pathToLangDiff: diffResult.lang
    });

    const generateDiffStub = this.stub(wsCli, 'generateDiff').callsArgWithAsync(1, null, diffResult);

    ddfImportUtils.generateDiffForDatasetUpdate(context, (error, externalContext) => {
      expect(error).to.not.exist;

      sinon.assert.alwaysCalledWith(generateDiffStub, {
        hashFrom: context.hashFrom,
        hashTo: context.hashTo,
        github: context.github,
        resultPath: config.PATH_TO_DIFF_DDF_RESULT_FILE
      });

      expect(externalContext).to.deep.equal(expectedContext);

      done();
    });
  }));

  it('resolves path to ddf folder asynchronously', sandbox(function (done: Function) {
    const context = {
      datasetName: 'dsName'
    };

    const pathToDdf = '/path/to/ddf';
    const getPathToRepoStub = this.stub(reposService, 'getPathToRepo').returns(pathToDdf);

    ddfImportUtils.resolvePathToDdfFolder(context, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext.pathToDdfFolder).to.equal(pathToDdf);

      sinon.assert.alwaysCalledWith(getPathToRepoStub, context.datasetName);
      done();
    });
  }));

  it('fails parsing datapackage.json', sandbox(function (done: Function) {
    const expectedError = '[Error]: datapackage parsing has failed';

    const context = {
      datasetName: 'dsName'
    };

    const pathToDdf = '/path/to/ddf';
    const getPathToRepoStub = this.stub(reposService, 'getPathToRepo').returns(pathToDdf);
    const loadDatapackageStub = this.stub(datapackageParser, 'loadDatapackage').callsArgWithAsync(1, expectedError);

    ddfImportUtils.getDatapackage(context, (error, externalContext) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('fails parsing datapackage.json', sandbox(function (done: Function) {
    const context = {
      datasetName: 'dsName'
    };

    const expectedDatapackage = {resources: {}};

    const pathToDdf = '/path/to/ddf';
    const getPathToRepoStub = this.stub(reposService, 'getPathToRepo').returns(pathToDdf);
    const loadDatapackageStub = this.stub(datapackageParser, 'loadDatapackage').callsArgWithAsync(1, null, expectedDatapackage);

    ddfImportUtils.getDatapackage(context, (error, externalContext) => {
      expect(error).to.not.exist;

      sinon.assert.alwaysCalledWith(loadDatapackageStub, {folder: pathToDdf});

      expect(externalContext.datapackage).to.equal(expectedDatapackage);
      done();
    });
  }));

  it('fails searching for a previous transaction', sandbox(function (done: Function) {
    const expectedError = '[Error]: failed while searching transaction';

    const context = {
      dataset: {
        _id: 'dsId'
      }
    };

    const findLatestCompletedByDatasetStub = this.stub(DatasetTransactionsRepository, 'findLatestCompletedByDataset').callsArgWithAsync(1, expectedError);

    ddfImportUtils.findPreviousTransaction(context, (error, externalContext) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('finds previous transaction', sandbox(function (done: Function) {
    const previousTransaction = {_id: 'txId'};

    const context = {
      dataset: {
        _id: 'dsId'
      }
    };

    const findLatestCompletedByDatasetStub = this.stub(DatasetTransactionsRepository, 'findLatestCompletedByDataset').callsArgWithAsync(1, null, previousTransaction);

    ddfImportUtils.findPreviousTransaction(context, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext.previousTransaction).to.deep.equal(previousTransaction);

      sinon.assert.alwaysCalledWith(findLatestCompletedByDatasetStub, context.dataset._id);

      done();
    });
  }));

  it('fails creating a transaction', sandbox(function (done: Function) {
    const expectedError = '[Error]: fails creating a transaction';

    const context = {
      user: {
        _id: 'userId'
      },
      commit: 'fffffff'
    };

    const createStub = this.stub(DatasetTransactionsRepository, 'create').callsArgWithAsync(1, expectedError);

    ddfImportUtils.createTransaction(context, (error, externalContext) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('creates a transaction', sandbox(function (done: Function) {
    const createdTransaction = {_id: 'txId'};

    const context = {
      user: {
        _id: 'userId'
      },
      commit: 'fffffff'
    };

    const createStub =
      this.stub(DatasetTransactionsRepository, 'create')
        .callsArgWithAsync(1, null, createdTransaction);

    ddfImportUtils.createTransaction(context, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext.transaction).to.deep.equal(createdTransaction);

      sinon.assert.calledOnce(createStub);

      const transaction = createStub.getCall(0).args[0];
      expect(transaction.createdAt).to.be.a('number');
      expect(transaction.createdBy).to.equal(context.user._id);
      expect(transaction.commit).to.equal(context.commit);

      done();
    });
  }));

  it('fails closing a transaction', sandbox(function (done: Function) {
    const expectedError = '[Error]: fails closing a transaction';

    const context = {
      transaction: {
        _id: 'txId',
        createdAt: 1111111
      }
    };

    const createStub = this.stub(DatasetTransactionsRepository, 'closeTransaction').callsArgWithAsync(1, expectedError);

    ddfImportUtils.closeTransaction(context, (error, externalContext) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('closes a transaction', sandbox(function (done: Function) {
    const context = {
      transaction: {
        _id: 'txId',
        createdAt: 1111111
      }
    };

    const closeTransactionStub = this.stub(DatasetTransactionsRepository, 'closeTransaction').callsArgWithAsync(1, null);

    ddfImportUtils.closeTransaction(context, (error) => {
      expect(error).to.not.exist;

      sinon.assert.calledOnce(closeTransactionStub);
      sinon.assert.calledWith(closeTransactionStub, {
        transactionId: context.transaction._id,
        transactionStartTime: context.transaction.createdAt
      });
      done();
    });
  }));

  it('fails creating dataset because of db error', sandbox(function (done: Function) {
    const expectedError = '[Error]: fails creating dataset because of db error';

    const context = {
      datasetName: 'dsName',
      github: 'github:...',
      transaction: {
        _id: 'txId',
        createdAt: 1111111
      },
      user: {
        _id: 'uId'
      },
      isDatasetPrivate: true
    };

    const createStub = this.stub(DatasetsRepository, 'create').callsArgWithAsync(1, expectedError);

    ddfImportUtils.createDataset(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('fails creating dataset because empty result was returned', sandbox(function (done: Function) {
    const expectedError = 'Dataset was not created due to some issues';

    const context = {
      datasetName: 'dsName',
      github: 'github:...',
      transaction: {
        _id: 'txId',
        createdAt: 1111111
      },
      user: {
        _id: 'uId'
      },
      isDatasetPrivate: true
    };

    const createStub = this.stub(DatasetsRepository, 'create').callsArgWithAsync(1, null, null);

    ddfImportUtils.createDataset(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('fails creating dataset because empty result was returned', sandbox(function (done: Function) {
    const context = {
      datasetName: 'dsName',
      github: 'github:...',
      transaction: {
        _id: 'txId',
        createdAt: 1111111
      },
      user: {
        _id: 'uId'
      },
      isDatasetPrivate: true
    };

    const expectedDataset = {
      _id: 'dsId',
      name: 'dsName'
    };

    const createStub = this.stub(DatasetsRepository, 'create').callsArgWithAsync(1, null, expectedDataset);

    ddfImportUtils.createDataset(context, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext.dataset).to.deep.equal(expectedDataset);
      done();
    });
  }));

  it('fails while searching for a dataset: db error has occurred', sandbox(function (done: Function) {
    const expectedError = '[Error] db error has occurred';

    const context = {};
    this.stub(DatasetsRepository, 'findByName').callsArgWithAsync(1, expectedError);

    ddfImportUtils.findDataset(context, (error, externalContext) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('fails while searching for a dataset: was not found', sandbox(function (done: Function) {
    const expectedError = 'Dataset was not found';

    const context = {};
    this.stub(DatasetsRepository, 'findByName').callsArgWithAsync(1, null, null);

    ddfImportUtils.findDataset(context, (error, externalContext) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('finds a dataset by name', sandbox(function (done: Function) {
    const context = {
      datasetName: 'dsName'
    };

    const expectedDataset = {
      _id: 'dsId',
      name: context.datasetName
    };

    this.stub(DatasetsRepository, 'findByName').callsArgWithAsync(1, null, expectedDataset);

    ddfImportUtils.findDataset(context, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext.dataset).to.deep.equal(expectedDataset);
      done();
    });
  }));

  it('fails establishing transaction for a dataset', sandbox(function (done: Function) {
    const expectedError = '[Error] transaction establishment error';

    const context = {
      transaction: {
        _id: 'txId'
      },
      dataset: {
        _id: 'dsId'
      }
    };

    this.stub(DatasetTransactionsRepository, 'establishForDataset').callsArgWithAsync(1, expectedError);

    ddfImportUtils.establishTransactionForDataset(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('establishes a transaction for a dataset', sandbox(function (done: Function) {
    const context = {
      transaction: {
        _id: 'txId'
      },
      dataset: {
        _id: 'dsId'
      }
    };

    const establishForDatasetStub = this.stub(DatasetTransactionsRepository, 'establishForDataset').callsArgWithAsync(1, null, context);

    ddfImportUtils.establishTransactionForDataset(context, (error) => {
      expect(error).to.not.exist;

      sinon.assert.calledOnce(establishForDatasetStub);

      const options = {transactionId: context.transaction._id, datasetId: context.dataset._id};
      sinon.assert.calledWithExactly(establishForDatasetStub, options, sinon.match.func);

      done();
    });
  }));

  it('fails updating transaction languages', sandbox(function (done: Function) {
    const expectedError = '[Error] fails updating transaction languages';

    const context = {
      transaction: {
        _id: 'txId'
      },
      datapackage: {
        translations: {
          id: 'nl-nl'
        }
      }
    };

    this.stub(DatasetTransactionsRepository, 'updateLanguages').callsArgWithAsync(1, expectedError);

    ddfImportUtils.updateTransactionLanguages(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('fails updating transaction languages', sandbox(function (done: Function) {
    const context = {
      transaction: {
        _id: 'txId'
      },
      datapackage: {
        translations: [
          {id: 'nl-nl'}
        ]
      }
    };

    const updateLanguagesStub = this.stub(DatasetTransactionsRepository, 'updateLanguages').callsArgWithAsync(1, null, context);

    ddfImportUtils.updateTransactionLanguages(context, (error) => {
      expect(error).to.not.exist;

      const options = {transactionId: context.transaction._id, languages: ['nl-nl']};
      sinon.assert.calledWithExactly(updateLanguagesStub, options, sinon.match.func);

      done();
    });
  }));

  describe('cloneImportedDdfRepos', () => {
    let originalThreshingMachine = config.THRASHING_MACHINE;

    beforeEach(() => {
      config.THRASHING_MACHINE = true;
    });

    afterEach(() => {
      config.THRASHING_MACHINE = originalThreshingMachine;
    });

    it('should start clone all dataset available in db', sandbox(function (): any {
      const stubDatasets = [
        {path: '#1'},
        {path: '#2'},
        {path: '#3'}
      ];

      const findAllStub = this.stub(DatasetsRepository, 'findAll').returns(Promise.resolve(stubDatasets));
      const cloneRepoStub = this.stub(reposService, 'cloneRepo').callsArgWithAsync(2, null);

      return ddfImportUtils.cloneImportedDdfRepos().then(() => {
        sinon.assert.calledOnce(findAllStub);

        sinon.assert.calledWith(cloneRepoStub, '#1', undefined, sinon.match.func);
        sinon.assert.calledWith(cloneRepoStub, '#2', undefined, sinon.match.func);
        sinon.assert.calledWith(cloneRepoStub, '#3', undefined, sinon.match.func);

        sinon.assert.callCount(cloneRepoStub, stubDatasets.length);
      });
    }));

    it('should start clone all dataset available in db', sandbox(function (): any {
      const stubDatasets = [
        {path: '#1'},
        {path: '#2'},
        {path: '#3'}
      ];

      const expectedError = 'Cannot clone repo';

      const findAllStub = this.stub(DatasetsRepository, 'findAll').returns(Promise.resolve(stubDatasets));
      const cloneRepoStub = this.stub(reposService, 'cloneRepo').callsArgWithAsync(2, expectedError);

      const errorStub = this.stub(logger, 'error');

      return ddfImportUtils.cloneImportedDdfRepos().then(() => {
        sinon.assert.called(errorStub);
        sinon.assert.calledWith(errorStub, expectedError);

        sinon.assert.called(findAllStub);
        sinon.assert.called(cloneRepoStub);
      });
    }));

    it('should not clone repos on non Threshing machine', sandbox(function (): any {
      config.THRASHING_MACHINE = false;

      const stubDatasets = [
        {path: '#1'},
        {path: '#2'},
        {path: '#3'}
      ];

      const findAllStub = this.stub(DatasetsRepository, 'findAll').returns(Promise.resolve(stubDatasets));
      const cloneRepoStub = this.stub(reposService, 'cloneRepo').callsArgWithAsync(2, null);

      return ddfImportUtils.cloneImportedDdfRepos().then(() => {
        sinon.assert.notCalled(findAllStub);
        sinon.assert.notCalled(cloneRepoStub);
      });
    }));
  });
});
