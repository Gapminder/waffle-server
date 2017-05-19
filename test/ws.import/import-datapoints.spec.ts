import '../../ws.config/db.config';
import '../../ws.repository/index';

import * as _  from 'lodash';
import * as hi from 'highland';
import * as proxyquire from 'proxyquire';
import {expect} from 'chai';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import {constants} from '../../ws.utils/constants';
import * as datapoints from './fixtures/datapoints.json';
import * as allEntities from './fixtures/allEntities.json';
import { logger } from '../../ws.config/log';

const test = sinonTest.configureTest(sinon);

describe('datapoints import', function() {
  it('should not be any error', test(function(done) {
    const dimensions = {
      geo: {gid: 'geo', properties: {}},
      time: {gid: 'time', properties: {}}
    };
    const measures = {
      population: {gid: 'population', properties: {}}
    };
    const DEFAULT_CHUNK_SIZE = 10;
    const DEFAULT_DATAPOINTS_FILENAME = 'ddf--datapoints--population--by--geo--time.csv';
    const DEFAULT_DATAPOINT_RESOURCE = {
      type: constants.DATAPOINTS,
      primaryKey: ['geo', 'time'],
      path: DEFAULT_DATAPOINTS_FILENAME,
      dimensions: ['geo', 'time'],
      indicators: ['population'],
    };
    const context = {
      'pathToDdfFolder': './fixtures',
      'datapackage': {
        resources: [
          DEFAULT_DATAPOINT_RESOURCE,
          {
            type: constants.ENTITIES,
            primaryKey: ['geo'],
            path: 'ddf--entities--geo.csv',
            fields: ['geo', 'is--country', 'is--city', 'name', 'code'],
            concept: 'geo',
            entitySets: ['country', 'city']
          },
          {
            type: constants.CONCEPTS,
            primaryKey: ['concept'],
            path: 'ddf--concepts.csv'
          }
        ]
      },
      'concepts': {},
      'timeConcepts': {},
      'transaction': {},
      'dataset': {}
    };

    const segregatedEntities = {
      bySet: {'country': [], 'city': []},
      byDomain: {'geo': allEntities, 'time': []},
      byGid: _.groupBy(allEntities as any, 'gid'),
      groupedByGid: {}
    };

    const datapointsUtils = {
      createEntitiesFoundInDatapointsSaverWithCache: () => {
        return (entities) => {
          expect(entities).to.have.length.below(DEFAULT_CHUNK_SIZE + 1);
          return Promise.resolve(entities);
        };
      },
      saveDatapointsAndEntitiesFoundInThem: (saveEntitiesFoundInDatapoints, externalContextFrozen, datapointsAndFoundEntitiesStream) => {
        expect(hi.isStream(datapointsAndFoundEntitiesStream)).to.be.ok;
        expect(_.isFunction(saveEntitiesFoundInDatapoints)).to.be.ok;
        expect(externalContextFrozen).to.be.deep.equal(context);

        return datapointsAndFoundEntitiesStream
          .batch(DEFAULT_CHUNK_SIZE)
          .flatMap(datapointsBatch => {
            const entitiesFoundInDatapoints = _.flatten(_.map(datapointsBatch, 'entitiesFoundInDatapoint'));

            return hi(saveEntitiesFoundInDatapoints(entitiesFoundInDatapoints));
          });
      },
      getDimensionsAndMeasures: (resource, externalContextFrozen) => {
        expect(resource).to.be.equal(DEFAULT_DATAPOINT_RESOURCE);
        expect(externalContextFrozen).to.be.deep.equal(context);

        return {dimensions, measures};
      },
      findAllEntities: (externalContextFrozen) => {
        expect(externalContextFrozen).to.be.deep.equal(context);
        return Promise.resolve(segregatedEntities);
      },
      findEntitiesInDatapoint: (datapoint, importContext, externalContextFrozen) => {
        expect(importContext.filename).to.be.equal(DEFAULT_DATAPOINTS_FILENAME);
        expect(importContext.dimensions).to.be.equal(dimensions);
        expect(importContext.measures).to.be.equal(measures);
        expect(importContext.segregatedEntities).to.be.equal(segregatedEntities);
        expect(externalContextFrozen).to.be.deep.equal(context);
        expect(_.find(datapoints as any, datapoint)).to.be.ok;

        return [{gid: datapoint.time, properties: datapoint, domain: dimensions.time}];
      }
    };

    const ddfImportUtils = {
      MONGODB_DOC_CREATION_THREADS_AMOUNT: 3,
      DEFAULT_CHUNK_SIZE: DEFAULT_CHUNK_SIZE
    };

    const fileUtils = {
      readCsvFileAsStream: () => {
        return hi(datapoints);
      }
    };

    const importDatapoints  = proxyquire('../../ws.import/import-datapoints', {
      './utils/datapoints.utils': datapointsUtils,
      './utils/import-ddf.utils': ddfImportUtils,
      '../ws.utils/file': fileUtils
    }).createDatapoints;

    const loggerInfoStub = this.stub(logger, 'info');

    return importDatapoints(context, (error, externalContext) => {
      expect(error).to.be.null;
      expect(externalContext).to.be.deep.equal(context);
      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `start process creating data points`);

      return done();
    });
  }));
});
