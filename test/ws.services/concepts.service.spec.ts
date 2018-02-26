import * as sinon from 'sinon';
import { expect } from 'chai';

import '../../ws.repository';
import * as conceptsService from '../../ws.services/concepts.service';
import { ConceptsRepositoryFactory } from '../../ws.repository/ddf/concepts/concepts.repository';
import * as ddfQueryValidator from '../../ws.ddfql/ddf-query-validator';
import * as ddfQueryNormalizer from '../../ws.ddfql/ddf-concepts-query-normalizer';
import * as commonService from '../../ws.services/common.service';

const sandbox = sinon.createSandbox();

describe('Concepts service', () => {

  afterEach(() => sandbox.restore());

  it('fails when cannot find requested properties for concepts', (done: Function) => {
    const context = {
      dataset: {
        id: 'dsId'
      },
      version: 1111111,
      headers: ['gid', 'name'],
      where: {
        $and: [{
          gid: 'bla'
        }]
      }
    };

    const expectedError = '[Error]: concept properties searching';

    const findConceptPropertiesStub = sandbox.stub().callsArgWithAsync(2, expectedError);
    const repo = {
      findConceptProperties: findConceptPropertiesStub
    };

    sandbox.stub(ConceptsRepositoryFactory, 'currentVersion').returns(repo);

    conceptsService.getConcepts(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('gets concepts from db', (done: Function) => {
    const context = {
      dataset: {
        _id: 'dsId'
      },
      version: 1111111,
      headers: ['gid', 'name'],
      where: {
        $and: [{
          gid: 'bla'
        }]
      }
    };

    const concepts = [{gid: 'geo'}];

    const findConceptPropertiesStub = sandbox.stub().callsArgWithAsync(2, null, concepts);
    const repo = {
      findConceptProperties: findConceptPropertiesStub
    };

    const currentVersionStub = sandbox.stub(ConceptsRepositoryFactory, 'currentVersion').returns(repo);

    conceptsService.getConcepts(context, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext).to.deep.equal(Object.assign(context, {concepts}));

      sinon.assert.calledOnce(currentVersionStub);
      sinon.assert.calledWith(currentVersionStub, context.dataset._id, context.version);

      sinon.assert.calledOnce(findConceptPropertiesStub);
      sinon.assert.calledWith(findConceptPropertiesStub, context.headers, context.where, sinon.match.func);

      done();
    });
  });

  it('fails when cannot search for concepts', (done: Function) => {
    const expectedError = '[Error]: fails while searching for concepts';

    const context = {
      query: {
        select: ['concept'],
        from: 'concepts'
      },
      dataset: {
        _id: 'dsId'
      },
      transaction: {
        _id: 'txId'
      },
      version: 1111111,
      domainGids: ['geo', 'only first gid is taken']
    };

    sandbox.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    sandbox.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);

    const findConceptsByQueryStub = sandbox.stub().callsArgWithAsync(1, expectedError);
    const repo = {
      findConceptsByQuery: findConceptsByQueryStub
    };
    sandbox.stub(ConceptsRepositoryFactory, 'currentVersion').returns(repo);

    conceptsService.collectConceptsByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);

      sinon.assert.calledOnce(findConceptsByQueryStub);
      sinon.assert.calledWith(findConceptsByQueryStub, {});
      done();
    });
  });

  it('fails when tries to collect concepts from invalid query', (done: Function) =>  {
    const expectedError = '[Error]: mongo query is not valid';
    const queryValidationResult = {
      valid: false,
      log: expectedError
    };

    const context = {
      query: {
        select: ['concept'],
        from: 'concepts'
      },
      dataset: {
        _id: 'dsId'
      },
      transaction: {
        _id: 'txId'
      },
      version: 1111111,
      domainGids: ['geo', 'only first gid is taken']
    };

    sandbox.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    sandbox.stub(ddfQueryValidator, 'validateMongoQuery').returns(queryValidationResult);
    sandbox.stub(ddfQueryNormalizer, 'normalizeConcepts').returns({where: {}});
    sandbox.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);

    const findConceptsByQueryStub = sandbox.stub().callsArgWithAsync(1, null, {});
    const repo = {
      findConceptsByQuery: findConceptsByQueryStub
    };
    sandbox.stub(ConceptsRepositoryFactory, 'currentVersion').returns(repo);

    conceptsService.collectConceptsByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('collects concepts by ddfql', (done: Function) =>  {
    const queryValidationResult = {
      valid: true
    };

    const context = {
      query: {
        select: ['concept'],
        from: 'concepts',
        where: {}
      },
      dataset: {
        _id: 'dsId'
      },
      transaction: {
        _id: 'txId'
      },
      version: 1111111,
      domainGids: ['geo', 'only first gid is taken']
    };

    const allConcepts = [
      {gid: 'geo'}
    ];

    const expectedConcepts = [
      {gid: 'bla'}
    ];

    const validateDdfQueryAsyncStub = sandbox.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    const validateMongoQueryStub = sandbox.stub(ddfQueryValidator, 'validateMongoQuery').returns(queryValidationResult);
    const normalizeConceptsStub = sandbox.stub(ddfQueryNormalizer, 'normalizeConcepts').returns(context.query);
    const findDefaultDatasetAndTransactionStub = sandbox.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);

    const findConceptsByQueryStub = sandbox.stub();
    findConceptsByQueryStub.onFirstCall().callsArgWithAsync(1, null, allConcepts);
    findConceptsByQueryStub.onSecondCall().callsArgWithAsync(1, null, expectedConcepts);

    const currentVerionsStub = sandbox.stub(ConceptsRepositoryFactory, 'currentVersion').returns({
      findConceptsByQuery: findConceptsByQueryStub
    });

    conceptsService.collectConceptsByDdfql(context, (error, externalContext) => {
      expect(error).to.not.exist;

      sinon.assert.calledWith(findConceptsByQueryStub, {}, sinon.match.func);
      sinon.assert.calledWith(findConceptsByQueryStub, context.query.where, sinon.match.func);
      sinon.assert.calledTwice(findConceptsByQueryStub);

      sinon.assert.calledWith(currentVerionsStub, context.dataset._id, context.version);
      sinon.assert.calledWith(validateMongoQueryStub, context.query.where);

      sinon.assert.callOrder(
        validateDdfQueryAsyncStub,
        findDefaultDatasetAndTransactionStub,
        findConceptsByQueryStub,
        normalizeConceptsStub,
        validateMongoQueryStub,
        findConceptsByQueryStub
      );

      expect(externalContext.concepts).to.deep.equal(expectedConcepts);

      done();
    });
  });

  it('collects concepts by ddfql: fails cause is not able to collect concepts using normalized query', (done: Function) =>  {
    const expectedError = 'Boo!';

    const queryValidationResult = {
      valid: true
    };

    const context = {
      query: {
        select: ['concept'],
        from: 'concepts',
        where: {}
      },
      dataset: {
        _id: 'dsId'
      },
      transaction: {
        _id: 'txId'
      },
      version: 1111111,
      domainGids: ['geo', 'only first gid is taken']
    };

    sandbox.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    sandbox.stub(ddfQueryValidator, 'validateMongoQuery').returns(queryValidationResult);
    sandbox.stub(ddfQueryNormalizer, 'normalizeConcepts').returns(context.query);
    sandbox.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);

    const findConceptsByQueryStub = sandbox.stub();
    findConceptsByQueryStub.onFirstCall().callsArgWithAsync(1, null, []);
    findConceptsByQueryStub.onSecondCall().callsArgWithAsync(1, expectedError);

    sandbox.stub(ConceptsRepositoryFactory, 'currentVersion').returns({
      findConceptsByQuery: findConceptsByQueryStub
    });

    conceptsService.collectConceptsByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });
});
