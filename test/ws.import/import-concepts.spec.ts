import '../../ws.repository/';

import * as hi from 'highland';
import * as _ from 'lodash';
import * as sinon from 'sinon';
import { expect } from 'chai';

import { logger } from '../../ws.config/log';
import * as ddfImportUtils from '../../ws.import/utils/import-ddf.utils';
import * as fileUtils from '../../ws.utils/file';
import * as ddfMappers from '../../ws.import/utils/ddf-mappers';
import { ConceptsRepositoryFactory } from '../../ws.repository/ddf/concepts/concepts.repository';
import { createConcepts } from '../../ws.import/import-concepts';
import { constants } from '../../ws.utils/constants';

const sandbox = sinon.createSandbox();

const conceptsResource = {
  path: 'ddf--concepts.csv',
  type: constants.CONCEPTS,
  primaryKey: ['concept']
};

const datapackageStub = {
  name: 'ddf--ws-testing',
  title: 'ddf--ws-testing',
  description: '',
  version: '0.0.1',
  language: {
    id: 'en',
    name: 'English'
  },
  translations: [
    {
      id: 'nl-nl',
      name: 'nl-nl'
    }
  ],
  license: '',
  author: '',
  resources: [
    conceptsResource
  ]
};

describe('Import ddf concepts', () => {

  afterEach(() => sandbox.restore());

  it('should import concepts', (done: Function) => {
    const rawConcept = {
      concept: 'company',
      name: 'Company',
      concept_type: 'entity_domain',
      domain: ''
    };

    const context = {
      pathToDdfFolder: 'some/path',
      transaction: {
        _id: 'txId',
        createdAt: 1111111
      },
      dataset: {
        _id: 'datasetId'
      },
      datapackage: datapackageStub
    };

    const expectedConceptToCreate = {
      dataset: 'datasetId',
      domain: null,
      from: 1111111,
      gid: 'company',
      languages: {},
      originId: null,
      properties: { concept: 'company', name: 'Company', concept_type: 'entity_domain', domain: null },
      sources: ['ddf--concepts.csv'],
      subsetOf: [],
      title: 'Company',
      to: 9007199254740991,
      type: 'entity_domain'
    };

    const readCsvFileAsStreamStub = sandbox.stub(fileUtils, 'readCsvFileAsStream').returns(hi([rawConcept]));
    const conceptMapperStub = sandbox.spy(ddfMappers, 'mapDdfConceptsToWsModel');

    const conceptCreateStub = sandbox.stub().callsArgWithAsync(1, null);
    sandbox.stub(ConceptsRepositoryFactory, 'versionAgnostic').returns({ create: conceptCreateStub });

    const getAllConceptsStub = sandbox.stub(ddfImportUtils, 'getAllConcepts').callsFake((externalContext, done) => {
      externalContext.concepts = { company: {}, year: {} };
      externalContext.timeConcepts = { year: {} };
      done(null, externalContext);
    });

    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'warn');

    createConcepts(context, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext).to.deep.equal({
        pathToDdfFolder: 'some/path',
        transaction: {
          _id: 'txId',
          createdAt: 1111111
        },
        dataset: {
          _id: 'datasetId'
        },
        datapackage: datapackageStub,
        concepts: { company: {}, year: {} },
        timeConcepts: { year: {} }
      });

      sinon.assert.calledOnce(readCsvFileAsStreamStub);
      sinon.assert.calledWith(readCsvFileAsStreamStub, context.pathToDdfFolder, conceptsResource.path);

      sinon.assert.calledOnce(conceptMapperStub);
      sinon.assert.calledWith(conceptMapperStub, rawConcept, {
        datasetId: context.dataset._id,
        version: context.transaction.createdAt,
        filename: conceptsResource.path
      });

      sinon.assert.calledOnce(conceptCreateStub);
      sinon.assert.calledWithExactly(conceptCreateStub, [expectedConceptToCreate], sinon.match.func);

      sinon.assert.calledTwice(getAllConceptsStub);

      done();
    });
  });

  it('should not import concepts: error raised on csv file reading', (done: Function) => {
    const context = {
      pathToDdfFolder: 'some/path',
      transaction: {
        _id: 'txId',
        createdAt: 1111111
      },
      dataset: {
        _id: 'datasetId'
      },
      datapackage: datapackageStub
    };

    const expectedError = 'Error while csv reading';
    sandbox.stub(fileUtils, 'readCsvFileAsStream').returns(hi(Promise.reject(expectedError)));

    const conceptCreateStub = sandbox.stub().callsArgWithAsync(1, null);
    sandbox.stub(ConceptsRepositoryFactory, 'versionAgnostic').returns({ create: conceptCreateStub });
    sandbox.stub(logger, 'info');

    createConcepts(context, (error) => {
      expect(error).to.equal(expectedError);

      sinon.assert.notCalled(conceptCreateStub);
      done();
    });
  });

  it('should import concepts: error raised when concept was being saved to mongo', (done: Function) => {
    const rawConcept = {
      concept: 'company',
      name: 'Company',
      concept_type: 'entity_domain',
      domain: ''
    };

    const context = {
      pathToDdfFolder: 'some/path',
      transaction: {
        _id: 'txId',
        createdAt: 1111111
      },
      dataset: {
        _id: 'datasetId'
      },
      datapackage: datapackageStub
    };

    sandbox.stub(fileUtils, 'readCsvFileAsStream').returns(hi([rawConcept]));

    const expectedError = 'Cannot save concept to db';
    const conceptCreateStub = sandbox.stub().callsArgWithAsync(1, expectedError);
    sandbox.stub(ConceptsRepositoryFactory, 'versionAgnostic').returns({ create: conceptCreateStub });
    sandbox.stub(logger, 'info');

    createConcepts(context, (error) => {
      expect(error).to.equal(expectedError);

      sinon.assert.calledOnce(conceptCreateStub);
      done();
    });
  });

  it('should import concepts: subsets are calculated', (done: Function) => {
    const rawConcept = {
      concept: 'company',
      name: 'Company',
      concept_type: 'entity_domain',
      domain: ''
    };

    const rawConcept2 = {
      concept: 'english_speaking',
      concept_type: 'entity_set',
      drill_up: ['company', 'company']
    };

    const context = {
      pathToDdfFolder: 'some/path',
      transaction: {
        _id: 'txId',
        createdAt: 1111111
      },
      dataset: {
        _id: 'datasetId'
      },
      datapackage: datapackageStub
    };

    const expectedConceptsToCreate = [
      {
        gid: 'company',
        title: 'Company',
        type: 'entity_domain',
        properties: {
          concept: 'company',
          name: 'Company',
          concept_type: 'entity_domain',
          domain: null
        },
        domain: null,
        languages: {},
        subsetOf: [],
        from: 1111111,
        to: 9007199254740991,
        dataset: 'datasetId',
        originId: null,
        sources: [
          'ddf--concepts.csv'
        ]
      },
      {
        gid: 'english_speaking',
        type: 'entity_set',
        properties: {
          concept: 'english_speaking',
          concept_type: 'entity_set',
          domain: 'company',
          drill_up: [
            'company',
            'company'
          ]
        },
        domain: null,
        languages: {},
        subsetOf: [],
        from: 1111111,
        to: 9007199254740991,
        dataset: 'datasetId',
        originId: null,
        title: undefined,
        sources: [
          'ddf--concepts.csv'
        ]
      }
    ];

    sandbox.stub(fileUtils, 'readCsvFileAsStream').returns(hi([rawConcept, rawConcept2]));

    const conceptCreateStub = sandbox.stub().callsArgWithAsync(1, null);
    sandbox.stub(ConceptsRepositoryFactory, 'versionAgnostic').returns({ create: conceptCreateStub });

    const addSubsetOfByGidStub = sandbox.stub().callsArgWithAsync(1, null);
    sandbox.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns({ addSubsetOfByGid: addSubsetOfByGidStub });

    sandbox.stub(ddfImportUtils, 'getAllConcepts').callsFake((externalContext, done) => {
      externalContext.concepts = _.keyBy(expectedConceptsToCreate, 'gid');
      externalContext.concepts.company._id = 'companyId';
      externalContext.timeConcepts = {};
      done(null, externalContext);
    });
    sandbox.stub(logger, 'info');

    createConcepts(context, (error) => {
      expect(error).to.not.exist;

      sinon.assert.calledOnce(addSubsetOfByGidStub);
      sinon.assert.calledWith(addSubsetOfByGidStub, { gid: 'company', parentConceptId: 'companyId' });

      done();
    });
  });

  it('should import concepts: subsets are calculated aand parent concept is not found', (done: Function) => {
    const rawConcept = {
      concept: 'company',
      name: 'Company',
      concept_type: 'entity_domain',
      domain: ''
    };

    const rawConcept2 = {
      concept: 'english_speaking',
      concept_type: 'entity_set',
      drill_up: ['bla']
    };

    const context = {
      pathToDdfFolder: 'some/path',
      transaction: {
        _id: 'txId',
        createdAt: 1111111
      },
      dataset: {
        _id: 'datasetId'
      },
      datapackage: datapackageStub
    };

    const expectedConceptsToCreate = [
      {
        gid: 'company',
        title: 'Company',
        type: 'entity_domain',
        properties: {
          concept: 'company',
          name: 'Company',
          concept_type: 'entity_domain',
          domain: null
        },
        domain: null,
        languages: {},
        subsetOf: [],
        from: 1111111,
        to: 9007199254740991,
        dataset: 'datasetId',
        originId: null,
        sources: [
          'ddf--concepts.csv'
        ]
      },
      {
        gid: 'english_speaking',
        type: 'entity_set',
        properties: {
          concept: 'english_speaking',
          concept_type: 'entity_set',
          domain: 'company',
          drill_up: [
            'company',
            'company'
          ]
        },
        domain: null,
        languages: {},
        subsetOf: [],
        from: 1111111,
        to: 9007199254740991,
        dataset: 'datasetId',
        originId: null,
        title: undefined,
        sources: [
          'ddf--concepts.csv'
        ]
      }
    ];

    sandbox.stub(fileUtils, 'readCsvFileAsStream').returns(hi([rawConcept, rawConcept2]));

    const conceptCreateStub = sandbox.stub().callsArgWithAsync(1, null);
    sandbox.stub(ConceptsRepositoryFactory, 'versionAgnostic').returns({ create: conceptCreateStub });

    const addSubsetOfByGidStub = sandbox.stub().callsArgWithAsync(1, null);
    sandbox.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns({ addSubsetOfByGid: addSubsetOfByGidStub });

    sandbox.stub(ddfImportUtils, 'getAllConcepts').callsFake((externalContext, done) => {
      externalContext.concepts = _.keyBy(expectedConceptsToCreate, 'gid');
      externalContext.concepts.company._id = 'companyId';
      externalContext.timeConcepts = {};
      done(null, externalContext);
    });
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'warn');

    createConcepts(context, (error) => {
      expect(error).to.not.exist;

      sinon.assert.notCalled(addSubsetOfByGidStub);
      done();
    });
  });

  it('should import concepts: domains are calculated', (done: Function) => {
    const rawConcept = {
      concept: 'company',
      name: 'Company',
      concept_type: 'entity_domain',
      domain: ''
    };

    const rawConcept2 = {
      concept: 'english_speaking',
      concept_type: 'entity_set',
      domain: 'company'
    };

    const context = {
      pathToDdfFolder: 'some/path',
      transaction: {
        _id: 'txId',
        createdAt: 1111111
      },
      dataset: {
        _id: 'datasetId'
      },
      datapackage: datapackageStub
    };

    const expectedConceptsToCreate = [
      {
        gid: 'company',
        title: 'Company',
        type: 'entity_domain',
        properties: {
          concept: 'company',
          name: 'Company',
          concept_type: 'entity_domain',
          domain: null
        },
        domain: null,
        languages: {},
        subsetOf: [],
        from: 1111111,
        to: 9007199254740991,
        dataset: 'datasetId',
        originId: null,
        sources: [
          'ddf--concepts.csv'
        ]
      },
      {
        gid: 'english_speaking',
        type: 'entity_set',
        properties: {
          concept: 'english_speaking',
          concept_type: 'entity_set',
          domain: 'company'
        },
        domain: null,
        languages: {},
        subsetOf: [],
        from: 1111111,
        to: 9007199254740991,
        dataset: 'datasetId',
        originId: null,
        title: undefined,
        sources: [
          'ddf--concepts.csv'
        ]
      }
    ];

    sandbox.stub(fileUtils, 'readCsvFileAsStream').returns(hi([rawConcept, rawConcept2]));

    const conceptCreateStub = sandbox.stub().callsArgWithAsync(1, null);
    sandbox.stub(ConceptsRepositoryFactory, 'versionAgnostic').returns({ create: conceptCreateStub });

    const setDomainByGidStub = sandbox.stub().callsArgWithAsync(1, null);
    sandbox.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns({ setDomainByGid: setDomainByGidStub });

    sandbox.stub(ddfImportUtils, 'getAllConcepts').callsFake((externalContext, done) => {
      externalContext.concepts = _.keyBy(expectedConceptsToCreate, 'gid');
      externalContext.concepts.company._id = 'companyId';
      externalContext.timeConcepts = {};
      done(null, externalContext);
    });
    sandbox.stub(logger, 'info');

    createConcepts(context, (error) => {
      expect(error).to.not.exist;

      sinon.assert.calledOnce(setDomainByGidStub);
      sinon.assert.calledWith(setDomainByGidStub, { gid: 'company', domainConceptId: 'companyId' });

      done();
    });
  });

  it('should import concepts: domains are calculated and domain concept was not found', (done: Function) => {
    const rawConcept = {
      concept: 'company',
      name: 'Company',
      concept_type: 'entity_domain',
      domain: ''
    };

    const rawConcept2 = {
      concept: 'english_speaking',
      concept_type: 'entity_set',
      domain: 'bla'
    };

    const context = {
      pathToDdfFolder: 'some/path',
      transaction: {
        _id: 'txId',
        createdAt: 1111111
      },
      dataset: {
        _id: 'datasetId'
      },
      datapackage: datapackageStub
    };

    const expectedConceptsToCreate = [
      {
        gid: 'company',
        title: 'Company',
        type: 'entity_domain',
        properties: {
          concept: 'company',
          name: 'Company',
          concept_type: 'entity_domain',
          domain: null
        },
        domain: null,
        languages: {},
        subsetOf: [],
        from: 1111111,
        to: 9007199254740991,
        dataset: 'datasetId',
        originId: null,
        sources: [
          'ddf--concepts.csv'
        ]
      },
      {
        gid: 'english_speaking',
        type: 'entity_set',
        properties: {
          concept: 'english_speaking',
          concept_type: 'entity_set',
          domain: 'company'
        },
        domain: null,
        languages: {},
        subsetOf: [],
        from: 1111111,
        to: 9007199254740991,
        dataset: 'datasetId',
        originId: null,
        title: undefined,
        sources: [
          'ddf--concepts.csv'
        ]
      }
    ];

    sandbox.stub(fileUtils, 'readCsvFileAsStream').returns(hi([rawConcept, rawConcept2]));

    const conceptCreateStub = sandbox.stub().callsArgWithAsync(1, null);
    sandbox.stub(ConceptsRepositoryFactory, 'versionAgnostic').returns({ create: conceptCreateStub });

    const setDomainByGidStub = sandbox.stub().callsArgWithAsync(1, null);
    sandbox.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns({ setDomainByGid: setDomainByGidStub });

    sandbox.stub(ddfImportUtils, 'getAllConcepts').callsFake((externalContext, done) => {
      externalContext.concepts = _.keyBy(expectedConceptsToCreate, 'gid');
      externalContext.concepts.company._id = 'companyId';
      externalContext.timeConcepts = {};
      done(null, externalContext);
    });
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'warn');

    createConcepts(context, (error) => {
      expect(error).to.not.exist;

      sinon.assert.notCalled(setDomainByGidStub);

      done();
    });
  });
});
