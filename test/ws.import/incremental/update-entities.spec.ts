import '../../../ws.repository';
import {expect} from 'chai';
import * as _ from 'lodash';
import * as path from 'path';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import {logger} from '../../../ws.config/log';

import * as updateService from '../../../ws.import/incremental/update-entities';
import {EntitiesRepositoryFactory} from '../../../ws.repository/ddf/entities/entities.repository';
import { constants } from '../../../ws.utils/constants';

const datasetId = 'DATASETID';
const version = 1111111;

const sandbox = sinonTest.configureTest(sinon);

const domain = {
  _id: 'DOMAINID',
  dataset: datasetId,
  domain: null,
  from: version - 1,
  gid: 'company',
  languages: {  },
  originId: 'DOMAINID',
  properties: {
    concept: 'company',
    concept_type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
    domain: null
  },
  subsetOf: [],
  title: undefined,
  to: 9007199254740991,
  type: constants.CONCEPT_TYPE_ENTITY_DOMAIN
};

const set1 = {
  _id: 'ENTITYSETID',
  dataset: datasetId,
  domain,
  from: version - 1,
  gid: 'company_size',
  languages: {  },
  originId: 'ENTITYSETID',
  properties: {
    concept: 'company_size',
    concept_type: constants.CONCEPT_TYPE_ENTITY_SET,
    domain: 'company'
  },
  subsetOf: [],
  title: undefined,
  to: version,
  type: constants.CONCEPT_TYPE_ENTITY_SET
};

const set2 = {
  _id: 'ENTITYSETID1',
  dataset: datasetId,
  domain,
  from: version,
  gid: 'company_scale',
  languages: {  },
  originId: 'ENTITYSETID',
  properties: {
    concept: 'company_scale',
    concept_type: constants.CONCEPT_TYPE_ENTITY_SET,
    domain: 'company'
  },
  subsetOf: [],
  title: undefined,
  to: 9007199254740991,
  type: constants.CONCEPT_TYPE_ENTITY_SET
};

const set3 = {
  _id: 'ENTITYSETID2',
  dataset: datasetId,
  domain,
  from: version,
  gid: 'english_speaking',
  languages: {  },
  originId: 'ENTITYSETID2',
  properties: {
    concept: 'english_speaking',
    concept_type: constants.CONCEPT_TYPE_ENTITY_SET,
    domain: 'company'
  },
  subsetOf: [],
  title: undefined,
  to: 9007199254740991,
  type: constants.CONCEPT_TYPE_ENTITY_SET
};

const set4 = {
  _id: 'ENTITYSETID3',
  dataset: datasetId,
  domain: null,
  from: version,
  gid: 'region',
  languages: {  },
  originId: 'ENTITYSETID3',
  properties: {
    concept: 'region',
    concept_type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
    domain: null
  },
  subsetOf: [],
  title: undefined,
  to: 9007199254740991,
  type: constants.CONCEPT_TYPE_ENTITY_DOMAIN
};

const externalContextFixture: any = {
  dataset: {
    _id: datasetId
  },
  transaction: {
    _id: 'TRANSACTIONID',
    createdAt: version
  },
  previousConcepts: {company_size: set1},
  concepts: {company: domain, company_scale: set2, english_speaking: set3, region: set4},
  timeConcepts: [],
  datasetId,
  version
};

const expectedCreatedEntities = [
  {
    dataset: 'DATASETID',
    domain: 'DOMAINID',
    from: 1111111,
    gid: 'small',
    languages: {  },
    originId: null,
    parsedProperties: {  },
    properties: { company_scale: 'small', full_name_changed: 'Not very big', 'is--company_scale': true },
    sets: ['ENTITYSETID'],
    sources: ['ddf--entities--company--company_scale.csv']
  }, {
    dataset: 'DATASETID',
    domain: 'DOMAINID',
    from: 1111111,
    gid: 'large',
    languages: {  },
    originId: null,
    parsedProperties: {  },
    properties: { company_scale: 'large', full_name_changed: 'Very Big', 'is--company_scale': true },
    sets: ['ENTITYSETID'],
    sources: ['ddf--entities--company--company_scale.csv']
  }, {
    dataset: 'DATASETID',
    domain: 'DOMAINID',
    from: 1111111,
    gid: 'medium',
    languages: {  },
    originId: null,
    parsedProperties: {  },
    properties: { company_scale: 'medium', full_name_changed: 'medium', 'is--company_scale': true },
    sets: ['ENTITYSETID'],
    sources: ['ddf--entities--company--company_scale.csv']
  }
];

const entitiesRepository = {
  closeOneByQuery: _.noop,
  // closeByGid: _.noop,
  create: _.noop
  // findAll: _.noop,
  // findDistinctDrillups: _.noop,
  // findDistinctDomains: _.noop,
  // setDomainByGid: _.noop,
  // addSubsetOfByGid: _.noop
};

describe('Update Entities', function () {
  it('should create new and remove old entities from fixture', sandbox(function (done: Function) {
    const originExternalContext = _.defaults({pathToDatasetDiff: path.resolve(__dirname, './fixtures/full-diff-entities.txt')}, externalContextFixture);
    const expectedError = null;
    const expectedCloseOneByQueryCallCount = 3;
    const expectedloggerDebugCallCount = 6;

    const loggerDebugStub = this.stub(logger, 'debug');
    const loggerInfoStub = this.stub(logger, 'info');
    const loggerErrorStub = this.stub(logger, 'error');

    const createStub = this.stub(entitiesRepository, 'create').callsArgWithAsync(1, expectedError);
    const versionAgnosticStub = this.stub(EntitiesRepositoryFactory, 'versionAgnostic').returns(entitiesRepository);

    const closeOneByQueryStub = this.stub(entitiesRepository, 'closeOneByQuery').callsArgWithAsync(1, expectedError);
    const latestVersionStub = this.stub(EntitiesRepositoryFactory, 'latestVersion').returns(entitiesRepository);

    return updateService.updateEntities(originExternalContext, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext).to.deep.equal(originExternalContext);

      sinon.assert.callCount(loggerDebugStub, expectedloggerDebugCallCount);
      expect(loggerDebugStub.args[0][0]).to.be.equal('Start process of entities update');
      expect(loggerDebugStub.args[0][1]).to.not.exist;
      expect(loggerDebugStub.args[1][0]).to.be.equal('Removing batch of entities. Amount: ');
      expect(loggerDebugStub.args[1][1]).to.be.equal(3);
      expect(loggerDebugStub.args[1][2]).to.not.exist;

      const expectedQuery1 = {
        domain: 'DOMAINID',
        'properties.company_size': 'small',
        sets: ['ENTITYSETID'],
        sources: 'ddf--entities--company--company_size.csv'
      };

      const expectedQuery2 = {
        domain: 'DOMAINID',
        'properties.company_size': 'large',
        sets: ['ENTITYSETID'],
        sources: 'ddf--entities--company--company_size.csv'
      };

      const expectedQuery3 = {
        domain: 'DOMAINID',
        'properties.company_size': 'medium',
        sets: ['ENTITYSETID'],
        sources: 'ddf--entities--company--company_size.csv'
      };

      expect(loggerDebugStub.args[2][0]).to.be.equal('Closing entity by query: ');
      expect(loggerDebugStub.args[2][1]).to.be.deep.equal(expectedQuery1);
      expect(loggerDebugStub.args[2][2]).to.not.exist;
      expect(loggerDebugStub.args[3][0]).to.be.equal('Closing entity by query: ');
      expect(loggerDebugStub.args[3][1]).to.be.deep.equal(expectedQuery2);
      expect(loggerDebugStub.args[3][2]).to.not.exist;
      expect(loggerDebugStub.args[4][0]).to.be.equal('Closing entity by query: ');
      expect(loggerDebugStub.args[4][1]).to.be.deep.equal(expectedQuery3);
      expect(loggerDebugStub.args[4][2]).to.not.exist;

      expect(loggerDebugStub.args[5][0]).to.be.equal('Saving batch of created entities. Amount: ');
      expect(loggerDebugStub.args[5][1]).to.be.equal(3);
      expect(loggerDebugStub.args[5][2]).to.not.exist;

      sinon.assert.calledThrice(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, sinon.match('Start creating entities').or(sinon.match('Start removing entities')).or(sinon.match('Start updating entities')));

      sinon.assert.calledThrice(loggerErrorStub);
      sinon.assert.calledWithExactly(loggerErrorStub, sinon.match('Entity was not closed, though it should be'), sinon.match.object, sinon.match.object);

      // *** createConcepts
      sinon.assert.calledOnce(versionAgnosticStub);
      sinon.assert.calledWithExactly(versionAgnosticStub);
      sinon.assert.calledOnce(createStub);
      sinon.assert.calledWith(createStub, expectedCreatedEntities);

      sinon.assert.calledOnce(latestVersionStub);
      sinon.assert.calledWithExactly(latestVersionStub, datasetId, version);

      sinon.assert.callCount(closeOneByQueryStub, expectedCloseOneByQueryCallCount);
      expect(closeOneByQueryStub.args[0][0]).to.be.deep.equal(expectedQuery1);
      expect(closeOneByQueryStub.args[1][0]).to.be.deep.equal(expectedQuery2);
      expect(closeOneByQueryStub.args[2][0]).to.be.deep.equal(expectedQuery3);

      return done();
    });
  }));

  it('should interrupt with error when entity was not found for closing', sandbox(function(done: Function) {
    const originExternalContext = _.defaults({pathToDatasetDiff: path.resolve(__dirname, './fixtures/full-diff-entities.txt')}, externalContextFixture);
    const expectedError = 'Boo!';
    const expectedloggerDebugCallCount = 6;

    const loggerDebugStub = this.stub(logger, 'debug');
    const loggerInfoStub = this.stub(logger, 'info');
    const loggerErrorStub = this.stub(logger, 'error');

    const createStub = this.stub(entitiesRepository, 'create').callsArgWithAsync(1);
    const versionAgnosticStub = this.stub(EntitiesRepositoryFactory, 'versionAgnostic').returns(entitiesRepository);

    const closeOneByQueryStub = this.stub(entitiesRepository, 'closeOneByQuery').callsArgWithAsync(1, expectedError);
    const latestVersionStub = this.stub(EntitiesRepositoryFactory, 'latestVersion').returns(entitiesRepository);

    return updateService.updateEntities(originExternalContext, (error, externalContext) => {
      expect(error).to.be.deep.equal([expectedError]);
      expect(externalContext).to.deep.equal(originExternalContext);

      sinon.assert.callCount(loggerDebugStub, expectedloggerDebugCallCount);
      expect(loggerDebugStub.args[0][0]).to.be.equal('Start process of entities update');
      expect(loggerDebugStub.args[0][1]).to.not.exist;
      expect(loggerDebugStub.args[1][0]).to.be.equal('Removing batch of entities. Amount: ');
      expect(loggerDebugStub.args[1][1]).to.be.equal(3);
      expect(loggerDebugStub.args[1][2]).to.not.exist;

      const expectedQuery1 = {
        domain: 'DOMAINID',
        'properties.company_size': 'small',
        sets: ['ENTITYSETID'],
        sources: 'ddf--entities--company--company_size.csv'
      };

      const expectedQuery2 = {
        domain: 'DOMAINID',
        'properties.company_size': 'large',
        sets: ['ENTITYSETID'],
        sources: 'ddf--entities--company--company_size.csv'
      };

      const expectedQuery3 = {
        domain: 'DOMAINID',
        'properties.company_size': 'medium',
        sets: ['ENTITYSETID'],
        sources: 'ddf--entities--company--company_size.csv'
      };

      expect(loggerDebugStub.args[2][0]).to.be.equal('Closing entity by query: ');
      expect(loggerDebugStub.args[2][1]).to.be.deep.equal(expectedQuery1);
      expect(loggerDebugStub.args[2][2]).to.not.exist;
      expect(loggerDebugStub.args[3][0]).to.be.equal('Closing entity by query: ');
      expect(loggerDebugStub.args[3][1]).to.be.deep.equal(expectedQuery2);
      expect(loggerDebugStub.args[3][2]).to.not.exist;
      expect(loggerDebugStub.args[4][0]).to.be.equal('Closing entity by query: ');
      expect(loggerDebugStub.args[4][1]).to.be.deep.equal(expectedQuery3);
      expect(loggerDebugStub.args[4][2]).to.not.exist;

      expect(loggerDebugStub.args[5][0]).to.be.equal('Saving batch of created entities. Amount: ');
      expect(loggerDebugStub.args[5][1]).to.be.equal(3);
      expect(loggerDebugStub.args[5][2]).to.not.exist;

      sinon.assert.calledThrice(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, sinon.match('Start creating entities').or(sinon.match('Start removing entities')).or(sinon.match('Start updating entities')));

      sinon.assert.notCalled(loggerErrorStub);

      // *** createConcepts
      sinon.assert.calledOnce(versionAgnosticStub);
      sinon.assert.calledWithExactly(versionAgnosticStub);
      sinon.assert.calledOnce(createStub);
      sinon.assert.calledWith(createStub, expectedCreatedEntities);

      sinon.assert.calledOnce(latestVersionStub);
      sinon.assert.calledWithExactly(latestVersionStub, datasetId, version);

      sinon.assert.calledThrice(closeOneByQueryStub);
      expect(closeOneByQueryStub.args[0][0]).to.be.deep.equal(expectedQuery1);
      expect(closeOneByQueryStub.args[1][0]).to.be.deep.equal(expectedQuery2);
      expect(closeOneByQueryStub.args[2][0]).to.be.deep.equal(expectedQuery3);

      return done();
    });
  }));

  it('should log message when entity was closed without errors', sandbox(function(done: Function) {
    const originExternalContext = _.defaults({pathToDatasetDiff: path.resolve(__dirname, './fixtures/full-diff-entities.txt')}, externalContextFixture);
    const expectedError = null;
    const expectedEntity = {_id: 'ENTITYID', originId: 'ENTITYID'};
    const expectedCloseOneByQueryCallCount = 3;
    const expectedloggerDebugCallCount = 9;

    const loggerDebugStub = this.stub(logger, 'debug');
    const loggerInfoStub = this.stub(logger, 'info');
    const loggerErrorStub = this.stub(logger, 'error');

    const createStub = this.stub(entitiesRepository, 'create').callsArgWithAsync(1, expectedError);
    const versionAgnosticStub = this.stub(EntitiesRepositoryFactory, 'versionAgnostic').returns(entitiesRepository);

    const closeOneByQueryStub = this.stub(entitiesRepository, 'closeOneByQuery').callsArgWithAsync(1, expectedError, expectedEntity);
    const latestVersionStub = this.stub(EntitiesRepositoryFactory, 'latestVersion').returns(entitiesRepository);

    return updateService.updateEntities(originExternalContext, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext).to.deep.equal(originExternalContext);

      sinon.assert.callCount(loggerDebugStub, expectedloggerDebugCallCount);
      expect(loggerDebugStub.args[0][0]).to.be.equal('Start process of entities update');
      expect(loggerDebugStub.args[0][1]).to.not.exist;
      expect(loggerDebugStub.args[1][0]).to.be.equal('Removing batch of entities. Amount: ');
      expect(loggerDebugStub.args[1][1]).to.be.equal(3);
      expect(loggerDebugStub.args[1][2]).to.not.exist;

      const expectedQuery1 = {
        domain: 'DOMAINID',
        'properties.company_size': 'small',
        sets: ['ENTITYSETID'],
        sources: 'ddf--entities--company--company_size.csv'
      };

      const expectedQuery2 = {
        domain: 'DOMAINID',
        'properties.company_size': 'large',
        sets: ['ENTITYSETID'],
        sources: 'ddf--entities--company--company_size.csv'
      };

      const expectedQuery3 = {
        domain: 'DOMAINID',
        'properties.company_size': 'medium',
        sets: ['ENTITYSETID'],
        sources: 'ddf--entities--company--company_size.csv'
      };

      expect(loggerDebugStub.args[2][0]).to.be.equal('Closing entity by query: ');
      expect(loggerDebugStub.args[2][1]).to.be.deep.equal(expectedQuery1);
      expect(loggerDebugStub.args[2][2]).to.not.exist;
      expect(loggerDebugStub.args[3][0]).to.be.equal('Closing entity by query: ');
      expect(loggerDebugStub.args[3][1]).to.be.deep.equal(expectedQuery2);
      expect(loggerDebugStub.args[3][2]).to.not.exist;
      expect(loggerDebugStub.args[4][0]).to.be.equal('Closing entity by query: ');
      expect(loggerDebugStub.args[4][1]).to.be.deep.equal(expectedQuery3);
      expect(loggerDebugStub.args[4][2]).to.not.exist;

      expect(loggerDebugStub.args[5][0]).to.be.equal('Saving batch of created entities. Amount: ');
      expect(loggerDebugStub.args[5][1]).to.be.equal(3);
      expect(loggerDebugStub.args[5][2]).to.not.exist;

      expect(loggerDebugStub.args[6][0]).to.be.equal('Entity was closed. OriginId: ');
      expect(loggerDebugStub.args[6][1]).to.be.deep.equal(expectedEntity.originId);
      expect(loggerDebugStub.args[6][2]).to.not.exist;
      expect(loggerDebugStub.args[7][0]).to.be.equal('Entity was closed. OriginId: ');
      expect(loggerDebugStub.args[7][1]).to.be.deep.equal(expectedEntity.originId);
      expect(loggerDebugStub.args[7][2]).to.not.exist;
      expect(loggerDebugStub.args[8][0]).to.be.equal('Entity was closed. OriginId: ');
      expect(loggerDebugStub.args[8][1]).to.be.deep.equal(expectedEntity.originId);
      expect(loggerDebugStub.args[8][2]).to.not.exist;

      sinon.assert.calledThrice(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, sinon.match('Start creating entities').or(sinon.match('Start removing entities')).or(sinon.match('Start updating entities')));

      sinon.assert.notCalled(loggerErrorStub);

      // *** createConcepts
      sinon.assert.calledOnce(versionAgnosticStub);
      sinon.assert.calledWithExactly(versionAgnosticStub);
      sinon.assert.calledOnce(createStub);
      sinon.assert.calledWith(createStub, expectedCreatedEntities);

      sinon.assert.calledOnce(latestVersionStub);
      sinon.assert.calledWithExactly(latestVersionStub, datasetId, version);

      sinon.assert.callCount(closeOneByQueryStub, expectedCloseOneByQueryCallCount);
      expect(closeOneByQueryStub.args[0][0]).to.be.deep.equal(expectedQuery1);
      expect(closeOneByQueryStub.args[1][0]).to.be.deep.equal(expectedQuery2);
      expect(closeOneByQueryStub.args[2][0]).to.be.deep.equal(expectedQuery3);

      return done();
    });
  }));

  it('should update entities without errors', sandbox(function(done: Function) {
    const originExternalContext = _.defaults({pathToDatasetDiff: path.resolve(__dirname, './fixtures/updated-entities.txt')}, externalContextFixture);
    const expectedEntity = {
      _id: 'ENTITYID',
      originId: 'ENTITYID',
      properties: {},
      sources: ['ddf--entities--company--company_scale.csv'],
      languages: {
        'nl-nl': {
        }
      }
    };
    const expectedEntityGap = _.extend({}, expectedEntity, {
      gid: 'gap',
      properties: {
        english_speaking: 'gap',
        'is--english_speaking': true,
        name: 'Gapminder'
      }
    });
    const expectedloggerDebugCallCount = 12;
    const expectedVersionAgnosticCallCount = 4;

    const loggerDebugStub = this.stub(logger, 'debug');
    const loggerInfoStub = this.stub(logger, 'info');
    const loggerErrorStub = this.stub(logger, 'error');

    const createStub = this.stub(entitiesRepository, 'create').callsArgWithAsync(1, null);
    const versionAgnosticStub = this.stub(EntitiesRepositoryFactory, 'versionAgnostic').returns(entitiesRepository);

    const closeOneByQueryStub = this.stub(entitiesRepository, 'closeOneByQuery');
    closeOneByQueryStub.onFirstCall().callsArgWithAsync(1, null, expectedEntityGap);
    closeOneByQueryStub.onCall(1).callsArgWithAsync(1, null, expectedEntity);
    closeOneByQueryStub.onCall(2).callsArgWithAsync(1, null, expectedEntity);
    closeOneByQueryStub.onCall(3).callsArgWithAsync(1, null, expectedEntity);
    const latestVersionStub = this.stub(EntitiesRepositoryFactory, 'latestVersion').returns(entitiesRepository);

    return updateService.updateEntities(originExternalContext, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext).to.deep.equal(originExternalContext);

      sinon.assert.callCount(loggerDebugStub, expectedloggerDebugCallCount);
      expect(loggerDebugStub.args[0][0]).to.be.equal('Start process of entities update');
      expect(loggerDebugStub.args[0][1]).to.not.exist;
      expect(loggerDebugStub.args[1][0]).to.be.equal('Saving batch of created entities. Amount: ');
      expect(loggerDebugStub.args[1][1]).to.be.equal(1);
      expect(loggerDebugStub.args[1][2]).to.not.exist;

      expect(loggerDebugStub.args[2][0]).to.be.equal('Updating batch of entities. Amount: ');
      expect(loggerDebugStub.args[2][1]).to.be.equal(3);
      expect(loggerDebugStub.args[2][2]).to.not.exist;

      const expectedQuery1 = {domain: 'DOMAINID', 'properties.english_speaking': 'gap', sets: ['ENTITYSETID2'], sources: 'ddf--entities--company--english_speaking.csv'};
      const expectedQuery2 = {domain: 'ENTITYSETID3', 'properties.region': 'america', sets: [], sources: 'ddf--entities--region.csv'};
      const expectedQuery3 = {domain: 'ENTITYSETID3', 'properties.region': 'europe', sets: [], sources: 'ddf--entities--region.csv'};

      expect(loggerDebugStub.args[3][0]).to.be.equal('Closing entity by query: ');
      expect(loggerDebugStub.args[3][1]).to.be.deep.equal(expectedQuery1);
      expect(loggerDebugStub.args[3][2]).to.not.exist;
      expect(loggerDebugStub.args[4][0]).to.be.equal('Closing entity by query: ');
      expect(loggerDebugStub.args[4][1]).to.be.deep.equal(expectedQuery2);
      expect(loggerDebugStub.args[4][2]).to.not.exist;
      expect(loggerDebugStub.args[5][0]).to.be.equal('Closing entity by query: ');
      expect(loggerDebugStub.args[5][1]).to.be.deep.equal(expectedQuery3);
      expect(loggerDebugStub.args[5][2]).to.not.exist;

      expect(loggerDebugStub.args[6][0]).to.be.equal('Entity was closed. OriginId: ');
      expect(loggerDebugStub.args[6][1]).to.be.deep.equal(expectedEntity.originId);
      expect(loggerDebugStub.args[6][2]).to.not.exist;
      expect(loggerDebugStub.args[7][0]).to.be.equal('Creating updated entity based on its closed version');
      expect(loggerDebugStub.args[7][1]).to.not.exist;

      expect(loggerDebugStub.args[8][0]).to.be.equal('Entity was closed. OriginId: ');
      expect(loggerDebugStub.args[8][1]).to.be.deep.equal(expectedEntity.originId);
      expect(loggerDebugStub.args[8][2]).to.not.exist;
      expect(loggerDebugStub.args[9][0]).to.be.equal('Creating updated entity based on its closed version');
      expect(loggerDebugStub.args[9][2]).to.not.exist;

      expect(loggerDebugStub.args[10][0]).to.be.equal('Entity was closed. OriginId: ');
      expect(loggerDebugStub.args[10][1]).to.be.deep.equal(expectedEntity.originId);
      expect(loggerDebugStub.args[10][2]).to.not.exist;
      expect(loggerDebugStub.args[11][0]).to.be.equal('Creating updated entity based on its closed version');
      expect(loggerDebugStub.args[11][2]).to.not.exist;

      sinon.assert.calledThrice(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, sinon.match('Start creating entities').or(sinon.match('Start removing entities')).or(sinon.match('Start updating entities')));

      sinon.assert.notCalled(loggerErrorStub);

      // *** createConcepts
      sinon.assert.callCount(versionAgnosticStub, expectedVersionAgnosticCallCount);
      sinon.assert.calledWithExactly(versionAgnosticStub);
      sinon.assert.callCount(createStub, expectedVersionAgnosticCallCount);

      const expectedCreatedEntity1 = {
        gid: 'asia',
        sources: [
          'ddf--entities--region.csv'
        ],
        properties: {
          region: 'asia',
          full_name_changed: 'Asia part of Eurasia Updated'
        },
        parsedProperties: {},
        originId: null,
        languages: {},
        domain: 'ENTITYSETID3',
        sets: [],
        from: version,
        dataset: datasetId
      };
      const expectedCreatedEntity2 = {
        gid: 'gap',
        sources: [
          'ddf--entities--company--company_scale.csv',
          'ddf--entities--company--english_speaking.csv'
        ],
        properties: {
          english_speaking: 'gap',
          'is--english_speaking': true,
          name: 'Gapminder',
          additional_column: 'any text 2'
        },
        parsedProperties: {},
        originId: 'ENTITYID',
        languages: {
          'nl-nl': {}
        },
        domain: 'DOMAINID',
        sets: [
          'ENTITYSETID2'
        ],
        from: version,
        dataset: datasetId
      };
      const expectedCreatedEntity3 = {
        gid: 'america',
        sources: [
          'ddf--entities--company--company_scale.csv',
          'ddf--entities--region.csv'
        ],
        properties: {
          region: 'america',
          full_name_changed: 'The Americas, including north, south and central america'
        },
        parsedProperties: {},
        originId: 'ENTITYID',
        languages: {
          'nl-nl': {}
        },
        domain: 'ENTITYSETID3',
        sets: [],
        from: version,
        dataset: datasetId
      };
      const expectedCreatedEntity4 = {
        gid: 'europe',
        sources: [
          'ddf--entities--company--company_scale.csv',
          'ddf--entities--region.csv'
        ],
        properties: {
          region: 'europe',
          full_name_changed: 'The European part of Eurasia'
        },
        parsedProperties: {},
        originId: 'ENTITYID',
        languages: {
          'nl-nl': {}
        },
        domain: 'ENTITYSETID3',
        sets: [],
        from: version,
        dataset: datasetId
      };

      expect(createStub.args[0][0]).to.be.deep.equal([expectedCreatedEntity1]);
      expect(createStub.args[1][0]).to.be.deep.equal(expectedCreatedEntity2);
      expect(createStub.args[2][0]).to.be.deep.equal(expectedCreatedEntity3);
      expect(createStub.args[3][0]).to.be.deep.equal(expectedCreatedEntity4);

      sinon.assert.calledOnce(latestVersionStub);
      sinon.assert.calledWithExactly(latestVersionStub, datasetId, version);

      sinon.assert.calledThrice(closeOneByQueryStub);
      expect(closeOneByQueryStub.args[0][0]).to.be.deep.equal(expectedQuery1);
      expect(closeOneByQueryStub.args[1][0]).to.be.deep.equal(expectedQuery2);
      expect(closeOneByQueryStub.args[2][0]).to.be.deep.equal(expectedQuery3);

      return done();
    });
  }));
});
