import '../../../../ws.repository';

import * as sinon from 'sinon';
import { expect } from 'chai';

import { constants } from '../../../../ws.utils/constants';
import * as UpdateTranslationsFlow from '../../../../ws.import/incremental/translations/update-translations-flow';
import { updateEntitiesTranslation } from '../../../../ws.import/incremental/translations/update-entity-translations';
import * as entitiesUtils from '../../../../ws.import/utils/entities.utils';
import * as ddfMappers from '../../../../ws.import/utils/ddf-mappers';
import { EntitiesRepositoryFactory } from '../../../../ws.repository/ddf/entities/entities.repository';
import { ChangesDescriptor } from '../../../../ws.import/utils/changes-descriptor';

const externalContext = {
  transaction: {
    _id: 'txId',
    createdAt: 42424242
  },
  dataset: {
    _id: 'datasetId'
  },
  pathToLangDiff: 'path/to/lang/diff',
  concepts: {
    pop: {
      gid: 'pop'
    }
  },
  previousConcepts: {
    gini: {
      gid: 'gini'
    }
  }
};

describe('Entities Translations Update Plugin', () => {
  it('creates a proper context for the plugin', sinon.test(function (done) {
    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater', (plugin, externalContextFrozen, callback) => {
      expect(Object.isFrozen(externalContextFrozen)).to.equal(true, 'context should be frozen');

      expect(externalContextFrozen.datasetId).to.equal(externalContext.dataset._id);
      expect(externalContextFrozen.version).to.equal(externalContext.transaction.createdAt);
      expect(externalContextFrozen.pathToLangDiff).to.equal(externalContext.pathToLangDiff);
      expect(externalContextFrozen.concepts).to.equal(externalContext.concepts);
      expect(externalContextFrozen.previousConcepts).to.equal(externalContext.previousConcepts);

      callback();
    });

    updateEntitiesTranslation(externalContext, () => {
      done();
    });
  }));

  it('creates a proper plugin', sinon.test(function (done) {
    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater', (plugin, externalContextFrozen, callback) => {
      expect(plugin.dataType).to.equal(constants.ENTITIES);
      expect(plugin.repositoryFactory).to.equal(EntitiesRepositoryFactory);
      expect(plugin.enrichContext).to.be.instanceOf(Function);
      expect(plugin.makeTranslationTargetBasedOnItsClosedVersion).to.be.instanceOf(Function);
      expect(plugin.processTranslationBeforeUpdate).to.be.instanceOf(Function);
      expect(plugin.makeQueryToFetchTranslationTarget).to.be.instanceOf(Function);

      callback();
    });

    updateEntitiesTranslation(externalContext, () => {
      done();
    });
  }));

  it('makes query to fetch a translation target', sinon.test(function (done) {
    const changesDescriptor = {
      gid: 'gid'
    };

    const context = {
      entityDomain: {
        originId: 'entityDomainOriginId'
      },
      entitySetsOriginIds: ['entitySetOriginId'],
      filename: 'path/to/translations-file'
    };

    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater', (plugin, externalContextFrozen, callback) => {
      const query = plugin.makeQueryToFetchTranslationTarget(changesDescriptor, context);

      expect(query).to.deep.equal({
        domain: context.entityDomain.originId,
        sets: context.entitySetsOriginIds,
        gid: changesDescriptor.gid,
        sources: context.filename
      });

      callback();
    });

    updateEntitiesTranslation(externalContext, () => {
      done();
    });
  }));

  it('enriches a context', sinon.test(function (done) {
    const contextFake = {
      foo: 'bar'
    };

    const setsAndDomainFake = {
      foo: 'bar'
    };

    const changesDescriptor = new ChangesDescriptor({
      object: {
        'data-origin': {
          foo: 'hello',
          baz: 'baz'
        },
        'data-update': {
          foo: 'hello2',
          bar: 'bar'
        },
      },
      metadata: {
        action: 'update',
        removedColumns: ['baz']
      }
    });

    const expectedEntity = {
      foo: 'hello2',
      bar: 'bar'
    };

    const resourceFake = {
      primaryKey: []
    };

    const getSetsAndDomainStub = this.stub(entitiesUtils, 'getSetsAndDomain').returns(setsAndDomainFake);

    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater', (plugin, externalContextFrozen, callback) => {
      const enrichment = plugin.enrichContext(resourceFake, changesDescriptor, contextFake);

      expect(enrichment).to.equal(setsAndDomainFake);

      sinon.assert.calledOnce(getSetsAndDomainStub);
      sinon.assert.calledWith(getSetsAndDomainStub, resourceFake, contextFake, expectedEntity);

      callback();
    });

    updateEntitiesTranslation(externalContext, () => {
      done();
    });
  }));

  it('makes a translation based on its closed version', sinon.test(function (done) {
    const contextFake = {
      foo: 'bar'
    };

    const closedTarget = {
      properties: {
        bla: 'yahooo!'
      }
    };

    const newTargetFake = {
      foo: 'bar'
    };

    const makeEntityBasedOnItsClosedVersionStub = this.stub(entitiesUtils, 'makeEntityBasedOnItsClosedVersion').returns(newTargetFake);

    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater', (plugin, externalContextFrozen, callback) => {
      const actualNewTarget = plugin.makeTranslationTargetBasedOnItsClosedVersion(closedTarget, contextFake);

      expect(actualNewTarget).to.equal(newTargetFake);
      sinon.assert.calledOnce(makeEntityBasedOnItsClosedVersionStub);
      sinon.assert.calledWith(makeEntityBasedOnItsClosedVersionStub, closedTarget.properties, closedTarget, contextFake);

      callback();
    });

    updateEntitiesTranslation(externalContext, () => {
      done();
    });
  }));

  it('processes translation before update', sinon.test(function (done) {
    const context = {
      concepts: {
        gini: {}
      }
    };

    const translation = {
      bla: 'yahooo!'
    };

    const translationTransformed = {
      bla: 'yahooo!trans'
    };

    const transformEntityPropertiesStub = this.stub(ddfMappers, 'transformEntityProperties').returns(translationTransformed);

    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater', (plugin, externalContextFrozen, callback) => {
      const actualTranslationTransformed = plugin.processTranslationBeforeUpdate(translation, context);

      expect(actualTranslationTransformed).to.equal(translationTransformed);
      sinon.assert.calledOnce(transformEntityPropertiesStub);
      sinon.assert.calledWith(transformEntityPropertiesStub, translation, context.concepts);

      callback();
    });

    updateEntitiesTranslation(externalContext, () => {
      done();
    });
  }));
});
