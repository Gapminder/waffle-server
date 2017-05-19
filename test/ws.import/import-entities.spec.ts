import '../../ws.config/db.config';
import '../../ws.repository/index';

import * as _  from 'lodash';
import * as hi from 'highland';
import {constants} from '../../ws.utils/constants';
import * as proxyquire from 'proxyquire';
import {expect} from 'chai';
import * as entities from './fixtures/entities.json';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import { logger } from '../../ws.config/log';

const test = sinonTest.configureTest(sinon);

describe('entities import', function() {
  it('should not be any error', test(function(done) {
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

    const entitiesUtils = {
      getSetsAndDomain: (resource, externalContextFrozen) => {
        expect(resource).to.be.equal(DEFAULT_ENTITIES_RESOURCE);
        expect(externalContextFrozen).to.be.deep.equal(context);

        return {entitySet: domain, entityDomain: domain};
      }
    };

    const ddfImportUtils = {
      MONGODB_DOC_CREATION_THREADS_AMOUNT: 3,
      DEFAULT_CHUNK_SIZE: DEFAULT_CHUNK_SIZE
    };

    const fileUtils = {
      readCsvFileAsStream: () => {
        return hi(entities);
      }
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
      '../ws.utils/file': fileUtils,
      './utils/ddf-mappers': ddfMappers,
      '../ws.repository/ddf/entities/entities.repository': {
        EntitiesRepositoryFactory: entitiesRepository
      }
    }).createEntities;

    const loggerInfoStub = this.stub(logger, 'info');

    return importEntities(context, (error, externalContext) => {
      expect(error).to.be.null;
      expect(externalContext).to.be.deep.equal(context);
      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `Start process of entities creation`);

      return done();
    });
  }));
});
