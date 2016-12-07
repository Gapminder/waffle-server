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

describe('entities import', function() {
  it('should not be any error', function(done) {
    const entitySetsOriginIds = ["583eb88d7fc6e74f7b4c3ce7", "583eb88d7fc6e74f7b4c3ce8"];
    const sets = {country: {gid: 'country', originId: entitySetsOriginIds[0]}, city: {gid: 'city', originId: entitySetsOriginIds[1]}};
    const domain = {gid: 'geo', originId: "583eb88d7fc6e74f7b4c3ce6"};
    const timeConcepts = {anno: {gid: 'anno'}, time: {gid: 'time'}};
    const concepts = _.merge({}, timeConcepts, {geo: domain}, sets);

    const DEFAULT_CHUNK_SIZE = 10;
    const DEFAULT_ENTITIES_FILENAME = 'ddf--entities--geo.csv';
    const DEFAULT_ENTITIES_RESOURCE = {
      type: constants.ENTITIES,
      primaryKey: ['geo'],
      path: DEFAULT_ENTITIES_FILENAME,
      fields: ['geo', 'is--country', 'is--city', 'name', 'code'],
      concept: 'geo',
      entitySets: ['country', 'city']
    };
    const VERSION = 1480505431403.0;
    const DATASET_ID = "583eb8577fc6e74f7b4c3ce3";
    const context = {
      'pathToDdfFolder': './fixtures',
      'datapackage': {
        resources: [
          {
            type: constants.DATAPOINTS,
            primaryKey: ['geo', 'time'],
            path: 'ddf--datapoints--population--by--geo--time.csv',
            dimensions: ['geo', 'time'],
            indicators: ['population'],
          },
          DEFAULT_ENTITIES_RESOURCE,
          {
            type: constants.CONCEPTS,
            primaryKey: ['concept'],
            path: 'ddf--concepts.csv'
          }
        ]
      },
      'concepts': concepts,
      'timeConcepts': timeConcepts,
      'transaction': {
        createdAt: VERSION
      },
      'dataset': {
        _id: DATASET_ID
      }
    };
    const entities = require('./fixtures/entities.json');
    const entitiesUtils = {
      getSetsAndDomain: (resource, externalContextFrozen) => {
        expect(resource).to.be.equal(DEFAULT_ENTITIES_RESOURCE);
        expect(externalContextFrozen).to.be.deep.equal(context);

        return {entitySet: domain, entityDomain: domain};
      }
    };

    const ddfImportUtils = {
      readCsvFileAsStream: () => {
        return hi(entities);
      },
      MONGODB_DOC_CREATION_THREADS_AMOUNT: 3,
      DEFAULT_CHUNK_SIZE: DEFAULT_CHUNK_SIZE
    };

    const ddfMappers = {
      mapDdfEntityToWsModel: (rawEntity, externalContext) => {
        expect(externalContext.entitySet).to.be.deep.equal(domain);
        expect(externalContext.concepts).to.be.deep.equal(concepts);
        expect(externalContext.entityDomain).to.be.deep.equal(domain);
        expect(externalContext.filename).to.be.equal(DEFAULT_ENTITIES_FILENAME);
        expect(externalContext.timeConcepts).to.be.deep.equal(timeConcepts);
        expect(externalContext.version).to.be.equal(VERSION);
        expect(externalContext.datasetId).to.be.equal(DATASET_ID);

        return {
          gid: rawEntity.geo,
          sets: entitySetsOriginIds,
          domain: externalContext.entityDomain.originId
        };
      }
    };

    const entitiesRepository = {
      versionAgnostic: function () { return this; },
      create: (entities) => {
        expect(entities).to.have.length.below(DEFAULT_CHUNK_SIZE + 1);
        return Promise.resolve(entities);
      }
    };

    const importEntities  = proxyquire('../../ws.import/import-entities', {
      './utils/entities.utils': entitiesUtils,
      './utils/import-ddf.utils': ddfImportUtils,
      './utils/ddf-mappers': ddfMappers,
      '../ws.repository/ddf/entities/entities.repository': entitiesRepository
    });

    return importEntities(context, (error, externalContext) => {
      expect(error).to.be.null;
      expect(externalContext).to.be.deep.equal(context);

      return done();
    });
  });
});
