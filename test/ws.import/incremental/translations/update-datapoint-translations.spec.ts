import '../../../../ws.repository';
import * as hi from 'highland';
import { ChangesDescriptor } from '../../../../ws.import/utils/changes-descriptor';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import { expect } from 'chai';
import { constants } from '../../../../ws.utils/constants';
import {logger} from '../../../../ws.config/log';
import * as datapointsUtils from '../../../../ws.import/utils/datapoints.utils';
import * as UpdateTranslationsFlow from '../../../../ws.import/incremental/translations/update-translations-flow';
import * as UpdateDatapointTranslations from '../../../../ws.import/incremental/translations/update-datapoint-translations';
import { DatapointsRepositoryFactory } from '../../../../ws.repository/ddf/data-points/data-points.repository';
import { TimeDimensionQuery } from '../../../../ws.import/utils/datapoints.utils';

const sandbox = sinonTest.configureTest(sinon);

const entities = {
  segregatedEntities: {
    byGid: {
      usa: {
        gid: 'usa'
      },
      uk: {
        gid: 'uk'
      }
    }
  },
  segregatedPreviousEntities: {
    byGid: {
      usa: {
        gid: 'usa'
      },
      ukr: {
        gid: 'ukr'
      }
    }
  }
};

const externalContext = {
  dataset: {
    _id: 'datasetId'
  },
  transaction: {
    createdAt: 42424242
  },
  version: 42424242,
  previousTransaction: {},
  pathToLangDiff: 'some/path/to/diff',
  concepts: {},
  previousConcepts: {}
};

describe('Datapoints Translations Update Plugin', () => {
  it('creates a proper context for the plugin', sandbox(function (done: Function) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(entities.segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(entities.segregatedPreviousEntities));

    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater').callsFake((plugin, externalContextFrozen, callback) => {
      expect(externalContextFrozen.datasetId).to.equal(externalContext.dataset._id);
      expect(externalContextFrozen.version).to.equal(externalContext.transaction.createdAt);
      expect(externalContextFrozen.dataset).to.equal(externalContext.dataset);
      expect(externalContextFrozen.transaction).to.equal(externalContext.transaction);
      expect(externalContextFrozen.previousTransaction).to.equal(externalContext.previousTransaction);
      expect(externalContextFrozen.pathToLangDiff).to.equal(externalContext.pathToLangDiff);
      expect(externalContextFrozen.concepts).to.equal(externalContext.concepts);
      expect(externalContextFrozen.previousConcepts).to.equal(externalContext.previousConcepts);

      expect(externalContextFrozen.segregatedEntities).to.deep.equal(entities.segregatedEntities);
      expect(externalContextFrozen.segregatedPreviousEntities).to.deep.equal(entities.segregatedPreviousEntities);
      callback();
    });

    UpdateDatapointTranslations.updateDatapointsTranslations(externalContext, () => {
      done();
    });
  }));

  it('creates a proper plugin', sandbox(function (done: Function) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(entities.segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(entities.segregatedPreviousEntities));

    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater').callsFake((plugin, externalContextFrozen, callback) => {
      expect(Object.isFrozen(externalContextFrozen)).to.be.equal(true, 'context should be frozen');

      expect(plugin.dataType).to.equal(constants.DATAPOINTS);
      expect(plugin.repositoryFactory).to.equal(DatapointsRepositoryFactory, 'repository factory should be of type DatapointsRepositoryFactory');
      expect(plugin.enrichContext).to.be.instanceof(Function);
      expect(plugin.makeTranslationTargetBasedOnItsClosedVersion).to.be.instanceof(Function);
      expect(plugin.makeQueryToFetchTranslationTarget).to.be.instanceof(Function);
      expect(plugin.transformStreamBeforeChangesApplied).to.be.instanceof(Function);
      expect(plugin.transformStreamBeforeActionSegregation).to.be.instanceof(Function);

      callback();
    });

    UpdateDatapointTranslations.updateDatapointsTranslations(externalContext, () => {
      done();
    });
  }));

  it('inferres measures and dimensions for context enrichment', sandbox(function (done: Function) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(entities.segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(entities.segregatedPreviousEntities));

    const measures = {
      population: {}
    };

    const dimensions = {
      country: {}
    };

    const fakeResource = {
      primaryKey: []
    };

    const getDimensionsAndMeasuresStub = this.stub(datapointsUtils, 'getDimensionsAndMeasures').returns({
      measures,
      dimensions
    });

    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater').callsFake((plugin, externalContextFrozen, callback) => {
      const enrichment = plugin.enrichContext(fakeResource, null, externalContext);

      expect(enrichment).to.deep.equal({measures, dimensions});
      sinon.assert.calledWith(getDimensionsAndMeasuresStub, fakeResource, externalContext);

      callback();
    });

    UpdateDatapointTranslations.updateDatapointsTranslations(externalContext, () => {
      done();
    });
  }));

  it('transforms stream before translation update actions are segregated: should produce removal ChangeDescriptors for each removed indicator column along with updated indicator values', sandbox(function (done: Function) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(entities.segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(entities.segregatedPreviousEntities));

    const datapointChangeGeneratedByDiff = {
      object: {
        gid: 'company',
        company: 'mic',
        'data-update': {company: 'mcrsft', anno: '1975', company_size: 'klein', population: 42},
        'data-origin': {company: 'mic', anno: '1975', company_size: 'klein', population: 43}
      },
      metadata: {
        file: {
          new: {
            path: 'ddf--datapoints--company_size--by--company--anno.csv',
            name: 'ddf--datapoints--company_size--by--company--anno',
            schema: {
              fields: [{name: 'company'}, {name: 'anno'}, {name: 'company_size'}, {name: 'population'}],
              primaryKey: ['company', 'anno']
            }
          },
          old: {
            path: 'ddf--datapoints--company_size--by--company--anno.csv',
            name: 'ddf--datapoints--company_size--by--company--anno',
            schema: {
              fields: [{name: 'company'}, {name: 'anno'}, {name: 'company_size'}, {name: 'population'}],
              primaryKey: ['company', 'anno']
            }
          }
        },
        action: 'change',
        removedColumns: ['population'],
        type: 'datapoints',
        lang: 'nl-nl',
        onlyColumnsRemoved: false
      }
    };

    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater').callsFake((plugin, externalContextFrozen, callback) => {

      const changes = hi([new ChangesDescriptor(datapointChangeGeneratedByDiff)]);
      plugin.transformStreamBeforeActionSegregation(changes).toArray((result: ChangesDescriptor[]) => {
        expect(result.length).to.equal(2);
        expect(result[0].action).to.equal(ChangesDescriptor.REMOVE_ACTION_NAME);
        expect(result[0].language).to.equal('nl-nl');
        expect(result[0].describes(constants.DATAPOINTS)).to.be.true;
        expect(result[0].oldResource).to.exist;
        expect(result[0].changes).to.deep.equal({company: 'mic', anno: '1975', population: 43});

        expect(result[1].action).to.equal('change');
        expect(result[1].language).to.equal('nl-nl');
        expect(result[1].describes(constants.DATAPOINTS)).to.be.true;
        expect(result[1].oldResource).to.exist;
        expect(result[1].currentResource).to.exist;
        expect(result[1].changes).to.deep.equal({
          company: 'mcrsft',
          anno: '1975',
          company_size: 'klein',
          population: 42
        });
        callback();
      });
    });

    UpdateDatapointTranslations.updateDatapointsTranslations(externalContext, () => {
      done();
    });
  }));

  it('transforms stream before translation update actions are segregated: should produce only removal ChangeDescriptors if the only change done is indicator column removal in datapoint row', sandbox(function (done: Function) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(entities.segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(entities.segregatedPreviousEntities));

    const datapointChangeGeneratedByDiff = {
      object: {
        gid: 'company',
        company: 'mic',
        'data-update': {company: 'mcrsft', anno: '1975', company_size: 'klein', population: 43},
        'data-origin': {company: 'mcrsft', anno: '1975', company_size: 'klein', population: 43}
      },
      metadata: {
        file: {
          new: {
            path: 'ddf--datapoints--company_size--by--company--anno.csv',
            name: 'ddf--datapoints--company_size--by--company--anno',
            schema: {
              fields: [{name: 'company'}, {name: 'anno'}, {name: 'company_size'}, {name: 'population'}],
              primaryKey: ['company', 'anno']
            }
          },
          old: {
            path: 'ddf--datapoints--company_size--by--company--anno.csv',
            name: 'ddf--datapoints--company_size--by--company--anno',
            schema: {
              fields: [{name: 'company'}, {name: 'anno'}, {name: 'company_size'}, {name: 'population'}],
              primaryKey: ['company', 'anno']
            }
          }
        },
        action: 'change',
        removedColumns: ['population'],
        type: 'datapoints',
        lang: 'nl-nl',
        onlyColumnsRemoved: true
      }
    };

    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater').callsFake((plugin, externalContextFrozen, callback) => {

      const changes = hi([new ChangesDescriptor(datapointChangeGeneratedByDiff)]);
      plugin.transformStreamBeforeActionSegregation(changes).toArray((result: ChangesDescriptor[]) => {
        expect(result.length).to.equal(1);
        expect(result[0].action).to.equal(ChangesDescriptor.REMOVE_ACTION_NAME);
        expect(result[0].language).to.equal('nl-nl');
        expect(result[0].describes(constants.DATAPOINTS)).to.be.true;
        expect(result[0].oldResource).to.exist;
        expect(result[0].changes).to.deep.equal({company: 'mcrsft', anno: '1975', population: 43});
        callback();
      });
    });

    UpdateDatapointTranslations.updateDatapointsTranslations(externalContext, () => {
      done();
    });
  }));

  it('transforms stream before translation update actions are segregated: if indicator given in removedColumns is not known and only columns were removed - no changes descriptors generated', sandbox(function (done: Function) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(entities.segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(entities.segregatedPreviousEntities));

    const datapointChangeGeneratedByDiff = {
      object: {
        gid: 'company',
        company: 'mic',
        'data-update': {company: 'mcrsft', anno: '1975', company_size: 'klein', population: 43},
        'data-origin': {company: 'mcrsft', anno: '1975', company_size: 'klein', population: 43}
      },
      metadata: {
        file: {
          new: {
            path: 'ddf--datapoints--company_size--by--company--anno.csv',
            name: 'ddf--datapoints--company_size--by--company--anno',
            schema: {
              fields: [{name: 'company'}, {name: 'anno'}, {name: 'company_size'}, {name: 'population'}],
              primaryKey: ['company', 'anno']
            }
          },
          old: {
            path: 'ddf--datapoints--company_size--by--company--anno.csv',
            name: 'ddf--datapoints--company_size--by--company--anno',
            schema: {
              fields: [{name: 'company'}, {name: 'anno'}, {name: 'company_size'}, {name: 'population'}],
              primaryKey: ['company', 'anno']
            }
          }
        },
        action: 'change',
        removedColumns: ['bla'],
        type: 'datapoints',
        lang: 'nl-nl',
        onlyColumnsRemoved: true
      }
    };

    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater').callsFake((plugin, externalContextFrozen, callback) => {

      const changes = hi([new ChangesDescriptor(datapointChangeGeneratedByDiff)]);
      plugin.transformStreamBeforeActionSegregation(changes).toArray((result: ChangesDescriptor[]) => {
        expect(result.length).to.equal(0);
        callback();
      });
    });

    UpdateDatapointTranslations.updateDatapointsTranslations(externalContext, () => {
      done();
    });
  }));

  it('transforms stream before translation update actions are segregated: if coming action is not UPDATE action - then just path changes descriptor through', sandbox(function (done: Function) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(entities.segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(entities.segregatedPreviousEntities));

    const datapointChangeGeneratedByDiff = {
      object: {
        company: 'mcrsft',
        anno: '1975',
        company_size: 'klein',
        population: 43
      },
      metadata: {
        file: {
          new: {
            path: 'ddf--datapoints--company_size--by--company--anno.csv',
            name: 'ddf--datapoints--company_size--by--company--anno',
            schema: {
              fields: [{name: 'company'}, {name: 'anno'}, {name: 'company_size'}, {name: 'population'}],
              primaryKey: ['company', 'anno']
            }
          },
          old: {
            path: 'ddf--datapoints--company_size--by--company--anno.csv',
            name: 'ddf--datapoints--company_size--by--company--anno',
            schema: {
              fields: [{name: 'company'}, {name: 'anno'}, {name: 'company_size'}, {name: 'population'}],
              primaryKey: ['company', 'anno']
            }
          }
        }, action: 'create', type: 'datapoints', lang: 'nl-nl', removedColumns: [], onlyColumnsRemoved: false
      }
    };

    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater').callsFake((plugin, externalContextFrozen, callback) => {

      const changesDescriptor = new ChangesDescriptor(datapointChangeGeneratedByDiff);
      const changes = hi([changesDescriptor]);
      plugin.transformStreamBeforeActionSegregation(changes).toArray((result: ChangesDescriptor[]) => {
        expect(result.length).to.equal(1);
        expect(result[0]).to.equal(changesDescriptor);
        callback();
      });
    });

    UpdateDatapointTranslations.updateDatapointsTranslations(externalContext, () => {
      done();
    });
  }));

  it('makes a new translation target based on its closed version', sandbox(function (done: Function) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(entities.segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(entities.segregatedPreviousEntities));

    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater').callsFake((plugin, externalContextFrozen, callback) => {
      const closedTarget = constants.MONGO_SPECIAL_FIELDS.reduce((result, field) => Object.assign(result, {[field]: 1}), {});

      expect(constants.MONGO_SPECIAL_FIELDS.every((field) => field in closedTarget)).to.equal(true);

      const newTarget = plugin.makeTranslationTargetBasedOnItsClosedVersion({}, externalContext);

      expect(newTarget.to).to.equal(constants.MAX_VERSION);
      expect(newTarget.from).to.equal(externalContext.version);
      expect(constants.MONGO_SPECIAL_FIELDS.some((field) => field in newTarget)).to.equal(false);

      callback();
    });

    UpdateDatapointTranslations.updateDatapointsTranslations(externalContext, () => {
      done();
    });
  }));

  it('makes a query to fetch translation target based on giving context and changes descriptor', sandbox(function (done: Function): void {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(entities.segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(entities.segregatedPreviousEntities));

    const changesDescriptor = new ChangesDescriptor({
      object: {
        company: 'mcrsft',
        anno: '1975',
        company_size: 'klein',
        population: 43
      }
    });

    const context = {
      indicator: {
        originId: 'originId1'
      },
      dimensions: [
        'time',
        'country'
      ]
    };

    const expectedDimensionsAsOriginIds = [
      'originId2'
    ];
    const expectedTimeDimension: TimeDimensionQuery = {
      'time.conceptGid': 'anno',
      'time.millis': 157759200000,
      'time.timeType': 'YEAR_TYPE'
    };
    const expectedDimensions = {dimensionsEntityOriginIds: expectedDimensionsAsOriginIds, timeDimension: expectedTimeDimension};
    const getDimensionsAsEntityOriginIdsStub = this.stub(datapointsUtils, 'getDimensionsAsEntityOriginIds').returns(expectedDimensions);

    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater').callsFake((plugin: any, externalContextFrozen: any, callback: Function) => {
      const query = plugin.makeQueryToFetchTranslationTarget(changesDescriptor, context);

      sinon.assert.calledOnce(getDimensionsAsEntityOriginIdsStub);
      sinon.assert.calledWith(getDimensionsAsEntityOriginIdsStub, changesDescriptor.changes, context);

      expect(query.measureOriginId).to.equal(context.indicator.originId);
      expect(query.dimensionsSize).to.equal(1);
      expect(query.dimensionsEntityOriginIds).to.deep.equal(expectedDimensionsAsOriginIds);
      expect(Object.keys(query).length).to.equal(4);

      return callback();
    });

    return UpdateDatapointTranslations.updateDatapointsTranslations(externalContext, () => {
      return done();
    });
  }));

  it('makes a query to fetch translation target based on giving context and changes descriptor: if no indicator origin is is found - logs this fact', sandbox(function (done: Function): void {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(entities.segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(entities.segregatedPreviousEntities));

    const changesDescriptor = new ChangesDescriptor({
      object: {
        company: 'mcrsft',
        anno: '1975',
        company_size: 'klein',
        population: 43
      }
    });

    const context = {
      indicator: {},
      dimensions: []
    };

    this.stub(datapointsUtils, 'getDimensionsAsEntityOriginIds').returns({dimensionsEntityOriginIds: [], timeDimension: null});
    const loggerErrorStub = this.stub(logger, 'error');

    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater').callsFake((plugin, externalContextFrozen, callback) => {
      const query = plugin.makeQueryToFetchTranslationTarget(changesDescriptor, context);

      sinon.assert.calledOnce(loggerErrorStub);
      sinon.assert.calledWith(loggerErrorStub, 'Measure was not found! ChangesDescriptor internals are: ', changesDescriptor.changes);
      callback();
    });

    UpdateDatapointTranslations.updateDatapointsTranslations(externalContext, () => {
      done();
    });
  }));

  it('transforms stream before changes are actually applied: streams comes in form of changesDescriptor --> context pairs', sandbox(function (done: Function): void {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(entities.segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(entities.segregatedPreviousEntities));

    const changesDescriptor = new ChangesDescriptor({
      object: {
        company: 'mcrsft',
        anno: '1975',
        company_size: 'klein',
        population: 43
      }
    });

    const context = {
      measures: {
        population: {
          gid: 'population'
        },
        company_size: {
          gid: 'company_size'
        }
      }
    };

    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater').callsFake((plugin: any, externalContextFrozen: any, callback: Function) => {
      const changes = hi([{changesDescriptor, context}]);

      plugin.transformStreamBeforeChangesApplied(changes).toArray((result: any) => {
        expect(result.length).to.equal(2);

        expect(result[0].context.indicator.gid).to.equal('population');
        expect(result[0].changesDescriptor).to.equal(changesDescriptor);

        expect(result[1].context.indicator.gid).to.equal('company_size');
        expect(result[1].changesDescriptor).to.equal(changesDescriptor);
        callback();
      });
    });

    UpdateDatapointTranslations.updateDatapointsTranslations(externalContext, () => {
      return done();
    });
  }));

  it('transforms stream before changes are actually applied: if no indicators in context can be mapped to changes - nothign should be changed', sandbox(function (done: Function): void {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(entities.segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(entities.segregatedPreviousEntities));

    const changesDescriptor = new ChangesDescriptor({
      object: {
        company: 'mcrsft',
        anno: '1975',
        company_size: 'klein',
        population: 43
      }
    });

    const context = {
      measures: {
        gini: {
          gid: 'gini'
        }
      }
    };

    this.stub(UpdateTranslationsFlow, 'createTranslationsUpdater').callsFake((plugin: any, externalContextFrozen: any, callback: Function) => {
      const changes = hi([{changesDescriptor, context}]);

      plugin.transformStreamBeforeChangesApplied(changes).toArray((result: any) => {
        expect(result.length).to.equal(0);
        return callback();
      });
    });

    UpdateDatapointTranslations.updateDatapointsTranslations(externalContext, () => {
      return done();
    });
  }));
});
