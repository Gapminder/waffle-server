import * as sinon from 'sinon';
import { expect } from 'chai';

import '../../ws.repository';

import * as commonService from '../../ws.services/common.service';
import * as schemaService from '../../ws.services/schema.service';
import * as ddfQueryValidator from '../../ws.ddfql/ddf-query-validator';
import * as schemaQueryNormalizer from '../../ws.ddfql/ddf-schema-query-normalizer';
import { DatasetSchemaRepository } from '../../ws.repository/ddf/dataset-index/dataset-index.repository';

describe('Schema service', () => {
  it('cannot find schema: generated mongo query is invalid', sinon.test(function (done) {
    const expectedError = '[Error]: mongo query is not valid';

    const context = {
      query: {
        select: {},
        where: {}
      },
      transaction: {},
    };

    const normalizedWhere = {
      foo: 'bar'
    };

    this.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    this.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, Object.assign({}, context, {
      dataset: {
        _id: 'dsId'
      },
      transaction: {
        _id: 'txId'
      }
    }));

    this.stub(schemaQueryNormalizer, 'normalize').returns({where: normalizedWhere});
    this.stub(ddfQueryValidator, 'validateMongoQuery').returns({valid: false, log: expectedError});

    schemaService.findSchemaByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('cannot find schema: fails while schema items searching', sinon.test(function (done) {
    const expectedError = '[Error]: fails while schema items searching';

    const context = {
      query: {
        select: {},
        where: {}
      },
      transaction: {},
    };

    const normalizedWhere = {
      foo: 'bar'
    };

    this.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    this.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, Object.assign({}, context, {
      dataset: {
        _id: 'dsId'
      },
      transaction: {
        _id: 'txId'
      }
    }));

    this.stub(schemaQueryNormalizer, 'normalize').returns({where: normalizedWhere});
    this.stub(ddfQueryValidator, 'validateMongoQuery').returns({valid: true});
    this.stub(DatasetSchemaRepository, 'findByDdfql').callsArgWithAsync(1, expectedError);

    schemaService.findSchemaByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('cannot find schema: fails while schema items searching', sinon.test(function (done) {
    const context: any = {
      query: {
        select: {key: ['key', 'value'], value: ['min(population)']},
        where: {}
      },
      transaction: {},
    };

    const normalizedWhere = {
      foo: 'bar'
    };

    const normalizedQuery = {
      select: {'key': 1, 'value': 1, 'min': 1},
      aliases: {
        min: 'min(population)'
      },
      where: normalizedWhere
    };

    const expectedData = [['a', 'b'], 42];

    this.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    this.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, Object.assign({}, context, {
      dataset: {
        _id: 'dsId'
      },
      transaction: {
        _id: 'txId'
      }
    }));

    const normalizeStub = this.stub(schemaQueryNormalizer, 'normalize').returns(normalizedQuery);
    this.stub(ddfQueryValidator, 'validateMongoQuery').returns({valid: true});
    this.stub(DatasetSchemaRepository, 'findByDdfql').callsArgWithAsync(1, null, expectedData);

    schemaService.findSchemaByDdfql(context, (error, result) => {
      expect(error).to.not.exist;
      expect(result).to.deep.equal({
        "aliases": {
          "min": "min(population)"
        },
        "headers": [
          "key",
          "value",
          "min"
        ],
        "query": {
          "select": {
            "key": [
              "key",
              "value"
            ],
            "value": [
              "min(population)"
            ]
          },
          "where": {}
        },
        "schema": [
          [
            "a",
            "b"
          ],
          42
        ]
      });

      sinon.assert.calledWith(normalizeStub, context.query, {transactionId: 'txId'});

      done();
    });
  }));
});
