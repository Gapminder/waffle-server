import * as sinon from 'sinon';
import { expect } from 'chai';

import '../../ws.repository';
import { EntitiesRepositoryFactory } from '../../ws.repository/ddf/entities/entities.repository';
import { DatapointsRepositoryFactory } from '../../ws.repository/ddf/data-points/data-points.repository';
import * as ddfqlNormalizer from '../../ws.ddfql/ddf-datapoints-query-normalizer';
import * as datapointsService from '../../ws.services/datapoints.service';
import * as ddfQueryValidator from '../../ws.ddfql/ddf-query-validator';
import * as commonService from '../../ws.services/common.service';
import * as conceptsService from '../../ws.services/concepts.service';
import * as entitiesService from '../../ws.services/entities.service';
import { getConcepts } from '../../ws.services/concepts.service';

describe('Datapoints service', () => {
  it('cannot collect datapoints by ddfql: concepts not found', sinon.test(function (done) {
    const expectedError = '[Error]: concepts not found';

    const context = {
      user: {},
      select: [],
      headers: [],
      domainGids: [],
      where: {},
      query: {},
      sort: {},
      groupBy: {},
      datasetName: 'dsName',
      language: 'nl-nl',
      version: 1111111
    };

    this.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    this.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, Object.assign({}, context, {dataset: {}, transaction: {}}));
    this.stub(conceptsService, 'getConcepts').callsArgWithAsync(1, expectedError);

    datapointsService.collectDatapointsByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('cannot collect datapoints by ddfql: there is no projection in query', sinon.test(function (done) {
    const expectedError = `You didn't select any column`;

    const context = {
      user: {},
      select: [],
      headers: [],
      domainGids: [],
      where: {},
      query: {},
      sort: {},
      groupBy: {},
      datasetName: 'dsName',
      language: 'nl-nl',
      version: 1111111,
      transaction: {},
      dataset: {},
      concepts: {}
    };

    this.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    this.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);
    this.stub(conceptsService, 'getConcepts').callsArgWithAsync(1, null, context);

    datapointsService.collectDatapointsByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('cannot collect datapoints by ddfql: not existing columns requested in value projection', sinon.test(function (done) {
    const expectedError = `You choose select column(s) 'population' which aren't present in choosen dataset`;

    const context = {
      user: {},
      select: ['population'],
      headers: ['geo', 'year', 'age', 'population'],
      domainGids: ['geo', 'year', 'age'],
      where: {},
      query: {},
      sort: {},
      groupBy: {},
      datasetName: 'dsName',
      language: 'nl-nl',
      version: 1111111,
      transaction: {},
      dataset: {},
      concepts: [
        {gid: 'geo'}
      ]
    };

    this.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    this.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);
    this.stub(conceptsService, 'getConcepts').callsArgWithAsync(1, null, context);

    datapointsService.collectDatapointsByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('cannot collect datapoints by ddfql: not existing columns requested in key projection', sinon.test(function (done) {
    const expectedError = `Your choose key column(s) 'year, age' which aren't present in choosen dataset`;

    const context = {
      user: {},
      select: ['population'],
      headers: ['geo', 'year', 'age', 'population'],
      domainGids: ['geo', 'year', 'age'],
      where: {},
      query: {},
      sort: {},
      groupBy: {},
      datasetName: 'dsName',
      language: 'nl-nl',
      version: 1111111,
      transaction: {},
      dataset: {},
      concepts: [
        {gid: 'geo'},
        {gid: 'population'}
      ]
    };

    this.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    this.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);
    this.stub(conceptsService, 'getConcepts').callsArgWithAsync(1, null, context);

    datapointsService.collectDatapointsByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('cannot collect datapoints by ddfql: fails while searching entities by concepts', sinon.test(function (done) {
    const expectedError = 'Boo!';

    const context = {
      user: {},
      select: ['population'],
      headers: ['geo', 'year', 'age', 'population'],
      domainGids: ['geo', 'year', 'age'],
      where: {},
      query: {},
      sort: {},
      groupBy: {},
      datasetName: 'dsName',
      language: 'nl-nl',
      version: 1111111,
      transaction: {},
      dataset: {
        _id: 'dsId'
      },
      concepts: [
        {gid: 'geo'},
        {gid: 'year'},
        {gid: 'age'},
        {gid: 'population', type: 'measure'}
      ]
    };

    const geoEntities = [
      {gid: 'usa', originId: 'usaId'}
    ];

    const ageEntities = [
      {gid: '21', originId: '21Id'}
    ];

    const yearEntities = [
      {gid: '1918', originId: '1918Id'}
    ];

    this.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    this.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);
    this.stub(conceptsService, 'getConcepts').callsArgWithAsync(1, null, context);

    const getEntitiesStub = this.stub(entitiesService, 'getEntities');
    getEntitiesStub.onFirstCall()
      .callsArgWithAsync(1, expectedError);

    datapointsService.collectDatapointsByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('cannot collect datapoints by ddfql: fails cause no measures were found for datapoints', sinon.test(function (done) {
    const expectedError = 'Measure should present in select property';

    const context = {
      user: {},
      select: ['population'],
      headers: ['geo', 'year', 'age', 'population'],
      domainGids: ['geo', 'year', 'age'],
      where: {},
      query: {},
      sort: {},
      groupBy: {},
      datasetName: 'dsName',
      language: 'nl-nl',
      version: 1111111,
      transaction: {},
      dataset: {
        _id: 'dsId'
      },
      concepts: [
        {gid: 'geo'},
        {gid: 'year'},
        {gid: 'age'},
        {gid: 'population'}
      ]
    };

    const geoEntities = [
      {gid: 'usa', originId: 'usaId'}
    ];

    const ageEntities = [
      {gid: '21', originId: '21Id'}
    ];

    const yearEntities = [
      {gid: '1918', originId: '1918Id'}
    ];

    this.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    this.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);
    this.stub(conceptsService, 'getConcepts').callsArgWithAsync(1, null, context);

    const getEntitiesStub = this.stub(entitiesService, 'getEntities');
    getEntitiesStub.onFirstCall()
      .callsArgWithAsync(1, null, {entities: geoEntities});

    getEntitiesStub.onSecondCall()
      .callsArgWithAsync(1, null, {entities: yearEntities});

    getEntitiesStub.onThirdCall()
      .callsArgWithAsync(1, null, {entities: ageEntities});

    datapointsService.collectDatapointsByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('cannot collect datapoints by ddfql: fails searching entities for join clause', sinon.test(function (done) {
    const expectedError = '[Error]: entities projection';

    const context = {
      user: {},
      select: ['population'],
      headers: ['geo', 'year', 'age', 'population'],
      domainGids: ['geo', 'year', 'age'],
      where: {},
      query: {},
      sort: {},
      groupBy: {},
      datasetName: 'dsName',
      language: 'nl-nl',
      version: 1111111,
      transaction: {},
      dataset: {
        _id: 'dsId'
      },
      concepts: [
        {gid: 'geo'},
        {gid: 'year'},
        {gid: 'age'},
        {gid: 'population', type: 'measure'}
      ]
    };

    const geoEntities = [
      {gid: 'usa', originId: 'usaId'}
    ];

    const ageEntities = [
      {gid: '21', originId: '21Id'}
    ];

    const yearEntities = [
      {gid: '1918', originId: '1918Id'}
    ];

    const findEntityPropertiesByQueryStub = this.stub().callsArgWithAsync(1, expectedError);
    this.stub(EntitiesRepositoryFactory, 'currentVersion').returns({ findEntityPropertiesByQuery: findEntityPropertiesByQueryStub });

    this.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    this.stub(ddfqlNormalizer, 'normalizeDatapoints').returns({join: {$year: {}}});
    this.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);
    this.stub(conceptsService, 'getConcepts').callsArgWithAsync(1, null, context);

    const getEntitiesStub = this.stub(entitiesService, 'getEntities');
    getEntitiesStub.onFirstCall()
      .callsArgWithAsync(1, null, {entities: geoEntities});

    getEntitiesStub.onSecondCall()
      .callsArgWithAsync(1, null, {entities: yearEntities});

    getEntitiesStub.onThirdCall()
      .callsArgWithAsync(1, null, {entities: ageEntities});

    datapointsService.collectDatapointsByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('cannot collect datapoints by ddfql: mongo query generated from the join clause is invalid', sinon.test(function (done) {
    const expectedError = '[Error]: generated mongo query is not valid';

    const queryValidationResult = {
      valid: false,
      log: expectedError
    };

    const context = {
      user: {},
      select: ['population'],
      headers: ['geo', 'year', 'age', 'population'],
      domainGids: ['geo', 'year', 'age'],
      where: {},
      query: {},
      sort: {},
      groupBy: {},
      datasetName: 'dsName',
      language: 'nl-nl',
      version: 1111111,
      transaction: {},
      dataset: {
        _id: 'dsId'
      },
      concepts: [
        {gid: 'geo'},
        {gid: 'year'},
        {gid: 'age'},
        {gid: 'population', type: 'measure'}
      ]
    };

    const geoEntities = [
      {gid: 'usa', originId: 'usaId'}
    ];

    const ageEntities = [
      {gid: '21', originId: '21Id'}
    ];

    const yearEntities = [
      {gid: '1918', originId: '1918Id'}
    ];

    this.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    this.stub(ddfQueryValidator, 'validateMongoQuery').returns(queryValidationResult);
    this.stub(ddfqlNormalizer, 'normalizeDatapoints').returns({join: {$year: {}}});
    this.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);
    this.stub(conceptsService, 'getConcepts').callsArgWithAsync(1, null, context);

    const getEntitiesStub = this.stub(entitiesService, 'getEntities');
    getEntitiesStub.onFirstCall()
      .callsArgWithAsync(1, null, {entities: geoEntities});

    getEntitiesStub.onSecondCall()
      .callsArgWithAsync(1, null, {entities: yearEntities});

    getEntitiesStub.onThirdCall()
      .callsArgWithAsync(1, null, {entities: ageEntities});

    datapointsService.collectDatapointsByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('cannot collect datapoints by ddfql: final mongo query generated from the whole ddfql query is invalid', sinon.test(function (done) {
    const expectedError = '[Error]: generated mongo query is not valid';

    const queryValidationResult = {
      valid: false,
      log: expectedError
    };

    const context = {
      user: {},
      select: ['population'],
      headers: ['geo', 'year', 'age', 'population'],
      domainGids: ['geo', 'year', 'age'],
      where: {},
      query: {},
      sort: {},
      groupBy: {},
      datasetName: 'dsName',
      language: 'nl-nl',
      version: 1111111,
      transaction: {},
      dataset: {
        _id: 'dsId'
      },
      concepts: [
        {gid: 'geo'},
        {gid: 'year'},
        {gid: 'age'},
        {gid: 'population', type: 'measure'}
      ]
    };

    const geoEntities = [
      {gid: 'usa', originId: 'usaId'}
    ];

    const ageEntities = [
      {gid: '21', originId: '21Id'}
    ];

    const yearEntities = [
      {gid: '1918', originId: '1918Id'}
    ];

    const findEntityPropertiesByQueryStub = this.stub().callsArgWithAsync(1, null, geoEntities);
    this.stub(EntitiesRepositoryFactory, 'currentVersion').returns({ findEntityPropertiesByQuery: findEntityPropertiesByQueryStub });

    this.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);

    const validateMongoQueryStub = this.stub(ddfQueryValidator, 'validateMongoQuery').returns(queryValidationResult);
    validateMongoQueryStub.onFirstCall().returns({valid: true});
    validateMongoQueryStub.onSecondCall().returns(queryValidationResult);

    this.stub(ddfqlNormalizer, 'normalizeDatapoints').returns({join: {$year: {}}});
    this.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);
    this.stub(conceptsService, 'getConcepts').callsArgWithAsync(1, null, context);

    const getEntitiesStub = this.stub(entitiesService, 'getEntities');
    getEntitiesStub.onFirstCall()
      .callsArgWithAsync(1, null, {entities: geoEntities});

    getEntitiesStub.onSecondCall()
      .callsArgWithAsync(1, null, {entities: yearEntities});

    getEntitiesStub.onThirdCall()
      .callsArgWithAsync(1, null, {entities: ageEntities});

    datapointsService.collectDatapointsByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('cannot collect datapoints by ddfql: fails searching for datapoints', sinon.test(function (done) {
    const expectedError = '[Error]: cannot find datapoints';

    const context = {
      user: {},
      select: ['population'],
      headers: ['geo', 'year', 'age', 'population'],
      domainGids: ['geo', 'year', 'age'],
      where: {},
      query: {},
      sort: {},
      groupBy: {},
      datasetName: 'dsName',
      language: 'nl-nl',
      version: 1111111,
      transaction: {},
      dataset: {
        _id: 'dsId'
      },
      concepts: [
        {gid: 'geo'},
        {gid: 'year'},
        {gid: 'age'},
        {gid: 'population', type: 'measure'}
      ]
    };

    const geoEntities = [
      {gid: 'usa', originId: 'usaId'}
    ];

    const ageEntities = [
      {gid: '21', originId: '21Id'}
    ];

    const yearEntities = [
      {gid: '1918', originId: '1918Id'}
    ];

    const findEntityPropertiesByQueryStub = this.stub().callsArgWithAsync(1, null, geoEntities);
    this.stub(EntitiesRepositoryFactory, 'currentVersion').returns({ findEntityPropertiesByQuery: findEntityPropertiesByQueryStub });

    const findByQueryStub = this.stub().callsArgWithAsync(1, expectedError);
    this.stub(DatapointsRepositoryFactory, 'currentVersion').returns({ findByQuery: findByQueryStub });

    this.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    this.stub(ddfQueryValidator, 'validateMongoQuery').returns({valid: true});

    this.stub(ddfqlNormalizer, 'normalizeDatapoints').returns({join: {$year: {}}});
    this.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);
    this.stub(conceptsService, 'getConcepts').callsArgWithAsync(1, null, context);

    const getEntitiesStub = this.stub(entitiesService, 'getEntities');
    getEntitiesStub.onFirstCall()
      .callsArgWithAsync(1, null, {entities: geoEntities});

    getEntitiesStub.onSecondCall()
      .callsArgWithAsync(1, null, {entities: yearEntities});

    getEntitiesStub.onThirdCall()
      .callsArgWithAsync(1, null, {entities: ageEntities});

    datapointsService.collectDatapointsByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('collects datapoints by ddfql', sinon.test(function (done) {
    const context = {
      user: {},
      select: ['population'],
      headers: ['geo', 'year', 'age', 'population'],
      domainGids: ['geo', 'year', 'age'],
      where: {},
      query: {
        select: {
          key: ['geo', 'year', 'age'],
          value: ['population']
        },
        where: {
          $and: [
            {year: '$year'}
          ]
        },
        join: {$year: {}}
      },
      sort: {},
      groupBy: {},
      datasetName: 'dsName',
      language: 'nl-nl',
      version: 1111111,
      transaction: {},
      dataset: {
        _id: 'dsId'
      },
      concepts: [
        {gid: 'geo'},
        {gid: 'year'},
        {gid: 'age'},
        {gid: 'population', type: 'measure'}
      ]
    };

    const datapoints = [
      {value: 7},
      {value: 8},
      {value: 9}
    ];

    const geoEntities = [
      {gid: 'usa', originId: 'usaId'}
    ];

    const ageEntities = [
      {gid: '21', originId: '21Id'}
    ];

    const yearEntities = [
      {gid: '1918', originId: '1918Id'}
    ];

    const findEntityPropertiesByQueryStub = this.stub().callsArgWithAsync(1, null, geoEntities);
    const currentVersionEntitiesStub = this.stub(EntitiesRepositoryFactory, 'currentVersion').returns({ findEntityPropertiesByQuery: findEntityPropertiesByQueryStub });

    const findByQueryStub = this.stub().callsArgWithAsync(1, null, datapoints);
    const currentVersionDatapointsStub = this.stub(DatapointsRepositoryFactory, 'currentVersion').returns({ findByQuery: findByQueryStub });

    const validateDdfQueryAsyncStub = this.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    const validateMongoQueryStub = this.stub(ddfQueryValidator, 'validateMongoQuery').returns({valid: true});

    const substituteDatapointJoinLinksStub = this.stub(ddfqlNormalizer, 'substituteDatapointJoinLinks').returns(context.query);
    const normalizeDatapointsStub = this.stub(ddfqlNormalizer, 'normalizeDatapoints').returns(context.query);

    const findDefaultDatasetAndTransactionStub = this.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);
    const getConceptsStub = this.stub(conceptsService, 'getConcepts').callsArgWithAsync(1, null, context);

    const getEntitiesStub = this.stub(entitiesService, 'getEntities');
    getEntitiesStub.onFirstCall()
      .callsArgWithAsync(1, null, {entities: geoEntities});

    getEntitiesStub.onSecondCall()
      .callsArgWithAsync(1, null, {entities: yearEntities});

    getEntitiesStub.onThirdCall()
      .callsArgWithAsync(1, null, {entities: ageEntities});

    datapointsService.collectDatapointsByDdfql(context, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext.datapoints).to.deep.equal(datapoints);

      sinon.assert.callOrder(
        validateDdfQueryAsyncStub,
        findDefaultDatasetAndTransactionStub,
        getConceptsStub,
        getEntitiesStub,
        currentVersionEntitiesStub,
        normalizeDatapointsStub,
        substituteDatapointJoinLinksStub,
        validateMongoQueryStub,
        findEntityPropertiesByQueryStub,
        validateMongoQueryStub,
        currentVersionDatapointsStub,
        findByQueryStub
      );

      sinon.assert.calledWith(findByQueryStub, context.query.where);
      sinon.assert.calledWith(normalizeDatapointsStub, context.query, context.concepts);
      sinon.assert.calledWith(validateMongoQueryStub, context.query.join.$year);
      sinon.assert.calledWith(validateMongoQueryStub, context.query.where);
      sinon.assert.calledWith(currentVersionEntitiesStub, context.dataset._id, context.version);
      sinon.assert.calledWith(currentVersionDatapointsStub, context.dataset._id, context.version);

      done();
    });
  }));
});
