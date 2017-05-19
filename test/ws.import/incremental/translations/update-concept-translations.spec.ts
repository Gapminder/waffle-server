import '../../../../ws.repository';

import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import { expect } from 'chai';

import { constants } from '../../../../ws.utils/constants';
import * as UpdateTranslationsFlow from '../../../../ws.import/incremental/translations/update-translations-flow';
import { updateConceptsTranslations } from '../../../../ws.import/incremental/translations/update-concept-translations';
import * as ddfMappers from '../../../../ws.import/utils/ddf-mappers';
import { ConceptsRepositoryFactory } from '../../../../ws.repository/ddf/concepts/concepts.repository';

const sandbox = sinonTest.configureTest(sinon);

const externalContext = {
  transaction: {
    _id: 'txId',
    createdAt: 42424242
  },
  dataset: {
    _id: 'datasetId'
  },
  pathToLangDiff: 'path/to/lang/diff'
};

describe('Concepts Translations Update Plugin', () => {
  it('creates a proper context for the plugin', sandbox(function (done: Function) {
    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater', (plugin, externalContextFrozen, callback) => {
      expect(Object.isFrozen(externalContextFrozen)).to.equal(true, 'context should be frozen');

      expect(externalContextFrozen.transaction).to.equal(externalContext.transaction);
      expect(externalContextFrozen.datasetId).to.equal(externalContext.dataset._id);
      expect(externalContextFrozen.version).to.equal(externalContext.transaction.createdAt);
      expect(externalContextFrozen.pathToLangDiff).to.equal(externalContext.pathToLangDiff);

      callback();
    });

    updateConceptsTranslations(externalContext, () => {
      done();
    });
  }));

  it('creates a proper plugin', sandbox(function (done: Function) {
    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater', (plugin, externalContextFrozen, callback) => {
      expect(plugin.dataType).to.equal(constants.CONCEPTS);
      expect(plugin.repositoryFactory).to.equal(ConceptsRepositoryFactory);
      expect(plugin.makeTranslationTargetBasedOnItsClosedVersion).to.be.instanceOf(Function);
      expect(plugin.processTranslationBeforeUpdate).to.be.instanceOf(Function);
      expect(plugin.makeQueryToFetchTranslationTarget).to.be.instanceOf(Function);

      callback();
    });

    updateConceptsTranslations(externalContext, () => {
      done();
    });
  }));

  it('makes a query to fetch translation target', sandbox(function (done: Function) {
    const changesDescriptor = {
      gid: 'gid'
    };

    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater', (plugin, externalContextFrozen, callback) => {
      const query = plugin.makeQueryToFetchTranslationTarget(changesDescriptor, null);

      expect(query).to.deep.equal({gid: changesDescriptor.gid});
      callback();
    });

    updateConceptsTranslations(externalContext, () => {
      done();
    });
  }));

  it('processes translation before update', sandbox(function (done: Function) {
    const translationToProcess = {
      prop: 'value'
    };

    const transformConceptPropertiesStub = this.stub(ddfMappers, 'transformConceptProperties').returns(translationToProcess);

    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater', (plugin, externalContextFrozen, callback) => {
      const processedTranslation = plugin.processTranslationBeforeUpdate(translationToProcess);

      sinon.assert.calledOnce(transformConceptPropertiesStub);
      sinon.assert.calledWith(transformConceptPropertiesStub, translationToProcess);

      expect(processedTranslation).to.equal(translationToProcess);
      callback();
    });

    updateConceptsTranslations(externalContext, () => {
      done();
    });
  }));

  it('makes translation target based on its closed version', sandbox(function (done: Function) {
    const closedTarget = {
      originId: 'originId',
      domain: 'domain',
      languages: {
        'nl-nl': {
          bla: 'yahooo in nl-nl!'
        }
      },
      properties: {
        bla: 'yahooo!'
      }
    };

    const context = {
      foo: 'bar'
    };

    const mappedConceptsFake = {};

    const mapDdfConceptsToWsModelStub = this.stub(ddfMappers, 'mapDdfConceptsToWsModel').returns(mappedConceptsFake);

    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater', (plugin, externalContextFrozen, callback) => {
      const newTarget = plugin.makeTranslationTargetBasedOnItsClosedVersion(closedTarget, context);

      sinon.assert.calledOnce(mapDdfConceptsToWsModelStub);
      sinon.assert.calledWith(mapDdfConceptsToWsModelStub, closedTarget.properties, {
        domain: closedTarget.domain,
        languages: closedTarget.languages,
        originId: closedTarget.originId,
        foo: 'bar'
      });

      expect(newTarget).to.equal(mappedConceptsFake);
      callback();
    });

    updateConceptsTranslations(externalContext, () => {
      done();
    });
  }));
});
