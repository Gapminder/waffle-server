'use strict';

const _  = require('lodash');
const hi = require('highland');
const async = require('async');
require('../../ws.config/db.config');
require('../../ws.repository/index');
const constants = require('../../ws.utils/constants');
const proxyquire = require('proxyquire');
const chai  = require('chai');
const expect = chai.expect;

describe('datapoints import', function() {
  it('should not be any error', function(done) {
    this.timeout(100000);

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
    const allEntities = require('./fixtures/allEntities.json');
    const segregatedEntities = {
      bySet: {'country': [], 'city': []},
      byDomain: {'geo': allEntities, 'time': []},
      byGid: _.groupBy(allEntities, 'gid'),
      groupedByGid: {}
    };
    const datapoints = require('./fixtures/datapoints.json');

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
        expect(_.find(datapoints, datapoint)).to.be.ok;

        return [{gid: datapoint.time, properties: datapoint, domain: dimensions.time}];
      }
    };

    const ddfImportUtils = {
      readCsvFileAsStream: () => {
        return hi(datapoints);
      },
      MONGODB_DOC_CREATION_THREADS_AMOUNT: 3,
      DEFAULT_CHUNK_SIZE: DEFAULT_CHUNK_SIZE
    };

    const importDatapoints  = proxyquire('../../ws.import/import-datapoints', {
      './utils/datapoints.utils': datapointsUtils,
      './utils/import-ddf.utils': ddfImportUtils
    });

    return importDatapoints(context, (error, externalContext) => {
      expect(error).to.be.null;
      expect(externalContext).to.be.deep.equal(context);

      return done();
    });
  });
});
