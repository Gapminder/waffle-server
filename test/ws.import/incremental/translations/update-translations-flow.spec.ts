import * as _ from 'lodash';
import * as path from 'path';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { logger } from '../../../../ws.config/log';

import '../../../../ws.repository';
import * as fileUtils from '../../../../ws.utils/file';
import { constants } from '../../../../ws.utils/constants';

import { createTranslationsUpdater } from '../../../../ws.import/incremental/translations/update-translations-flow';

const externalContext: any = {
  pathToLangDiff: path.resolve(__dirname, './fixtures/translations-diff.txt'),
  datasetId: 'datasetId',
  version: 12121212
};

const translations: any = {
  created: [
    {
      "company_size": 'medium',
      "full_name_changed": 'middenweg',
      'is--company_size': 'TRUE'
    },
    {
      "region": "asia",
      "full_name_changed": "Asia deel van Eurazia"
    },
    {
      "company": "mcrsft",
      "name": "Microsoft",
      "country": "de Verenigde Staten van Amerika",
      "region": "america"
    },
    {
      "company": "xsoft",
      "name": "XSoft",
      "country": "Turkije",
      "region": "asia"
    },
    {
      "company": "gap",
      "name": "Gapminder",
      "country": "Zweden",
      "region": "europe"
    }
  ],
  changed: [
    {
      "company": "mcrsft",
      "anno": "1975",
      "company_size": "klein"
    }
  ]
};

describe('Translations processing (common flow for entities, datapoints and concepts)', () => {
  it('should create new translations for an entity that was updated in scope of current transaction', sinon.test(function (done) {
    const translationTarget: any = {
      _id: '_id',
      originId: 'originId',
      from: externalContext.version
    };

    const repoStub: any = {
      findTargetForTranslation: this.stub().callsArgWithAsync(1, null, translationTarget),
      create: _.noop,
      removeTranslation: _.noop,
      addTranslation: this.stub().callsArgWith(1),
      closeOneByQuery: this.spy()
    };

    const translationTargetQuery = 'FAKE QUERY (AND OF COURSE NOT VALID MONGO QUERY)';

    const entitiesPlugin: any = {
      dataType: constants.ENTITIES,
      transformStreamBeforeActionSegregation: this.stub().returnsArg(0),
      transformStreamBeforeChangesApplied: this.stub().returnsArg(0),
      enrichContext: this.stub().returnsArg(2),
      processTranslationBeforeUpdate: this.stub().returnsArg(0),
      makeQueryToFetchTranslationTarget: this.stub().returns(translationTargetQuery),
      makeTranslationTargetBasedOnItsClosedVersion: _.noop,
      repositoryFactory: {
        currentVersion: this.stub().returns(repoStub),
        latestVersion: this.stub().returns(repoStub)
      }
    };

    const originalReadTextFileByLineAsJsonStream = fileUtils.readTextFileByLineAsJsonStream.bind(fileUtils);
    this.stub(fileUtils, 'readTextFileByLineAsJsonStream', pathToFile => {
      return originalReadTextFileByLineAsJsonStream(pathToFile)
        .filter(obj => obj.metadata.action === 'create');
    });

    const loggerInfoStub = this.stub(logger, 'info');

    // ACT -------------------------------------------------------------------------------------------------------------

    createTranslationsUpdater(entitiesPlugin, externalContext, (error, context) => {
      expect(error).to.not.exist;
      expect(context).to.equal(externalContext);

      sinon.assert.calledWith(entitiesPlugin.repositoryFactory.latestVersion, externalContext.datasetId, externalContext.version);

      sinon.assert.callCount(entitiesPlugin.enrichContext, 5);
      sinon.assert.callCount(entitiesPlugin.processTranslationBeforeUpdate, 5);
      sinon.assert.callCount(entitiesPlugin.makeQueryToFetchTranslationTarget, 5);
      sinon.assert.callCount(repoStub.addTranslation, 5);

      translations.created.forEach(translation => {
        sinon.assert.calledWith(repoStub.addTranslation, {id: translationTarget._id, language: 'nl-nl', translation});
      });

      sinon.assert.calledWith(repoStub.findTargetForTranslation, translationTargetQuery);

      expect(entitiesPlugin.transformStreamBeforeActionSegregation.calledTwice).to.equal(true,
        `This transformer should be called once for removal stream,
         and once for both: creation and update streams`
      );

      expect(entitiesPlugin.transformStreamBeforeChangesApplied.calledThrice).to.equal(true,
        'This transformer should be called 3 times: for removal, update and creation'
      );

      sinon.assert.callOrder(
        entitiesPlugin.transformStreamBeforeActionSegregation,
        entitiesPlugin.transformStreamBeforeChangesApplied,
        entitiesPlugin.enrichContext,
        entitiesPlugin.makeQueryToFetchTranslationTarget,
        repoStub.findTargetForTranslation,
        repoStub.addTranslation
      );
      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Start translations updating process for:`, entitiesPlugin.dataType);

      sinon.assert.notCalled(repoStub.closeOneByQuery);
      done();
    });
  }));

  it('should create new translations for an entity that was not changed in scope of the current transaction (only translations for it were updated)', sinon.test(function (done) {
    const translationTarget: any = {
      _id: '_id',
      originId: 'originId',
      from: 42424242
    };

    const closeOneByQueryStub = this.stub();

    const repoStub: any = {
      findTargetForTranslation: this.stub().callsArgWithAsync(1, null, translationTarget),
      create: this.stub().callsArgAsync(1),
      removeTranslation: _.noop,
      addTranslation: this.stub().callsArgAsync(1),
      closeOneByQuery: (query, callback) => {
        closeOneByQueryStub(query);
        callback(null, {});
      },
    };

    const translationTargetQuery = 'FAKE QUERY (AND OF COURSE NOT VALID MONGO QUERY)';

    const entitiesPlugin: any = {
      dataType: constants.ENTITIES,
      transformStreamBeforeActionSegregation: this.stub().returnsArg(0),
      transformStreamBeforeChangesApplied: this.stub().returnsArg(0),
      enrichContext: this.stub().returnsArg(2),
      processTranslationBeforeUpdate: this.stub().returnsArg(0),
      makeQueryToFetchTranslationTarget: this.stub().returns(translationTargetQuery),
      makeTranslationTargetBasedOnItsClosedVersion: this.stub().returnsArg(0),
      repositoryFactory: {
        currentVersion: this.stub().returns(repoStub),
        latestVersion: this.stub().returns(repoStub)
      }
    };

    const originalReadTextFileByLineAsJsonStream = fileUtils.readTextFileByLineAsJsonStream.bind(fileUtils);

    this.stub(fileUtils, 'readTextFileByLineAsJsonStream', pathToFile => {
      return originalReadTextFileByLineAsJsonStream(pathToFile)
        .filter(obj => obj.metadata.action === 'create');
    });

    const loggerInfoStub = this.stub(logger, 'info');

    // ACT -------------------------------------------------------------------------------------------------------------

    createTranslationsUpdater(entitiesPlugin, externalContext, (error, context: any) => {
      expect(error).to.not.exist;
      expect(context).to.equal(externalContext);

      sinon.assert.calledWith(entitiesPlugin.repositoryFactory.latestVersion, externalContext.datasetId, externalContext.version);
      sinon.assert.callCount(entitiesPlugin.enrichContext, 5);
      sinon.assert.callCount(entitiesPlugin.processTranslationBeforeUpdate, 5);
      sinon.assert.callCount(entitiesPlugin.makeQueryToFetchTranslationTarget, 5);
      sinon.assert.callCount(closeOneByQueryStub, 5);

      translations.created.forEach(translation => {
        sinon.assert.calledWith(repoStub.create, {languages: {'nl-nl': translation}});
      });

      sinon.assert.calledWith(repoStub.findTargetForTranslation, translationTargetQuery);

      sinon.assert.callOrder(
        entitiesPlugin.transformStreamBeforeActionSegregation,
        entitiesPlugin.transformStreamBeforeChangesApplied,
        entitiesPlugin.enrichContext,
        entitiesPlugin.makeQueryToFetchTranslationTarget,
        repoStub.findTargetForTranslation,
        entitiesPlugin.makeTranslationTargetBasedOnItsClosedVersion,
        repoStub.create
      );

      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Start translations updating process for:`, entitiesPlugin.dataType);

      done();
    });
  }));

  it('stops translations processing if error occurred while creating new version of translations target with translations added', sinon.test(function (done) {
    const translationTarget: any = {
      _id: '_id',
      originId: 'originId',
      from: 42424242
    };

    const expectedError = 'Boo!';

    const repoStub: any = {
      findTargetForTranslation: this.stub().callsArgWithAsync(1, null, translationTarget),
      create: _.noop,
      removeTranslation: _.noop,
      addTranslation: _.noop,
      closeOneByQuery: this.stub().callsArgWith(1, expectedError),
    };

    const entitiesPlugin: any = {
      dataType: constants.ENTITIES,
      makeQueryToFetchTranslationTarget: this.stub().returns('FAKE QUERY (AND OF COURSE NOT VALID MONGO QUERY)'),
      makeTranslationTargetBasedOnItsClosedVersion: this.stub().returnsArg(0),
      repositoryFactory: {
        currentVersion: this.stub().returns(repoStub),
        latestVersion: this.stub().returns(repoStub)
      }
    };

    const originalReadTextFileByLineAsJsonStream = fileUtils.readTextFileByLineAsJsonStream.bind(fileUtils);
    this.stub(fileUtils, 'readTextFileByLineAsJsonStream', pathToFile => {
      return originalReadTextFileByLineAsJsonStream(pathToFile)
        .filter(obj => obj.metadata.action === 'create');
    });

    const loggerInfoStub = this.stub(logger, 'info');

    createTranslationsUpdater(entitiesPlugin, externalContext, (error: any, context: any) => {
      expect(error).to.deep.equal([expectedError]);
      expect(context).to.equal(externalContext);
      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Start translations updating process for:`, entitiesPlugin.dataType);
      done();
    });
  }));

  it('stops translations processing translation target was not found, simply because we cannot translate NON EXISTENT THING', sinon.test(function (done) {
    const translationTarget: any = {
      _id: '_id',
      originId: 'originId',
      from: 42424242
    };

    const repoStub: any = {
      findTargetForTranslation: this.stub().callsArgWithAsync(1, null, translationTarget),
      create: this.spy(),
      removeTranslation: this.spy(),
      addTranslation: this.spy(),
      closeOneByQuery: this.stub().callsArgWith(1, null, null),
    };

    const entitiesPlugin: any = {
      dataType: constants.ENTITIES,
      makeQueryToFetchTranslationTarget: this.stub().returns('FAKE QUERY (AND OF COURSE NOT VALID MONGO QUERY)'),
      makeTranslationTargetBasedOnItsClosedVersion: this.stub().returnsArg(0),
      repositoryFactory: {
        currentVersion: this.stub().returns(repoStub),
        latestVersion: this.stub().returns(repoStub)
      }
    };

    const originalReadTextFileByLineAsJsonStream = fileUtils.readTextFileByLineAsJsonStream.bind(fileUtils);
    this.stub(fileUtils, 'readTextFileByLineAsJsonStream', pathToFile => {
      return originalReadTextFileByLineAsJsonStream(pathToFile)
        .filter(obj => obj.metadata.action === 'create');
    });

    const loggerInfoStub = this.stub(logger, 'info');
    const loggerWarnStub = this.stub(logger, 'warn');

    createTranslationsUpdater(entitiesPlugin, externalContext, (error: any, context: any) => {
      expect(error).to.not.exist;
      expect(context).to.equal(externalContext);

      sinon.assert.notCalled(repoStub.create);
      sinon.assert.notCalled(repoStub.removeTranslation);
      sinon.assert.notCalled(repoStub.addTranslation);

      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Start translations updating process for:`, entitiesPlugin.dataType);

      sinon.assert.callCount(loggerWarnStub, 5);
      sinon.assert.calledWithExactly(loggerWarnStub,'Translation target was not closed - VERY suspicious at this point of translations update flow!');
      done();
    });
  }));

  it('stops translations processing when error occurred during translation target search', sinon.test(function (done) {
    const expectedError = 'Boo!';

    const repoStub: any = {
      findTargetForTranslation: this.stub().callsArgWithAsync(1, expectedError),
      create: this.spy(),
      removeTranslation: this.spy(),
      addTranslation: this.spy(),
      closeOneByQuery: this.spy(),
    };

    const entitiesPlugin: any = {
      dataType: constants.ENTITIES,
      makeQueryToFetchTranslationTarget: this.stub().returns('FAKE QUERY (AND OF COURSE NOT VALID MONGO QUERY)'),
      makeTranslationTargetBasedOnItsClosedVersion: _.noop,
      repositoryFactory: {
        currentVersion: this.stub().returns(repoStub),
        latestVersion: this.stub().returns(repoStub)
      }
    };

    const originalReadTextFileByLineAsJsonStream = fileUtils.readTextFileByLineAsJsonStream.bind(fileUtils);
    this.stub(fileUtils, 'readTextFileByLineAsJsonStream', pathToFile => {
      return originalReadTextFileByLineAsJsonStream(pathToFile)
        .filter(obj => obj.metadata.action === 'create');
    });

    const loggerInfoStub = this.stub(logger, 'info');

    createTranslationsUpdater(entitiesPlugin, externalContext, (error: any, context: any) => {
      expect(error).to.deep.equal([expectedError]);
      expect(context).to.equal(externalContext);

      sinon.assert.notCalled(repoStub.create);
      sinon.assert.notCalled(repoStub.removeTranslation);
      sinon.assert.notCalled(repoStub.addTranslation);
      sinon.assert.notCalled(repoStub.closeOneByQuery);
      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Start translations updating process for:`, entitiesPlugin.dataType);

      done();
    });
  }));

  it('stops translations processing if it is impossible to find a translation target', sinon.test(function (done) {
    const repoStub: any = {
      findTargetForTranslation: this.stub().callsArgWithAsync(1, null, null),
      create: this.spy(),
      removeTranslation: this.spy(),
      addTranslation: this.spy(),
      closeOneByQuery: this.spy(),
    };

    const entitiesPlugin: any = {
      dataType: constants.ENTITIES,
      makeQueryToFetchTranslationTarget: this.stub().returns('FAKE QUERY (AND OF COURSE NOT VALID MONGO QUERY)'),
      makeTranslationTargetBasedOnItsClosedVersion: _.noop,
      repositoryFactory: {
        currentVersion: this.stub().returns(repoStub),
        latestVersion: this.stub().returns(repoStub)
      }
    };

    const originalReadTextFileByLineAsJsonStream = fileUtils.readTextFileByLineAsJsonStream.bind(fileUtils);
    this.stub(fileUtils, 'readTextFileByLineAsJsonStream', pathToFile => {
      return originalReadTextFileByLineAsJsonStream(pathToFile)
        .filter(obj => obj.metadata.action === 'create');
    });

    const loggerInfoStub = this.stub(logger, 'info');

    createTranslationsUpdater(entitiesPlugin, externalContext, (error: any, context: any) => {
      expect(error).to.not.exist;
      expect(context).to.equal(externalContext);

      sinon.assert.notCalled(repoStub.create);
      sinon.assert.notCalled(repoStub.removeTranslation);
      sinon.assert.notCalled(repoStub.addTranslation);
      sinon.assert.notCalled(repoStub.closeOneByQuery);
      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Start translations updating process for:`, entitiesPlugin.dataType);

      done();
    });
  }));

  it('should remove translations for an entity that was removed in scope of current transaction', sinon.test(function (done) {
    const translationTarget: any = {
      _id: '_id',
      originId: 'originId',
      to: externalContext.version
    };

    const repoStub: any = {
      findTargetForTranslation: this.stub().callsArgWithAsync(1, null, translationTarget),
      create: this.spy(),
      removeTranslation: this.stub().callsArgWithAsync(1),
      addTranslation: this.stub().callsArgWith(1),
      closeOneByQuery: this.spy()
    };

    const translationTargetQuery = 'FAKE QUERY (AND OF COURSE NOT VALID MONGO QUERY)';

    const entitiesPlugin: any = {
      dataType: constants.ENTITIES,
      processTranslationBeforeUpdate: this.stub().returnsArg(0),
      enrichContext: this.stub().returnsArg(2),
      makeQueryToFetchTranslationTarget: this.stub().returns(translationTargetQuery),
      makeTranslationTargetBasedOnItsClosedVersion: this.spy(),
      repositoryFactory: {
        currentVersion: this.stub().returns(repoStub),
        latestVersion: this.stub().returns(repoStub)
      }
    };

    const originalReadTextFileByLineAsJsonStream = fileUtils.readTextFileByLineAsJsonStream.bind(fileUtils);
    this.stub(fileUtils, 'readTextFileByLineAsJsonStream', pathToFile => {
      return originalReadTextFileByLineAsJsonStream(pathToFile)
        .filter(obj => obj.metadata.action === 'remove');
    });

    const loggerInfoStub = this.stub(logger, 'info');

    // ACT -------------------------------------------------------------------------------------------------------------

    createTranslationsUpdater(entitiesPlugin, externalContext, (error, context) => {
      expect(error).to.not.exist;
      expect(context).to.equal(externalContext);

      sinon.assert.calledOnce(entitiesPlugin.enrichContext);
      sinon.assert.calledOnce(entitiesPlugin.makeQueryToFetchTranslationTarget);
      sinon.assert.calledOnce(repoStub.removeTranslation);

      sinon.assert.calledWith(entitiesPlugin.repositoryFactory.latestVersion, externalContext.datasetId, externalContext.version);
      sinon.assert.calledWith(repoStub.removeTranslation, {originId: translationTarget.originId, language: 'nl-nl'});
      sinon.assert.calledWith(repoStub.findTargetForTranslation, translationTargetQuery);

      sinon.assert.calledWith(entitiesPlugin.enrichContext, {
        concept: "company",
        entitySets: [],
        fields: ["company", "name", "country", "region"],
        path: "ddf--entities--company.csv",
        primaryKey: ["company"],
        type: "entities"
      });

      sinon.assert.callOrder(
        entitiesPlugin.enrichContext,
        entitiesPlugin.makeQueryToFetchTranslationTarget,
        repoStub.findTargetForTranslation,
        repoStub.removeTranslation
      );

      sinon.assert.notCalled(entitiesPlugin.processTranslationBeforeUpdate);
      sinon.assert.notCalled(repoStub.closeOneByQuery);
      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Start translations updating process for:`, entitiesPlugin.dataType);
      done();
    });
  }));

  it('should remove translations for an entity that was removed not in scope of the current transaction', sinon.test(function (done) {
    const translationTarget: any = {
      _id: '_id',
      originId: 'originId',
      to: 42424242
    };

    const closedTranslationTarget = {
      languages: {
        'nl-nl': {},
        'bla-bla': {}
      }
    };

    const repoStub: any = {
      findTargetForTranslation: this.stub().callsArgWithAsync(1, null, translationTarget),
      create: this.stub().callsArgAsync(1),
      removeTranslation: this.spy(),
      addTranslation: this.stub().callsArgWith(1),
      closeOneByQuery: this.stub().callsArgWithAsync(1, null, closedTranslationTarget)
    };

    const translationTargetQuery = 'FAKE QUERY (AND OF COURSE NOT VALID MONGO QUERY)';

    const entitiesPlugin: any = {
      dataType: constants.ENTITIES,
      processTranslationBeforeUpdate: this.stub().returnsArg(0),
      enrichContext: this.stub().returnsArg(2),
      makeQueryToFetchTranslationTarget: this.stub().returns(translationTargetQuery),
      makeTranslationTargetBasedOnItsClosedVersion: this.stub().returnsArg(0),
      repositoryFactory: {
        currentVersion: this.stub().returns(repoStub),
        latestVersion: this.stub().returns(repoStub)
      }
    };

    const originalReadTextFileByLineAsJsonStream = fileUtils.readTextFileByLineAsJsonStream.bind(fileUtils);
    this.stub(fileUtils, 'readTextFileByLineAsJsonStream', pathToFile => {
      return originalReadTextFileByLineAsJsonStream(pathToFile)
        .filter(obj => obj.metadata.action === 'remove');
    });

    const loggerInfoStub = this.stub(logger, 'info');

    // ACT -------------------------------------------------------------------------------------------------------------

    createTranslationsUpdater(entitiesPlugin, externalContext, (error, context) => {
      expect(error).to.not.exist;
      expect(context).to.equal(externalContext);

      sinon.assert.calledOnce(entitiesPlugin.enrichContext);
      sinon.assert.calledOnce(entitiesPlugin.makeQueryToFetchTranslationTarget);

      sinon.assert.calledWith(entitiesPlugin.repositoryFactory.latestVersion, externalContext.datasetId, externalContext.version);
      sinon.assert.calledWith(repoStub.findTargetForTranslation, translationTargetQuery);
      sinon.assert.calledWith(repoStub.create, _.omit(closedTranslationTarget, 'languages.nl-nl'));

      sinon.assert.calledWith(entitiesPlugin.enrichContext, {
        concept: "company",
        entitySets: [],
        fields: ["company", "name", "country", "region"],
        path: "ddf--entities--company.csv",
        primaryKey: ["company"],
        type: "entities"
      });

      sinon.assert.callOrder(
        entitiesPlugin.enrichContext,
        entitiesPlugin.makeQueryToFetchTranslationTarget,
        repoStub.findTargetForTranslation,
        repoStub.closeOneByQuery,
        repoStub.create
      );

      sinon.assert.notCalled(entitiesPlugin.processTranslationBeforeUpdate);
      sinon.assert.notCalled(repoStub.removeTranslation);
      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Start translations updating process for:`, entitiesPlugin.dataType);
      done();
    });
  }));

  it('should not remove translations from target when error occurred during target searching', sinon.test(function (done) {
    const translationTarget: any = {
      _id: '_id',
      originId: 'originId',
      to: 42424242
    };

    const expectedError = 'Boo!';
    const repoStub: any = {
      findTargetForTranslation: this.stub().callsArgWithAsync(1, null, translationTarget),
      create: this.spy(),
      removeTranslation: this.spy(),
      addTranslation: this.spy(),
      closeOneByQuery: this.stub().callsArgWithAsync(1, expectedError)
    };

    const translationTargetQuery = 'FAKE QUERY (AND OF COURSE NOT VALID MONGO QUERY)';

    const entitiesPlugin: any = {
      dataType: constants.ENTITIES,
      processTranslationBeforeUpdate: this.stub().returnsArg(0),
      enrichContext: this.stub().returnsArg(2),
      makeQueryToFetchTranslationTarget: this.stub().returns(translationTargetQuery),
      makeTranslationTargetBasedOnItsClosedVersion: this.spy(),
      repositoryFactory: {
        currentVersion: this.stub().returns(repoStub),
        latestVersion: this.stub().returns(repoStub)
      }
    };

    const originalReadTextFileByLineAsJsonStream = fileUtils.readTextFileByLineAsJsonStream.bind(fileUtils);
    this.stub(fileUtils, 'readTextFileByLineAsJsonStream', pathToFile => {
      return originalReadTextFileByLineAsJsonStream(pathToFile)
        .filter(obj => obj.metadata.action === 'remove');
    });

    const loggerInfoStub = this.stub(logger, 'info');

    // ACT -------------------------------------------------------------------------------------------------------------

    createTranslationsUpdater(entitiesPlugin, externalContext, (error, context) => {
      expect(error).to.deep.equal([expectedError]);
      expect(context).to.equal(externalContext);

      sinon.assert.calledWith(repoStub.closeOneByQuery, {originId: translationTarget.originId});
      sinon.assert.calledWith(repoStub.findTargetForTranslation, translationTargetQuery);

      sinon.assert.notCalled(repoStub.removeTranslation);
      sinon.assert.notCalled(repoStub.create);
      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Start translations updating process for:`, entitiesPlugin.dataType);
      done();
    });
  }));

  it('should stops removing translation if translation target was not found', sinon.test(function (done) {
    const translationTarget: any = {
      _id: '_id',
      originId: 'originId',
      to: 42424242
    };

    const repoStub: any = {
      findTargetForTranslation: this.stub().callsArgWithAsync(1, null, translationTarget),
      create: this.spy(),
      removeTranslation: this.spy(),
      addTranslation: this.spy(),
      closeOneByQuery: this.stub().callsArgWithAsync(1)
    };

    const translationTargetQuery = 'FAKE QUERY (AND OF COURSE NOT VALID MONGO QUERY)';

    const entitiesPlugin: any = {
      dataType: constants.ENTITIES,
      processTranslationBeforeUpdate: this.stub().returnsArg(0),
      enrichContext: this.stub().returnsArg(2),
      makeQueryToFetchTranslationTarget: this.stub().returns(translationTargetQuery),
      makeTranslationTargetBasedOnItsClosedVersion: this.spy(),
      repositoryFactory: {
        currentVersion: this.stub().returns(repoStub),
        latestVersion: this.stub().returns(repoStub)
      }
    };

    const originalReadTextFileByLineAsJsonStream = fileUtils.readTextFileByLineAsJsonStream.bind(fileUtils);
    this.stub(fileUtils, 'readTextFileByLineAsJsonStream', pathToFile => {
      return originalReadTextFileByLineAsJsonStream(pathToFile)
        .filter(obj => obj.metadata.action === 'remove');
    });

    const loggerInfoStub = this.stub(logger, 'info');
    const loggerWarnStub = this.stub(logger, 'warn');

    // ACT -------------------------------------------------------------------------------------------------------------
    createTranslationsUpdater(entitiesPlugin, externalContext, (error, context) => {
      expect(error).to.not.exist;
      expect(context).to.equal(externalContext);

      sinon.assert.calledWith(repoStub.closeOneByQuery, {originId: translationTarget.originId});
      sinon.assert.calledWith(repoStub.findTargetForTranslation, translationTargetQuery);

      sinon.assert.notCalled(repoStub.removeTranslation);
      sinon.assert.notCalled(repoStub.create);

      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Start translations updating process for:`, entitiesPlugin.dataType);

      sinon.assert.calledOnce(loggerWarnStub);
      sinon.assert.calledWithExactly(loggerWarnStub,'Translation target was not closed - VERY suspicious at this point of translations update flow!');
      done();
    });
  }));
});

describe('Translations processing: handle "change" events', () => {
  it('should update existing translations on targets', sinon.test(function (done) {
    const translationTarget: any = {
      _id: '_id',
      originId: 'originId',
      from: externalContext.version,
      languages: {
        'nl-nl': {
          'bla': 'hm',
          'yahoo': 'was'
        }
      }
    };

    const repoStub: any = {
      findTargetForTranslation: this.stub().callsArgWithAsync(1, null, translationTarget),
      create: _.noop,
      removeTranslation: _.noop,
      addTranslation: this.stub().callsArgWith(1),
      closeOneByQuery: this.spy()
    };

    const translationTargetQuery = 'FAKE QUERY (AND OF COURSE NOT VALID MONGO QUERY)';

    const datapointsPlugin: any = {
      dataType: constants.DATAPOINTS,
      transformStreamBeforeActionSegregation: this.stub().returnsArg(0),
      transformStreamBeforeChangesApplied: this.stub().returnsArg(0),
      enrichContext: this.stub().returnsArg(2),
      makeQueryToFetchTranslationTarget: this.stub().returns(translationTargetQuery),
      makeTranslationTargetBasedOnItsClosedVersion: _.noop,
      repositoryFactory: {
        currentVersion: this.stub().returns(repoStub),
        latestVersion: this.stub().returns(repoStub)
      }
    };

    const originalReadTextFileByLineAsJsonStream = fileUtils.readTextFileByLineAsJsonStream.bind(fileUtils);
    this.stub(fileUtils, 'readTextFileByLineAsJsonStream', pathToFile => {
      return originalReadTextFileByLineAsJsonStream(pathToFile)
        .filter(obj => obj.metadata.action === 'change');
    });

    const loggerInfoStub = this.stub(logger, 'info');

    // ACT -------------------------------------------------------------------------------------------------------------

    createTranslationsUpdater(datapointsPlugin, externalContext, (error, context) => {
      expect(error).to.not.exist;
      expect(context).to.equal(externalContext);

      sinon.assert.calledWith(datapointsPlugin.repositoryFactory.latestVersion, externalContext.datasetId, externalContext.version);

      sinon.assert.calledOnce(datapointsPlugin.enrichContext);
      sinon.assert.calledOnce(datapointsPlugin.makeQueryToFetchTranslationTarget);
      sinon.assert.calledOnce(repoStub.addTranslation);

      sinon.assert.calledWith(repoStub.findTargetForTranslation, translationTargetQuery);

      const expectedTranslation = _.extend({yahoo: 'was'}, translations.changed[0]);
      sinon.assert.calledWith(repoStub.addTranslation, {id: translationTarget._id, language: 'nl-nl', translation: expectedTranslation});

      sinon.assert.callOrder(
        datapointsPlugin.transformStreamBeforeActionSegregation,
        datapointsPlugin.transformStreamBeforeChangesApplied,
        datapointsPlugin.enrichContext,
        datapointsPlugin.makeQueryToFetchTranslationTarget,
        repoStub.findTargetForTranslation,
        repoStub.addTranslation
      );

      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Start translations updating process for:`, datapointsPlugin.dataType);

      sinon.assert.notCalled(repoStub.closeOneByQuery);
      done();
    });
  }));
});
