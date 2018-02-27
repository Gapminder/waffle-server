import '../../../ws.repository';
import {expect} from 'chai';
import * as _ from 'lodash';
import * as path from 'path';
import * as sinon from 'sinon';
import {logger} from '../../../ws.config/log';

import * as updateService from '../../../ws.import/incremental/update-entities';
import {EntitiesRepositoryFactory} from '../../../ws.repository/ddf/entities/entities.repository';

const datasetId = 'DATASETID';
const version = 1111111;

const sandbox = sinon.createSandbox();

const domain = {
  _id: 'DOMAINID',
  dataset: datasetId,
  domain: null,
  from: version - 1,
  gid: 'company',
  languages: {},
  originId: 'DOMAINID',
  properties: {
    concept: 'company',
    concept_type: 'entity_domain',
    domain: null
  },
  subsetOf: [],
  title: undefined,
  to: 9007199254740991,
  type: 'entity_domain'
};

const set1 = {
  _id: 'ENTITYSETID',
  dataset: datasetId,
  domain,
  from: version - 1,
  gid: 'company_size',
  languages: {},
  originId: 'ENTITYSETID',
  properties: {
    concept: 'company_size',
    concept_type: 'entity_set',
    domain: 'company'
  },
  subsetOf: [],
  title: undefined,
  to: version,
  type: 'entity_set'
};

const set2 = {
  _id: 'ENTITYSETID1',
  dataset: datasetId,
  domain,
  from: version,
  gid: 'company_scale',
  languages: {},
  originId: 'ENTITYSETID',
  properties: {
    concept: 'company_scale',
    concept_type: 'entity_set',
    domain: 'company'
  },
  subsetOf: [],
  title: undefined,
  to: 9007199254740991,
  type: 'entity_set'
};

const set3 = {
  _id: 'ENTITYSETID2',
  dataset: datasetId,
  domain,
  from: version,
  gid: 'english_speaking',
  languages: {},
  originId: 'ENTITYSETID2',
  properties: {
    concept: 'english_speaking',
    concept_type: 'entity_set',
    domain: 'company'
  },
  subsetOf: [],
  title: undefined,
  to: 9007199254740991,
  type: 'entity_set'
};

const set4 = {
  _id: 'ENTITYSETID3',
  dataset: datasetId,
  domain: null,
  from: version,
  gid: 'region',
  languages: {},
  originId: 'ENTITYSETID3',
  properties: {
    concept: 'region',
    concept_type: 'entity_domain',
    domain: null
  },
  subsetOf: [],
  title: undefined,
  to: 9007199254740991,
  type: 'entity_domain'
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
    languages: {},
    originId: null,
    parsedProperties: {},
    properties: {company_scale: 'small', full_name_changed: 'Not very big', 'is--company_scale': true},
    sets: ['ENTITYSETID'],
    sources: ['ddf--entities--company--company_scale.csv']
  }, {
    dataset: 'DATASETID',
    domain: 'DOMAINID',
    from: 1111111,
    gid: 'large',
    languages: {},
    originId: null,
    parsedProperties: {},
    properties: {company_scale: 'large', full_name_changed: 'Very Big', 'is--company_scale': true},
    sets: ['ENTITYSETID'],
    sources: ['ddf--entities--company--company_scale.csv']
  }, {
    dataset: 'DATASETID',
    domain: 'DOMAINID',
    from: 1111111,
    gid: 'medium',
    languages: {},
    originId: null,
    parsedProperties: {},
    properties: {company_scale: 'medium', full_name_changed: 'medium', 'is--company_scale': true},
    sets: ['ENTITYSETID'],
    sources: ['ddf--entities--company--company_scale.csv']
  }
];

const entitiesRepository = {
  closeOneByQuery: _.noop,
  // closeByGid: _.noop,
  create: _.noop,
  closeAllByQuery: _.noop
  // findAll: _.noop,
  // findDistinctDrillups: _.noop,
  // findDistinctDomains: _.noop,
  // setDomainByGid: _.noop,
  // addSubsetOfByGid: _.noop
};

describe('Update Entities', () => {

  afterEach(() => sandbox.restore());

  it('should create new and remove old entities from fixture', (done: Function) => {
    const originExternalContext = _.defaults({pathToDatasetDiff: path.resolve(__dirname, './fixtures/full-diff-entities.txt')}, externalContextFixture);
    const expectedError = null;
    const expectedCloseOneByQueryCallCount = 3;
    const expectedloggerDebugCallCount = 6;

    const loggerDebugStub = sandbox.stub(logger, 'debug');
    const loggerInfoStub = sandbox.stub(logger, 'info');
    const loggerErrorStub = sandbox.stub(logger, 'error');

    const createStub = sandbox.stub(entitiesRepository, 'create').resolves();
    const versionAgnosticStub = sandbox.stub(EntitiesRepositoryFactory, 'versionAgnostic').returns(entitiesRepository);

    const closeAllByQueryStub = sandbox.stub(entitiesRepository, 'closeAllByQuery').callsArgWithAsync(1, expectedError);
    const closeOneByQueryStub = sandbox.stub(entitiesRepository, 'closeOneByQuery').callsArgWithAsync(1, expectedError);
    const latestExceptCurrentVersionStub = sandbox.stub(EntitiesRepositoryFactory, 'latestExceptCurrentVersion').returns(entitiesRepository);

    return updateService.updateEntities(originExternalContext, (error: string, externalContext: any) => {
      expect(error).to.not.exist;
      expect(externalContext).to.deep.equal(originExternalContext);

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

      sinon.assert.callCount(loggerDebugStub, expectedloggerDebugCallCount);
      sinon.assert.callOrder(
        loggerDebugStub.withArgs(sinon.match('Start process of entities update')),
        loggerDebugStub.withArgs(sinon.match('Removing batch of entities. Amount: '), 3),
        loggerDebugStub.withArgs(sinon.match('Closing entity by query: '), expectedQuery1),
        loggerDebugStub.withArgs(sinon.match('Closing entity by query: '), expectedQuery2),
        loggerDebugStub.withArgs(sinon.match('Closing entity by query: '), expectedQuery3),
        loggerDebugStub.withArgs(sinon.match('Saving batch of created entities. Amount: '), 3)
      );

      sinon.assert.calledThrice(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, sinon.match('Start creating entities').or(sinon.match('Start removing entities')).or(sinon.match('Start updating entities')));

      sinon.assert.calledThrice(loggerErrorStub);
      sinon.assert.calledWithExactly(loggerErrorStub, sinon.match('Entity was not closed, though it should be'), sinon.match.object, sinon.match.object);

      // *** createConcepts
      sinon.assert.calledOnce(versionAgnosticStub);
      sinon.assert.calledWithExactly(versionAgnosticStub);
      sinon.assert.calledOnce(createStub);
      sinon.assert.calledWith(createStub, expectedCreatedEntities);

      sinon.assert.calledOnce(latestExceptCurrentVersionStub);
      sinon.assert.calledWithExactly(latestExceptCurrentVersionStub, datasetId, version);

      sinon.assert.notCalled(closeAllByQueryStub);
      sinon.assert.callCount(closeOneByQueryStub, expectedCloseOneByQueryCallCount);
      sinon.assert.callOrder(
        closeOneByQueryStub.withArgs(expectedQuery1),
        closeOneByQueryStub.withArgs(expectedQuery2),
        closeOneByQueryStub.withArgs(expectedQuery3)
      );

      return done();
    });
  });

  it('should interrupt with error when entity was not found for closing', (done: Function) => {
    const originExternalContext = _.defaults({pathToDatasetDiff: path.resolve(__dirname, './fixtures/full-diff-entities.txt')}, externalContextFixture);
    const expectedError = 'Boo!';
    const expectedloggerDebugCallCount = 6;

    const loggerDebugStub = sandbox.stub(logger, 'debug');
    const loggerInfoStub = sandbox.stub(logger, 'info');
    const loggerErrorStub = sandbox.stub(logger, 'error');

    const createStub = sandbox.stub(entitiesRepository, 'create').resolves();
    const versionAgnosticStub = sandbox.stub(EntitiesRepositoryFactory, 'versionAgnostic').returns(entitiesRepository);

    const closeOneByQueryStub = sandbox.stub(entitiesRepository, 'closeOneByQuery').callsArgWithAsync(1, expectedError);
    const latestExceptCurrentVersionStub = sandbox.stub(EntitiesRepositoryFactory, 'latestExceptCurrentVersion').returns(entitiesRepository);

    return updateService.updateEntities(originExternalContext, (error: string, externalContext: any) => {
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

      expect(error).to.be.deep.equal([expectedError]);
      expect(externalContext).to.deep.equal(originExternalContext);

      sinon.assert.callCount(loggerDebugStub, expectedloggerDebugCallCount);
      sinon.assert.callOrder(
        loggerDebugStub.withArgs(sinon.match('Start process of entities update')),
        loggerDebugStub.withArgs(sinon.match('Removing batch of entities. Amount: '), 3),
        loggerDebugStub.withArgs(sinon.match('Closing entity by query: '), expectedQuery1),
        loggerDebugStub.withArgs(sinon.match('Closing entity by query: '), expectedQuery2),
        loggerDebugStub.withArgs(sinon.match('Closing entity by query: '), expectedQuery3),
        loggerDebugStub.withArgs(sinon.match('Saving batch of created entities. Amount: '), 3)
      );

      sinon.assert.calledThrice(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, sinon.match('Start creating entities').or(sinon.match('Start removing entities')).or(sinon.match('Start updating entities')));

      sinon.assert.notCalled(loggerErrorStub);

      // *** createConcepts
      sinon.assert.calledOnce(versionAgnosticStub);
      sinon.assert.calledWithExactly(versionAgnosticStub);
      sinon.assert.calledOnce(createStub);
      sinon.assert.calledWith(createStub, expectedCreatedEntities);

      sinon.assert.calledOnce(latestExceptCurrentVersionStub);
      sinon.assert.calledWithExactly(latestExceptCurrentVersionStub, datasetId, version);

      sinon.assert.calledThrice(closeOneByQueryStub);
      sinon.assert.callOrder(
        closeOneByQueryStub.withArgs(expectedQuery1),
        closeOneByQueryStub.withArgs(expectedQuery2),
        closeOneByQueryStub.withArgs(expectedQuery3)
      );

      return done();
    });
  });

  it('should log message when entity was closed without errors', (done: Function) => {
    const originExternalContext = _.defaults({pathToDatasetDiff: path.resolve(__dirname, './fixtures/full-diff-entities.txt')}, externalContextFixture);
    const expectedError = null;
    const expectedEntity = {_id: 'ENTITYID', originId: 'ENTITYID'};
    const expectedCloseOneByQueryCallCount = 3;
    const expectedloggerDebugCallCount = 9;

    const loggerDebugStub = sandbox.stub(logger, 'debug');
    const loggerInfoStub = sandbox.stub(logger, 'info');
    const loggerErrorStub = sandbox.stub(logger, 'error');

    const createStub = sandbox.stub(entitiesRepository, 'create').resolves();
    const versionAgnosticStub = sandbox.stub(EntitiesRepositoryFactory, 'versionAgnostic').returns(entitiesRepository);

    const closeOneByQueryStub = sandbox.stub(entitiesRepository, 'closeOneByQuery').callsArgWithAsync(1, expectedError, expectedEntity);
    const latestExceptCurrentVersionStub = sandbox.stub(EntitiesRepositoryFactory, 'latestExceptCurrentVersion').returns(entitiesRepository);

    return updateService.updateEntities(originExternalContext, (error: string, externalContext: any) => {
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

      expect(error).to.not.exist;
      expect(externalContext).to.deep.equal(originExternalContext);

      sinon.assert.callCount(loggerDebugStub, expectedloggerDebugCallCount);
      sinon.assert.callOrder(
        loggerDebugStub.withArgs(sinon.match('Start process of entities update')),
        loggerDebugStub.withArgs(sinon.match('Removing batch of entities. Amount: '), 3),
        loggerDebugStub.withArgs(sinon.match('Closing entity by query: '), expectedQuery1),
        loggerDebugStub.withArgs(sinon.match('Closing entity by query: '), expectedQuery2),
        loggerDebugStub.withArgs(sinon.match('Closing entity by query: '), expectedQuery3),
        loggerDebugStub.withArgs(sinon.match('Saving batch of created entities. Amount: '), 3),
        loggerDebugStub.withArgs(sinon.match('Entity was closed. OriginId: '), expectedEntity.originId),
        loggerDebugStub.withArgs(sinon.match('Entity was closed. OriginId: '), expectedEntity.originId),
        loggerDebugStub.withArgs(sinon.match('Entity was closed. OriginId: '), expectedEntity.originId)
      );

      sinon.assert.calledThrice(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, sinon.match('Start creating entities').or(sinon.match('Start removing entities')).or(sinon.match('Start updating entities')));

      sinon.assert.notCalled(loggerErrorStub);

      // *** createConcepts
      sinon.assert.calledOnce(versionAgnosticStub);
      sinon.assert.calledWithExactly(versionAgnosticStub);
      sinon.assert.calledOnce(createStub);
      sinon.assert.calledWith(createStub, expectedCreatedEntities);

      sinon.assert.calledOnce(latestExceptCurrentVersionStub);
      sinon.assert.calledWithExactly(latestExceptCurrentVersionStub, datasetId, version);

      sinon.assert.callCount(closeOneByQueryStub, expectedCloseOneByQueryCallCount);
      sinon.assert.callOrder(
        closeOneByQueryStub.withArgs(expectedQuery1),
        closeOneByQueryStub.withArgs(expectedQuery2),
        closeOneByQueryStub.withArgs(expectedQuery3)
      );

      return done();
    });
  });

  it('should update entities without errors', (done: Function) => {
    const originExternalContext = _.defaults({pathToDatasetDiff: path.resolve(__dirname, './fixtures/updated-entities.txt')}, externalContextFixture);
    const expectedEntity = {
      _id: 'ENTITYID',
      originId: 'ENTITYID',
      properties: {},
      sources: ['ddf--entities--company--company_scale.csv'],
      languages: {
        'nl-nl': {}
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

    const loggerDebugStub = sandbox.stub(logger, 'debug');
    const loggerInfoStub = sandbox.stub(logger, 'info');
    const loggerErrorStub = sandbox.stub(logger, 'error');

    const createStub = sandbox.stub(entitiesRepository, 'create').resolves();
    const versionAgnosticStub = sandbox.stub(EntitiesRepositoryFactory, 'versionAgnostic').returns(entitiesRepository);

    const closeOneByQueryStub = sandbox.stub(entitiesRepository, 'closeOneByQuery');
    closeOneByQueryStub.onFirstCall().callsArgWithAsync(1, null, expectedEntityGap);
    closeOneByQueryStub.onCall(1).callsArgWithAsync(1, null, expectedEntity);
    closeOneByQueryStub.onCall(2).callsArgWithAsync(1, null, expectedEntity);
    closeOneByQueryStub.onCall(3).callsArgWithAsync(1, null, expectedEntity);
    const latestExceptCurrentVersionStub = sandbox.stub(EntitiesRepositoryFactory, 'latestExceptCurrentVersion').returns(entitiesRepository);

    return updateService.updateEntities(originExternalContext, (error: string, externalContext: any) => {
      expect(error).to.not.exist;
      expect(externalContext).to.deep.equal(originExternalContext);

      const expectedQuery1 = {
        domain: 'DOMAINID',
        'properties.english_speaking': 'gap',
        sets: ['ENTITYSETID2'],
        sources: 'ddf--entities--company--english_speaking.csv'
      };
      const expectedQuery2 = {
        domain: 'ENTITYSETID3',
        'properties.region': 'america',
        sets: [],
        sources: 'ddf--entities--region.csv'
      };
      const expectedQuery3 = {
        domain: 'ENTITYSETID3',
        'properties.region': 'europe',
        sets: [],
        sources: 'ddf--entities--region.csv'
      };

      sinon.assert.callCount(loggerDebugStub, expectedloggerDebugCallCount);
      sinon.assert.callOrder(
        loggerDebugStub.withArgs(sinon.match('Start process of entities update')),
        loggerDebugStub.withArgs(sinon.match('Saving batch of created entities. Amount: '), 1),
        loggerDebugStub.withArgs(sinon.match('Updating batch of entities. Amount: '), 3),
        loggerDebugStub.withArgs(sinon.match('Closing entity by query: '), expectedQuery1),
        loggerDebugStub.withArgs(sinon.match('Closing entity by query: '), expectedQuery2),
        loggerDebugStub.withArgs(sinon.match('Closing entity by query: '), expectedQuery3),
        loggerDebugStub.withArgs(sinon.match('Entity was closed. OriginId: '), expectedEntity.originId),
        loggerDebugStub.withArgs(sinon.match('Creating updated entity based on its closed version')),
        loggerDebugStub.withArgs(sinon.match('Entity was closed. OriginId: '), expectedEntity.originId),
        loggerDebugStub.withArgs(sinon.match('Creating updated entity based on its closed version')),
        loggerDebugStub.withArgs(sinon.match('Entity was closed. OriginId: '), expectedEntity.originId),
        loggerDebugStub.withArgs(sinon.match('Creating updated entity based on its closed version'))
      );

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

      sinon.assert.callOrder(
        createStub.withArgs(sinon.match([expectedCreatedEntity1])),
        createStub.withArgs(sinon.match(expectedCreatedEntity2)),
        createStub.withArgs(sinon.match(expectedCreatedEntity3)),
        createStub.withArgs(sinon.match(expectedCreatedEntity4))
      );

      sinon.assert.calledOnce(latestExceptCurrentVersionStub);
      sinon.assert.calledWithExactly(latestExceptCurrentVersionStub, datasetId, version);

      sinon.assert.calledThrice(closeOneByQueryStub);
      sinon.assert.callOrder(
        closeOneByQueryStub.withArgs(sinon.match(expectedQuery1)),
        closeOneByQueryStub.withArgs(sinon.match(expectedQuery2)),
        closeOneByQueryStub.withArgs(sinon.match(expectedQuery3))
      );

      return done();
    });
  });

  it('should update entities with removed columns without errors', (done: Function) => {
    const originExternalContext = _.defaults({pathToDatasetDiff: path.resolve(__dirname, './fixtures/updated-entities-removed-columns.txt')}, externalContextFixture);
    const expectedEntity = {
      _id: 'ENTITYID',
      originId: 'ENTITYID',
      properties: {},
      sources: ['ddf--entities--company--company_scale.csv'],
      languages: {
        'nl-nl': {}
      }
    };
    const expectedEntityGap = _.extend({}, expectedEntity, {
      gid: 'gap',
      properties: {
        region: 'gap',
        'is--region': true,
        name: 'Gapminder'
      }
    });
    const expectedEntityGap2 = _.extend({}, expectedEntity, {
      gid: 'gap2',
      properties: {
        region: 'gap2',
        'is--region': true,
        name: 'Gapminder 2'
      }
    });
    const expectedloggerDebugCallCount = 7;
    const expectedVersionAgnosticCallCount = 2;

    const loggerDebugStub = sandbox.stub(logger, 'debug');
    const loggerInfoStub = sandbox.stub(logger, 'info');
    const loggerErrorStub = sandbox.stub(logger, 'error');

    const createStub = sandbox.stub(entitiesRepository, 'create').resolves();
    const versionAgnosticStub = sandbox.stub(EntitiesRepositoryFactory, 'versionAgnostic').returns(entitiesRepository);

    const closeOneByQueryStub = sandbox.stub(entitiesRepository, 'closeOneByQuery');
    closeOneByQueryStub.onFirstCall().callsArgWithAsync(1, null, expectedEntityGap);

    const closeAllByQueryStub = sandbox.stub(entitiesRepository, 'closeAllByQuery');
    closeAllByQueryStub.onFirstCall().callsArgWithAsync(1, null, [expectedEntityGap2]);
    const latestExceptCurrentVersionStub = sandbox.stub(EntitiesRepositoryFactory, 'latestExceptCurrentVersion').returns(entitiesRepository);

    return updateService.updateEntities(originExternalContext, (error: string, externalContext: any) => {
      expect(error).to.not.exist;
      expect(externalContext).to.deep.equal(originExternalContext);

      sinon.assert.callCount(loggerDebugStub, expectedloggerDebugCallCount);
      sinon.assert.callOrder(
        loggerDebugStub.withArgs(sinon.match('Start process of entities update')),
        loggerDebugStub.withArgs(sinon.match('Updating batch of entities. Amount: '), 1)
      );

      const expectedQuery1 = {
        domain: 'ENTITYSETID3',
        sets: [],
        'properties.region': 'america',
        sources: 'ddf--entities--region.csv'
      };

      sinon.assert.callOrder(
        loggerDebugStub.withArgs(sinon.match('Closing entity by query: '), expectedQuery1),
        loggerDebugStub.withArgs(sinon.match('Entity was closed. OriginId: '), 'ENTITYID'),
        loggerDebugStub.withArgs(sinon.match('Creating updated entity based on its closed version')),
        loggerDebugStub.withArgs(sinon.match('Detecting entities with removed columns. Amount: '), 2),
        loggerDebugStub.withArgs(sinon.match('Creating updated entity based on its closed version'))
      );

      sinon.assert.calledThrice(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, sinon.match('Start creating entities').or(sinon.match('Start removing entities')).or(sinon.match('Start updating entities')));
      sinon.assert.notCalled(loggerErrorStub);

      // *** createConcepts
      sinon.assert.callCount(versionAgnosticStub, expectedVersionAgnosticCallCount);
      sinon.assert.calledWithExactly(versionAgnosticStub);
      sinon.assert.callCount(createStub, expectedVersionAgnosticCallCount);

      const expectedCreatedEntity1 = {
        gid: 'gap',
        sources: [
          'ddf--entities--company--company_scale.csv',
          'ddf--entities--region.csv'
        ],
        properties: {
          region: 'gap',
          'is--region': 'true',
          name: 'Gapminder'
        },
        parsedProperties: {},
        originId: 'ENTITYID',
        languages: {
          'nl-nl': {}
        },
        domain: 'ENTITYSETID3',
        sets: [],
        from: 1111111,
        dataset: 'DATASETID'
      };
      const expectedCreatedEntity2 = {
        gid: 'gap2',
        sources: [
          'ddf--entities--company--company_scale.csv',
          'ddf--entities--region.csv'
        ],
        properties: {
          region: 'gap2',
          'is--region': 'true',
          name: 'Gapminder 2'
        },
        parsedProperties: {},
        originId: 'ENTITYID',
        languages: {
          'nl-nl': {}
        },
        domain: 'ENTITYSETID3',
        sets: [],
        from: 1111111,
        dataset: 'DATASETID'
      };

      sinon.assert.callOrder(
        createStub.withArgs(expectedCreatedEntity1),
        createStub.withArgs(expectedCreatedEntity2)
      );

      sinon.assert.calledTwice(latestExceptCurrentVersionStub);
      sinon.assert.calledWithExactly(latestExceptCurrentVersionStub, datasetId, version);

      sinon.assert.calledOnce(closeAllByQueryStub);

      const expectedQuery = {domain: 'ENTITYSETID3', sets: [], sources: 'ddf--entities--region.csv'};

      expect(closeAllByQueryStub.args[0][0]).to.be.deep.equal(expectedQuery);

      return done();
    });
  });
});
