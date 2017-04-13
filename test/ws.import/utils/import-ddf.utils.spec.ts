import '../../../ws.repository';

import * as proxyqire from 'proxyquire';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { constants } from '../../../ws.utils/constants';
import { config } from '../../../ws.config/config';
import * as ddfImportUtils from '../../../ws.import/utils/import-ddf.utils';
import * as reposService from '../../../ws.services/repos.service';
import * as datapackageParser from '../../../ws.import/utils/datapackage.parser';
import * as wsCli from 'waffle-server-import-cli';

import { ConceptsRepositoryFactory } from '../../../ws.repository/ddf/concepts/concepts.repository';
import { DatasetTransactionsRepository } from '../../../ws.repository/ddf/dataset-transactions/dataset-transactions.repository';
import { DatasetsRepository } from '../../../ws.repository/ddf/datasets/datasets.repository';

describe('Ddf import utils', () => {
  it('gets all concepts', sinon.test(function (done) {
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
          concept_type: 'entity_domain'
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
          },
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
            concept_type: 'entity_domain'
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

  it('cannot get all concepts: error while db access', sinon.test(function (done) {
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

  it('gets all previous concepts', sinon.test(function (done) {
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
          concept_type: 'entity_domain'
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
            concept_type: 'entity_domain'
          }
        }
      });
      done();
    });
  }));

  it('cannot get all previous concepts: fails while accessing db', sinon.test(function (done) {
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

  it('clones ddf repo', sinon.test(function (done) {
    const context = {
      github: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git',
      commit: 'fafafaf'
    };

    const repoInfo = { pathToRepo: '/path/to/repo' };

    const expectedContext = Object.assign({}, context, {repoInfo});

    const cloneRepoStub = this.stub(reposService, 'cloneRepo').callsArgWithAsync(2, null, repoInfo);

    ddfImportUtils.cloneDdfRepo(context, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext).to.deep.equal(expectedContext);

      sinon.assert.alwaysCalledWith(cloneRepoStub, context.github, context.commit);

      done();
    });
  }));

  it('fails while cloning ddf repo', sinon.test(function (done) {
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

  it('fails while generating diff for dataset update: diff error has happened', sinon.test(function (done) {
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

  it('generates diff for dataset update', sinon.test(function (done) {
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

  it('resolves path to ddf folder asynchronously', sinon.test(function(done) {
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

  it('fails parsing datapackage.json', sinon.test(function(done) {
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

  it('fails parsing datapackage.json', sinon.test(function(done) {
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

  it('fails searching for a previous transaction', sinon.test(function(done) {
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


  it('finds previous transaction', sinon.test(function(done) {
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

  it('fails creating a transaction', sinon.test(function(done) {
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

  it('creates a transaction', sinon.test(function(done) {
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

  it('fails closing a transaction', sinon.test(function(done) {
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

  it('closes a transaction', sinon.test(function(done) {
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

  it('fails creating dataset because of db error', sinon.test(function(done) {
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

  it('fails creating dataset because empty result was returned', sinon.test(function(done) {
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

  it('fails creating dataset because empty result was returned', sinon.test(function(done) {
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

  it('fails while searching for a dataset: db error has occurred', sinon.test(function (done) {
    const expectedError = '[Error] db error has occurred';

    const context = {};
    this.stub(DatasetsRepository, 'findByName').callsArgWithAsync(1, expectedError);

    ddfImportUtils.findDataset(context, (error, externalContext) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('fails while searching for a dataset: was not found', sinon.test(function (done) {
    const expectedError = 'Dataset was not found';

    const context = {};
    this.stub(DatasetsRepository, 'findByName').callsArgWithAsync(1, null, null);

    ddfImportUtils.findDataset(context, (error, externalContext) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('finds a dataset by name', sinon.test(function (done) {
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

  it('fails establishing transaction for a dataset', sinon.test(function (done) {
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

  it('establishes a transaction for a dataset', sinon.test(function (done) {
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

      const options = { transactionId: context.transaction._id, datasetId: context.dataset._id };
      sinon.assert.calledWithExactly(establishForDatasetStub, options, sinon.match.func);

      done();
    });
  }));

  it('fails updating transaction languages', sinon.test(function (done) {
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

  it('fails updating transaction languages', sinon.test(function (done) {
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

      const options = { transactionId: context.transaction._id, languages: ['nl-nl'] };
      sinon.assert.calledWithExactly(updateLanguagesStub, options, sinon.match.func);

      done();
    });
  }));
});
