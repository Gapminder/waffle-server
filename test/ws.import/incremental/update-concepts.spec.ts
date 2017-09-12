import '../../../ws.repository';
import {expect} from 'chai';
import * as hi from 'highland';
import * as _ from 'lodash';
import * as path from 'path';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import {logger} from '../../../ws.config/log';

import * as updateService from '../../../ws.import/incremental/update-concepts';
import {ConceptsRepositoryFactory} from '../../../ws.repository/ddf/concepts/concepts.repository';
import * as fileUtils from '../../../ws.utils/file';
import { constants } from '../../../ws.utils/constants';

const sandbox = sinonTest.configureTest(sinon);

const datasetId = 'DATASETID';
const version = 1111111;

const externalContextFixture: any = {
  dataset: {
    _id: datasetId
  },
  transaction: {
    _id: 'TRANSACTIONID',
    createdAt: version
  }
};

const conceptRepository = {
  closeById: _.noop,
  closeByGid: _.noop,
  create: _.noop,
  findAll: _.noop,
  findDistinctDrillups: _.noop,
  findDistinctDomains: _.noop,
  setDomainByGid: _.noop,
  addSubsetOfByGid: _.noop
};

const expectedCreatedConcepts = [
  {
    dataset: datasetId,
    domain: null,
    from: version,
    gid: 'company_scale',
    languages: {  },
    originId: null,
    properties: {
      additional_column: 'updated',
      concept: 'company_scale',
      concept_type: constants.CONCEPT_TYPE_ENTITY_SET,
      domain: 'company1',
      drill_up: ['foundation1']
    },
    subsetOf: [],
    title: undefined,
    to: 9007199254740991,
    type: constants.CONCEPT_TYPE_ENTITY_SET
  }, {
    dataset: datasetId,
    domain: null,
    from: version,
    gid: 'company_scale1',
    languages: {  },
    originId: null,
    properties: {
      additional_column: 'updated',
      concept: 'company_scale1',
      concept_type: constants.CONCEPT_TYPE_ENTITY_SET,
      domain: 'company',
      drill_up: ['foundation']
    },
    subsetOf: [],
    title: undefined,
    to: 9007199254740991,
    type: constants.CONCEPT_TYPE_ENTITY_SET
  }
];

describe('Update Concepts', function () {
  it('should create new and remove old concepts from fixture', sandbox(function (done: Function) {
    const originExternalContext = _.defaults({pathToDatasetDiff: path.resolve(__dirname, './fixtures/full-diff-concepts.txt')}, externalContextFixture);
    const expectedError = null;
    const expectedCloseByGidCallCount = 5;
    const expectedAllOpenedInGivenVersionCallCount = 8;

    const domain = {
      _id: 'DOMAINID',
      dataset: datasetId,
      domain: null,
      from: version - 1,
      gid: 'company',
      languages: {  },
      originId: 'AAA',
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
    const drillup = {
      _id: 'DRILLUPID',
      dataset: datasetId,
      domain: 'AAA',
      from: version - 1,
      gid: 'foundation',
      languages: {  },
      originId: 'BBB',
      properties: {
        concept: 'foundation',
        concept_type: constants.CONCEPT_TYPE_ENTITY_SET,
        domain: 'company',
        additional_column: ''
      },
      subsetOf: [],
      title: undefined,
      to: 9007199254740991,
      type: constants.CONCEPT_TYPE_ENTITY_SET
    };
    const expectedDrillups = [drillup.gid, 'foundation1'];
    const expectedDomains = [domain.gid, 'company1'];
    const expectedConcepts = [drillup, domain];

    const loggerStub = this.stub(logger, 'info');
    const closeByGidStub = this.stub(conceptRepository, 'closeByGid').callsArgWithAsync(1, expectedError);
    const createStub = this.stub(conceptRepository, 'create').callsArgWithAsync(1, expectedError);
    const findAllStub = this.stub(conceptRepository, 'findAll').callsArgWithAsync(0, expectedError, expectedConcepts);
    const findDistinctDrillupsStub = this.stub(conceptRepository, 'findDistinctDrillups').callsArgWithAsync(0, expectedError, expectedDrillups);
    const findDistinctDomainsStub = this.stub(conceptRepository, 'findDistinctDomains').callsArgWithAsync(0, expectedError, expectedDomains);
    const addSubsetOfByGidStub = this.stub(conceptRepository, 'addSubsetOfByGid').callsArgWithAsync(1, expectedError, expectedDrillups);
    const setDomainByGidStub = this.stub(conceptRepository, 'setDomainByGid').callsArgWithAsync(1, expectedError, expectedDomains);

    const latestExceptCurrentVersionStub = this.stub(ConceptsRepositoryFactory, 'latestExceptCurrentVersion').returns(conceptRepository);
    const versionAgnosticStub = this.stub(ConceptsRepositoryFactory, 'versionAgnostic').returns(conceptRepository);
    const allOpenedInGivenVersionStub = this.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns(conceptRepository);
    const latestVersionStub = this.stub(ConceptsRepositoryFactory, 'latestVersion').returns(conceptRepository);

    return updateService.updateConcepts(originExternalContext, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext).to.deep.equal(originExternalContext);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, 'start process of updating concepts');

      // *** processRemovedConcepts
      sinon.assert.calledTwice(latestExceptCurrentVersionStub);
      sinon.assert.calledWithExactly(latestExceptCurrentVersionStub, datasetId, version);

      sinon.assert.callCount(closeByGidStub, expectedCloseByGidCallCount);
      sinon.assert.calledWith(closeByGidStub, sinon.match('foundation').or(sinon.match('company_size')).or(sinon.match('num_users')));

      // *** createConcepts
      sinon.assert.calledOnce(versionAgnosticStub);
      sinon.assert.calledWithExactly(versionAgnosticStub);
      sinon.assert.calledOnce(createStub);
      sinon.assert.calledWith(createStub, expectedCreatedConcepts);

      // *** getAllConcepts
      sinon.assert.calledTwice(latestVersionStub);
      sinon.assert.calledWithExactly(latestVersionStub, datasetId, version);
      sinon.assert.calledTwice(findAllStub);

      // *** drillupsOfChangedConcepts && domainsOfChangedConcepts
      sinon.assert.callCount(allOpenedInGivenVersionStub, expectedAllOpenedInGivenVersionCallCount);
      sinon.assert.calledWithExactly(allOpenedInGivenVersionStub, datasetId, version);

      sinon.assert.calledTwice(findDistinctDrillupsStub);
      sinon.assert.calledTwice(findDistinctDomainsStub);

      sinon.assert.calledTwice(addSubsetOfByGidStub);
      sinon.assert.calledWith(addSubsetOfByGidStub, {gid: 'foundation', parentConceptId: 'BBB'});

      sinon.assert.calledTwice(setDomainByGidStub);
      sinon.assert.calledWith(setDomainByGidStub, {gid: 'company', domainConceptId: 'AAA'});

      return done();
    });
  }));

  it('should finish main updating process if there is no concepts in file', sandbox(function (done: Function) {
    const expectedError = null;
    const originExternalContext = _.defaults({
      pathToDatasetDiff: path.resolve(__dirname, './fixtures/empty-concepts.txt')
    }, externalContextFixture);
    const expectedAllOpenedInGivenVersionCallCount = 4;

    const loggerStub = this.stub(logger, 'info');

    const findAllStub = this.stub(conceptRepository, 'findAll').callsArgWithAsync(0, expectedError, []);
    const findDistinctDrillupsStub = this.stub(conceptRepository, 'findDistinctDrillups').callsArgWithAsync(0, expectedError, []);
    const findDistinctDomainsStub = this.stub(conceptRepository, 'findDistinctDomains').callsArgWithAsync(0, expectedError, []);

    const allOpenedInGivenVersionStub = this.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns(conceptRepository);
    const latestVersionStub = this.stub(ConceptsRepositoryFactory, 'latestVersion').returns(conceptRepository);

    return updateService.updateConcepts(originExternalContext, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext).to.be.deep.equal(originExternalContext);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, 'start process of updating concepts');

      sinon.assert.calledOnce(findAllStub);
      sinon.assert.calledOnce(findDistinctDrillupsStub);
      sinon.assert.calledOnce(findDistinctDomainsStub);

      sinon.assert.calledOnce(latestVersionStub);
      sinon.assert.calledWithExactly(latestVersionStub, datasetId, version);

      sinon.assert.callCount(allOpenedInGivenVersionStub, expectedAllOpenedInGivenVersionCallCount);
      sinon.assert.calledWithExactly(allOpenedInGivenVersionStub, datasetId, version);

      return done();
    });
  }));

  it('should interrupt preliminary process if error happens during reading test file by line as json stream', sandbox(function (done: Function) {
    const originExternalContext = _.defaults({pathToDatasetDiff: path.resolve(__dirname, './fixtures/full-diff-concepts.txt')}, externalContextFixture);
    const expectedError = new Error('Boo!');

    const loggerStub = this.stub(logger, 'info');
    const fileUtilsStub = this.stub(fileUtils, 'readTextFileByLineAsJsonStream').returns(hi.fromError(expectedError));

    return updateService.updateConcepts(originExternalContext, (error) => {
      expect(error).to.be.equal(expectedError);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, 'start process of updating concepts');

      sinon.assert.calledOnce(fileUtilsStub);
      sinon.assert.calledWith(fileUtilsStub, originExternalContext.pathToDatasetDiff);

      return done();
    });
  }));

  it('should interrupt removing concepts process if error happens during closing concept', sandbox(function (done: Function) {
    const originExternalContext = _.defaults({pathToDatasetDiff: path.resolve(__dirname, './fixtures/full-diff-concepts.txt')}, externalContextFixture);
    const expectedError = new Error('Boo!');

    const loggerStub = this.stub(logger, 'info');

    const closeByGidStub = this.stub(conceptRepository, 'closeByGid').callsArgWithAsync(1, expectedError);
    const latestExceptCurrentVersionStub = this.stub(ConceptsRepositoryFactory, 'latestExceptCurrentVersion').returns(conceptRepository);

    return updateService.updateConcepts(originExternalContext, (error) => {
      expect(error).to.be.equal(expectedError);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, 'start process of updating concepts');

      sinon.assert.calledOnce(latestExceptCurrentVersionStub);
      sinon.assert.calledWith(latestExceptCurrentVersionStub, datasetId, version);
      sinon.assert.calledThrice(closeByGidStub);
      sinon.assert.calledWith(closeByGidStub, sinon.match('foundation').or(sinon.match('company_size')).or(sinon.match('num_users')));

      return done();
    });
  }));

  it('should interrupt creating concepts process when trying create concept with duplicated gid', sandbox(function (done: Function) {
    const originExternalContext = _.defaults({
      pathToDatasetDiff: path.resolve(__dirname, './fixtures/create-duplicated-concepts.txt')
    }, externalContextFixture);
    const expectedError = 'All concept gid\'s should be unique within the dataset!';

    const loggerStub = this.stub(logger, 'info');
    const closeByGidStub = this.stub(conceptRepository, 'closeByGid').callsArgWithAsync(1, expectedError);
    const latestExceptCurrentVersionStub = this.stub(ConceptsRepositoryFactory, 'latestExceptCurrentVersion').returns(conceptRepository);
    const createStub = this.stub(conceptRepository, 'create').callsArgWithAsync(1, expectedError);
    const versionAgnosticStub = this.stub(ConceptsRepositoryFactory, 'versionAgnostic').returns(conceptRepository);

    return updateService.updateConcepts(originExternalContext, (error) => {
      expect(error).to.be.equal(expectedError);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, 'start process of updating concepts');

      sinon.assert.notCalled(latestExceptCurrentVersionStub);
      sinon.assert.notCalled(closeByGidStub);
      sinon.assert.notCalled(versionAgnosticStub);
      sinon.assert.notCalled(createStub);

      return done();
    });
  }));

  it('should interrupt updating concepts process if error happens during searching drillups', sandbox(function(done: Function) {
    const originExternalContext = _.defaults({
      pathToDatasetDiff: path.resolve(__dirname, './fixtures/changed-concepts.txt')
    }, externalContextFixture);
    const expectedError = 'Boo!';

    const loggerStub = this.stub(logger, 'info');

    const findAllStub = this.stub(conceptRepository, 'findAll').callsArgWithAsync(0, null, []);
    const findDistinctDrillupsStub = this.stub(conceptRepository, 'findDistinctDrillups').callsArgWithAsync(0, expectedError);
    const findDistinctDomainsStub = this.stub(conceptRepository, 'findDistinctDomains').callsArgWithAsync(0, expectedError);

    const allOpenedInGivenVersionStub = this.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns(conceptRepository);
    const latestVersionStub = this.stub(ConceptsRepositoryFactory, 'latestVersion').returns(conceptRepository);

    return updateService.updateConcepts(originExternalContext, (error) => {
      expect(error).to.be.equal(expectedError);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, 'start process of updating concepts');

      sinon.assert.calledOnce(allOpenedInGivenVersionStub);
      sinon.assert.calledWithExactly(allOpenedInGivenVersionStub, datasetId, version);

      sinon.assert.calledOnce(latestVersionStub);
      sinon.assert.calledWithExactly(latestVersionStub, datasetId, version);

      sinon.assert.calledOnce(findAllStub);
      sinon.assert.calledOnce(findDistinctDrillupsStub);
      sinon.assert.notCalled(findDistinctDomainsStub);

      return done();
    });
  }));

  it('should interrupt updating concepts process if error happens during searching domains', sandbox(function(done: Function) {
    const originExternalContext = _.defaults({
      pathToDatasetDiff: path.resolve(__dirname, './fixtures/changed-concepts.txt')
    }, externalContextFixture);
    const expectedError = 'Boo!';

    const loggerStub = this.stub(logger, 'info');

    const findAllStub = this.stub(conceptRepository, 'findAll').callsArgWithAsync(0, null, []);
    const findDistinctDrillupsStub = this.stub(conceptRepository, 'findDistinctDrillups').callsArgWithAsync(0, null);
    const findDistinctDomainsStub = this.stub(conceptRepository, 'findDistinctDomains').callsArgWithAsync(0, expectedError);

    const allOpenedInGivenVersionStub = this.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns(conceptRepository);
    const latestVersionStub = this.stub(ConceptsRepositoryFactory, 'latestVersion').returns(conceptRepository);

    return updateService.updateConcepts(originExternalContext, (error) => {
      expect(error).to.be.equal(expectedError);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, 'start process of updating concepts');

      sinon.assert.calledThrice(allOpenedInGivenVersionStub);
      sinon.assert.calledWithExactly(allOpenedInGivenVersionStub, datasetId, version);

      sinon.assert.calledOnce(latestVersionStub);
      sinon.assert.calledWithExactly(latestVersionStub, datasetId, version);

      sinon.assert.calledOnce(findAllStub);
      sinon.assert.calledOnce(findDistinctDrillupsStub);
      sinon.assert.calledOnce(findDistinctDomainsStub);

      return done();
    });
  }));

  it('should interrupt updating concepts process if error happens during closing concepts in applying changes to concept flow', sandbox(function(done: Function) {
    const originExternalContext = _.defaults({
      pathToDatasetDiff: path.resolve(__dirname, './fixtures/changed-concepts.txt')
    }, externalContextFixture);
    const expectedError = 'Boo!';
    const expectedAllOpenedInGivenVersionCallCount = 4;

    const loggerStub = this.stub(logger, 'info');

    const findAllStub = this.stub(conceptRepository, 'findAll').callsArgWithAsync(0, null, []);
    const findDistinctDrillupsStub = this.stub(conceptRepository, 'findDistinctDrillups').callsArgWithAsync(0, null);
    const findDistinctDomainsStub = this.stub(conceptRepository, 'findDistinctDomains').callsArgWithAsync(0, null);
    const closeByGidStub = this.stub(conceptRepository, 'closeByGid').callsArgWithAsync(1, expectedError);

    const allOpenedInGivenVersionStub = this.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns(conceptRepository);
    const latestVersionStub = this.stub(ConceptsRepositoryFactory, 'latestVersion').returns(conceptRepository);
    const latestExceptCurrentVersionStub = this.stub(ConceptsRepositoryFactory, 'latestExceptCurrentVersion').returns(conceptRepository);

    return updateService.updateConcepts(originExternalContext, (error) => {
      expect(error).to.be.equal(expectedError);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, 'start process of updating concepts');

      sinon.assert.callCount(allOpenedInGivenVersionStub, expectedAllOpenedInGivenVersionCallCount);
      sinon.assert.calledWithExactly(allOpenedInGivenVersionStub, datasetId, version);

      sinon.assert.calledOnce(latestVersionStub);
      sinon.assert.calledWithExactly(latestVersionStub, datasetId, version);

      sinon.assert.calledOnce(latestExceptCurrentVersionStub);
      sinon.assert.calledWithExactly(latestExceptCurrentVersionStub, datasetId, version);

      sinon.assert.calledOnce(findAllStub);
      sinon.assert.calledOnce(findDistinctDrillupsStub);
      sinon.assert.calledOnce(findDistinctDomainsStub);

      sinon.assert.calledThrice(closeByGidStub);
      sinon.assert.calledWith(closeByGidStub, sinon.match('foundation').or(sinon.match('company')).or(sinon.match('time')));

      return done();
    });
  }));

  it('should log warn message if no concept was found during closing original concept in applying changes to concept flow', sandbox(function(done: Function) {
    const originExternalContext = _.defaults({
      pathToDatasetDiff: path.resolve(__dirname, './fixtures/changed-concepts.txt')
    }, externalContextFixture);
    const expectedAllOpenedInGivenVersionCallCount = 8;

    const loggerInfoStub = this.stub(logger, 'info');
    const loggerDebugStub = this.stub(logger, 'debug');

    const findAllStub = this.stub(conceptRepository, 'findAll').callsArgWithAsync(0, null, []);
    const findDistinctDrillupsStub = this.stub(conceptRepository, 'findDistinctDrillups').callsArgWithAsync(0, null);
    const findDistinctDomainsStub = this.stub(conceptRepository, 'findDistinctDomains').callsArgWithAsync(0, null);
    const closeByGidStub = this.stub(conceptRepository, 'closeByGid').callsArgWithAsync(1, null, null);

    const allOpenedInGivenVersionStub = this.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns(conceptRepository);
    const latestVersionStub = this.stub(ConceptsRepositoryFactory, 'latestVersion').returns(conceptRepository);
    const latestExceptCurrentVersionStub = this.stub(ConceptsRepositoryFactory, 'latestExceptCurrentVersion').returns(conceptRepository);

    return updateService.updateConcepts(originExternalContext, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext).to.deep.equal(originExternalContext);

      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, 'start process of updating concepts');
      sinon.assert.calledThrice(loggerDebugStub);
      sinon.assert.calledWithExactly(loggerDebugStub, sinon.match(`There is no original concept with gid 'foundation' in db`).or(sinon.match(`There is no original concept with gid 'company' in db`)));

      sinon.assert.callCount(allOpenedInGivenVersionStub, expectedAllOpenedInGivenVersionCallCount);
      sinon.assert.calledWithExactly(allOpenedInGivenVersionStub, datasetId, version);

      sinon.assert.calledTwice(latestVersionStub);
      sinon.assert.calledWithExactly(latestVersionStub, datasetId, version);

      sinon.assert.calledOnce(latestExceptCurrentVersionStub);
      sinon.assert.calledWithExactly(latestExceptCurrentVersionStub, datasetId, version);

      sinon.assert.calledTwice(findAllStub);
      sinon.assert.calledTwice(findDistinctDrillupsStub);
      sinon.assert.calledTwice(findDistinctDomainsStub);

      sinon.assert.calledThrice(closeByGidStub);
      sinon.assert.calledWith(closeByGidStub, sinon.match('foundation').or(sinon.match('company')).or(sinon.match('time')));

      return done();
    });
  }));

  it('should create new concepts versions during applying changes to concept flow', sandbox(function(done: Function) {
    const originExternalContext = _.defaults({
      pathToDatasetDiff: path.resolve(__dirname, './fixtures/changed-concepts.txt')
    }, externalContextFixture);
    const expectedAllOpenedInGivenVersionCallCount = 8;

    const time = {
      _id: 'TIMEID',
      dataset: datasetId,
      domain: null,
      from: version - 1,
      gid: 'company',
      languages: {  },
      originId: 'CCC',
      properties: {
        concept: 'company',
        concept_type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
        domain: null,
        additional_column: ''
      },
      subsetOf: [],
      title: undefined,
      to: version,
      type: constants.CONCEPT_TYPE_ENTITY_DOMAIN
    };
    const domain = {
      _id: 'DOMAINID',
      dataset: datasetId,
      domain: null,
      from: version - 1,
      gid: 'company',
      languages: {  },
      originId: 'AAA',
      properties: {
        concept: 'company',
        concept_type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
        domain: null,
        additional_column: ''
      },
      subsetOf: [],
      title: undefined,
      to: version,
      type: constants.CONCEPT_TYPE_ENTITY_DOMAIN
    };
    const drillup = {
      _id: 'DRILLUPID',
      dataset: datasetId,
      domain: 'AAA',
      from: version - 1,
      gid: 'foundation',
      languages: {  },
      originId: 'BBB',
      properties: {
        concept: 'foundation',
        concept_type: constants.CONCEPT_TYPE_ENTITY_SET,
        domain: 'company',
        additional_column: ''
      },
      subsetOf: [],
      title: undefined,
      to: version,
      type: constants.CONCEPT_TYPE_ENTITY_SET
    };

    const expectedConcepts = [drillup, domain, time];

    const expectedUpdatedDrillup = {
      dataset: 'DATASETID',
      from: 1111111,
      gid: 'foundation1',
      languages: {},
      originId: 'BBB',
      properties: {
        additional_column: null,
        concept: 'foundation1',
        concept_type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
        domain: null
      },
      title: undefined,
      to: 9007199254740991,
      type: constants.CONCEPT_TYPE_ENTITY_DOMAIN
    };
    const expectedUpdatedDomain = {
      dataset: 'DATASETID',
      from: 1111111,
      gid: 'company',
      languages: {},
      originId: 'AAA',
      properties: {
        additional_column: null,
        concept: 'company',
        concept_type: constants.CONCEPT_TYPE_ENTITY_SET,
        domain: 'foundation1',
        subsetOf: null,
        drill_up: ['foundation1']
      },
      title: undefined,
      to: 9007199254740991,
      type: constants.CONCEPT_TYPE_ENTITY_SET
    };
    const expectedUpdatedTime = {
      dataset: 'DATASETID',
      from: 1111111,
      gid: 'time',
      languages: {},
      originId: 'CCC',
      properties: {
        additional_column: '{}',
        concept: 'time',
        concept_type: 'time',
        domain: null
      },
      title: undefined,
      to: 9007199254740991,
      type: constants.CONCEPT_TYPE_ENTITY_DOMAIN
    };

    const loggerInfoStub = this.stub(logger, 'info');

    const findAllStub = this.stub(conceptRepository, 'findAll').callsArgWithAsync(0, null, expectedConcepts);
    const findDistinctDrillupsStub = this.stub(conceptRepository, 'findDistinctDrillups').callsArgWithAsync(0, null);
    const findDistinctDomainsStub = this.stub(conceptRepository, 'findDistinctDomains').callsArgWithAsync(0, null);

    const closeByGidStub = this.stub(conceptRepository, 'closeByGid');
    closeByGidStub.onFirstCall().callsArgWithAsync(1, null, drillup);
    closeByGidStub.onSecondCall().callsArgWithAsync(1, null, domain);
    closeByGidStub.onThirdCall().callsArgWithAsync(1, null, time);

    const createStub = this.stub(conceptRepository, 'create').callsArgWithAsync(1, null);

    const allOpenedInGivenVersionStub = this.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns(conceptRepository);
    const latestVersionStub = this.stub(ConceptsRepositoryFactory, 'latestVersion').returns(conceptRepository);
    const latestExceptCurrentVersionStub = this.stub(ConceptsRepositoryFactory, 'latestExceptCurrentVersion').returns(conceptRepository);

    return updateService.updateConcepts(originExternalContext, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext).to.deep.equal(originExternalContext);

      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, 'start process of updating concepts');

      sinon.assert.callCount(allOpenedInGivenVersionStub, expectedAllOpenedInGivenVersionCallCount);
      sinon.assert.calledWithExactly(allOpenedInGivenVersionStub, datasetId, version);

      sinon.assert.calledTwice(latestVersionStub);
      sinon.assert.calledWithExactly(latestVersionStub, datasetId, version);

      sinon.assert.calledOnce(latestExceptCurrentVersionStub);
      sinon.assert.calledWithExactly(latestExceptCurrentVersionStub, datasetId, version);

      sinon.assert.calledTwice(findAllStub);
      sinon.assert.calledTwice(findDistinctDrillupsStub);
      sinon.assert.calledTwice(findDistinctDomainsStub);

      sinon.assert.calledThrice(closeByGidStub);
      sinon.assert.calledWith(closeByGidStub, sinon.match('foundation').or(sinon.match('company')));

      sinon.assert.calledThrice(createStub);
      expect(createStub.args[0][0]).to.be.deep.equal(expectedUpdatedDrillup);
      expect(createStub.args[1][0]).to.be.deep.equal(expectedUpdatedDomain);
      expect(createStub.args[2][0]).to.be.deep.equal(expectedUpdatedTime);

      return done();
    });
  }));

  it('should interrupt updating concepts process if error happens during finding all concepts in applying updates to concept flow', sandbox(function(done: Function) {
    const originExternalContext = _.defaults({
      pathToDatasetDiff: path.resolve(__dirname, './fixtures/updated-concepts.txt')
    }, externalContextFixture);
    const expectedError = 'Boo!';
    const expectedAllOpenedInGivenVersionCallCount = 4;

    const loggerStub = this.stub(logger, 'info');

    const findAllStub = this.stub(conceptRepository, 'findAll');
    findAllStub.onFirstCall().callsArgWithAsync(0, null, []);
    findAllStub.onSecondCall().callsArgWithAsync(0, expectedError, []);
    const findDistinctDrillupsStub = this.stub(conceptRepository, 'findDistinctDrillups').callsArgWithAsync(0, null);
    const findDistinctDomainsStub = this.stub(conceptRepository, 'findDistinctDomains').callsArgWithAsync(0, null);
    const closeByGidStub = this.stub(conceptRepository, 'closeByGid').callsArgWithAsync(1, null);

    const allOpenedInGivenVersionStub = this.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns(conceptRepository);
    const latestVersionStub = this.stub(ConceptsRepositoryFactory, 'latestVersion').returns(conceptRepository);
    const latestExceptCurrentVersionStub = this.stub(ConceptsRepositoryFactory, 'latestExceptCurrentVersion').returns(conceptRepository);

    return updateService.updateConcepts(originExternalContext, (error, externalContext) => {
      expect(error).to.be.equal(expectedError);
      expect(externalContext).to.be.equal(originExternalContext);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, 'start process of updating concepts');

      sinon.assert.callCount(allOpenedInGivenVersionStub, expectedAllOpenedInGivenVersionCallCount);
      sinon.assert.calledWithExactly(allOpenedInGivenVersionStub, datasetId, version);

      sinon.assert.calledOnce(latestVersionStub);
      sinon.assert.calledWithExactly(latestVersionStub, datasetId, version);

      sinon.assert.calledOnce(latestExceptCurrentVersionStub);
      sinon.assert.calledWithExactly(latestExceptCurrentVersionStub, datasetId, version);

      sinon.assert.calledTwice(findAllStub);
      sinon.assert.calledOnce(findDistinctDrillupsStub);
      sinon.assert.calledOnce(findDistinctDomainsStub);

      sinon.assert.notCalled(closeByGidStub);

      return done();
    });
  }));

  it('should interrupt updating concepts process if error happens during closing concepts in applying updates to concept flow', sandbox(function(done: Function) {
    const originExternalContext = _.defaults({
      pathToDatasetDiff: path.resolve(__dirname, './fixtures/only-columns-removed-concepts.txt')
    }, externalContextFixture);
    const expectedError = 'Boo!';
    const expectedAllOpenedInGivenVersionCallCount = 4;

    const domain = {
      _id: 'DOMAINID',
      dataset: datasetId,
      domain: null,
      from: version - 1,
      gid: 'company',
      languages: {  },
      originId: 'AAA',
      properties: {
        concept: 'company',
        concept_type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
        domain: null,
        additional_column: ''
      },
      subsetOf: [],
      title: undefined,
      to: 9007199254740991,
      type: constants.CONCEPT_TYPE_ENTITY_DOMAIN
    };
    const drillup = {
      _id: 'DRILLUPID',
      dataset: datasetId,
      domain: 'AAA',
      from: version - 1,
      gid: 'foundation',
      languages: {  },
      originId: 'BBB',
      properties: {
        concept: 'foundation',
        concept_type: constants.CONCEPT_TYPE_ENTITY_SET,
        domain: 'company',
        additional_column: ''
      },
      subsetOf: [],
      title: undefined,
      to: 9007199254740991,
      type: constants.CONCEPT_TYPE_ENTITY_SET
    };
    const expectedConcepts = [drillup, domain];
    const expectedUpdatedConcepts = [];

    const loggerStub = this.stub(logger, 'info');

    const createStub = this.stub(conceptRepository, 'create').callsArgWithAsync(1, null);
    const findAllStub = this.stub(conceptRepository, 'findAll').callsArgWithAsync(0, null, expectedConcepts);
    const latestExceptCurrentVersionStub = this.stub(ConceptsRepositoryFactory, 'latestExceptCurrentVersion').returns(conceptRepository);

    const findDistinctDrillupsStub = this.stub(conceptRepository, 'findDistinctDrillups').callsArgWithAsync(0, null, []);
    const addSubsetOfByGidStub = this.stub(conceptRepository, 'addSubsetOfByGid').callsArgWithAsync(1, null, []);

    const findDistinctDomainsStub = this.stub(conceptRepository, 'findDistinctDomains').callsArgWithAsync(0, null, []);
    const setDomainByGidStub = this.stub(conceptRepository, 'setDomainByGid').callsArgWithAsync(1, null, []);

    const closeByIdStub = this.stub(conceptRepository, 'closeById').callsArgWithAsync(1, expectedError);

    const latestVersionStub = this.stub(ConceptsRepositoryFactory, 'latestVersion').returns(conceptRepository);
    const allOpenedInGivenVersionStub = this.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns(conceptRepository);

    return updateService.updateConcepts(originExternalContext, (error, externalContext) => {
      expect(error).to.be.equal(expectedError);
      expect(externalContext).to.be.equal(originExternalContext);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, 'start process of updating concepts');

      sinon.assert.calledOnce(latestExceptCurrentVersionStub);
      sinon.assert.calledWithExactly(latestExceptCurrentVersionStub, datasetId, version);

      sinon.assert.calledOnce(latestVersionStub);
      sinon.assert.calledWithExactly(latestVersionStub, datasetId, version);
      sinon.assert.calledTwice(findAllStub);

      sinon.assert.callCount(allOpenedInGivenVersionStub, expectedAllOpenedInGivenVersionCallCount);
      sinon.assert.calledWithExactly(allOpenedInGivenVersionStub, datasetId, version);

      sinon.assert.calledOnce(findDistinctDrillupsStub);
      sinon.assert.calledOnce(findDistinctDomainsStub);

      sinon.assert.notCalled(addSubsetOfByGidStub);
      sinon.assert.notCalled(setDomainByGidStub);

      sinon.assert.calledTwice(closeByIdStub);
      sinon.assert.calledWith(closeByIdStub, sinon.match('DOMAINID').or(sinon.match('DRILLUPID')));
      sinon.assert.notCalled(createStub);

      return done();
    });
  }));

  it('should finish main updating process when concept changes were apllied successfully', sandbox(function(done: Function) {
    const originExternalContext = _.defaults({
      pathToDatasetDiff: path.resolve(__dirname, './fixtures/only-columns-removed-concepts.txt')
    }, externalContextFixture);
    const expectedAllOpenedInGivenVersionCallCount = 8;

    const domain = {
      _id: 'DOMAINID',
      dataset: datasetId,
      domain: null,
      from: version - 1,
      gid: 'company',
      languages: {  },
      originId: 'AAA',
      properties: {
        concept: 'company',
        concept_type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
        domain: null,
        additional_column: ''
      },
      subsetOf: [],
      title: undefined,
      to: version,
      type: constants.CONCEPT_TYPE_ENTITY_DOMAIN
    };
    const drillup = {
      _id: 'DRILLUPID',
      dataset: datasetId,
      domain: 'AAA',
      from: version - 1,
      gid: 'foundation',
      languages: {  },
      originId: 'BBB',
      properties: {
        concept: 'foundation',
        concept_type: constants.CONCEPT_TYPE_ENTITY_SET,
        domain: 'company',
        additional_column: ''
      },
      subsetOf: [],
      title: undefined,
      to: version,
      type: constants.CONCEPT_TYPE_ENTITY_SET
    };

    const expectedConcepts = [drillup, domain];

    const expectedUpdatedDrillup = {
      dataset: 'DATASETID',
      from: 1111111,
      gid: 'foundation',
      languages: {},
      originId: 'BBB',
      properties: {
        concept: 'foundation',
        concept_type: constants.CONCEPT_TYPE_ENTITY_SET,
        domain: 'company'
      },
      title: undefined,
      to: 9007199254740991,
      type: constants.CONCEPT_TYPE_ENTITY_SET
    };
    const expectedUpdatedDomain = {
      dataset: 'DATASETID',
      from: 1111111,
      gid: 'company',
      languages: {},
      originId: 'AAA',
      properties: {
        concept: 'company',
        concept_type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
        domain: null
      },
      title: undefined,
      to: 9007199254740991,
      type: constants.CONCEPT_TYPE_ENTITY_DOMAIN
    };

    const loggerStub = this.stub(logger, 'info');

    const createStub = this.stub(conceptRepository, 'create').callsArgWithAsync(1, null);
    const findAllStub = this.stub(conceptRepository, 'findAll').callsArgWithAsync(0, null, expectedConcepts);
    const latestExceptCurrentVersionStub = this.stub(ConceptsRepositoryFactory, 'latestExceptCurrentVersion').returns(conceptRepository);

    const findDistinctDrillupsStub = this.stub(conceptRepository, 'findDistinctDrillups').callsArgWithAsync(0, null, []);
    const addSubsetOfByGidStub = this.stub(conceptRepository, 'addSubsetOfByGid').callsArgWithAsync(1, null, []);

    const findDistinctDomainsStub = this.stub(conceptRepository, 'findDistinctDomains').callsArgWithAsync(0, null, []);
    const setDomainByGidStub = this.stub(conceptRepository, 'setDomainByGid').callsArgWithAsync(1, null, []);

    const closeByIdStub = this.stub(conceptRepository, 'closeById');
    closeByIdStub.onFirstCall().callsArgWithAsync(1, null, drillup);
    closeByIdStub.onSecondCall().callsArgWithAsync(1, null, domain);

    const latestVersionStub = this.stub(ConceptsRepositoryFactory, 'latestVersion').returns(conceptRepository);
    const allOpenedInGivenVersionStub = this.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns(conceptRepository);

    return updateService.updateConcepts(originExternalContext, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext).to.be.equal(originExternalContext);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithExactly(loggerStub, 'start process of updating concepts');

      sinon.assert.calledOnce(latestExceptCurrentVersionStub);
      sinon.assert.calledWithExactly(latestExceptCurrentVersionStub, datasetId, version);

      sinon.assert.calledTwice(latestVersionStub);
      sinon.assert.calledWithExactly(latestVersionStub, datasetId, version);
      sinon.assert.calledThrice(findAllStub);

      sinon.assert.callCount(allOpenedInGivenVersionStub, expectedAllOpenedInGivenVersionCallCount);
      sinon.assert.calledWithExactly(allOpenedInGivenVersionStub, datasetId, version);

      sinon.assert.calledTwice(findDistinctDrillupsStub);
      sinon.assert.calledTwice(findDistinctDomainsStub);

      sinon.assert.notCalled(addSubsetOfByGidStub);
      sinon.assert.notCalled(setDomainByGidStub);

      sinon.assert.calledTwice(closeByIdStub);
      sinon.assert.calledWith(closeByIdStub, sinon.match('DOMAINID').or(sinon.match('DRILLUPID')).or(sinon.match('TIMEID')));

      sinon.assert.calledTwice(createStub);
      expect(createStub.args[0][0]).to.be.deep.equal(expectedUpdatedDrillup);
      expect(createStub.args[1][0]).to.be.deep.equal(expectedUpdatedDomain);

      return done();
    });
  }));
});
