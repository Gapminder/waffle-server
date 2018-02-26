import * as sinon from 'sinon';
import { expect } from 'chai';

import '../../ws.repository';
import { logger } from '../../ws.config/log';
import { DatasetSchemaRepository } from '../../ws.repository/ddf/dataset-index/dataset-index.repository';
import { createDatasetSchema } from '../../ws.import/import-dataset-schema';

const datasetId = 'datasetId';
const transactionId = 'transactionId';

const sandbox = sinon.createSandbox();

const externalContext = {
  transaction: {
    _id: transactionId
  },
  dataset: {
    _id: datasetId
  }
};

describe('Import dataset schema', () => {

  afterEach(() => sandbox.restore());

  it('imports schema for concepts', (done: Function) => {
    const conceptsContext = Object.assign({}, externalContext, {
      datapackage: {
        ddfSchema: {
          concepts: [
            {
              primaryKey: ['concept'],
              value: 'name',
              resources: ['ddf--concepts']
            },
            {
              primaryKey: ['concept'],
              value: 'concept_type',
              resources: ['ddf--concepts']
            }
          ],
          entities: [
            {
              primaryKey: ['country'],
              value: 'name',
              resources: ['ddf--concepts']
            }
          ],
          datapoints: [{
            primaryKey: ['country', 'year'],
            value: 'yearly_co2_emissions_1000_tonnes',
            resources: ['ddf--datapoints--yearly_co2_emissions_1000_tonnes--by--country--year']
          }]
        }
      }
    });

    const createStub = sandbox.stub(DatasetSchemaRepository, 'create').returns(Promise.resolve());
    sandbox.stub(logger, 'info');

    createDatasetSchema(conceptsContext, (error, externalContext) => {
      expect(error).to.not.exist;

      sinon.assert.calledThrice(createStub);

      sinon.assert.calledWith(createStub, [{
        dataset: 'datasetId',
        key: ['concept'],
        resources: ['ddf--concepts'],
        transaction: 'transactionId',
        type: 'concepts',
        value: 'name'
      }, {
        dataset: 'datasetId',
        key: ['concept'],
        resources: ['ddf--concepts'],
        transaction: 'transactionId',
        type: 'concepts',
        value: 'concept_type'
      }]);

      sinon.assert.calledWith(createStub, [{
        dataset: 'datasetId',
        key: ['country'],
        resources: ['ddf--concepts'],
        transaction: 'transactionId',
        type: 'entities',
        value: 'name'
      }]);

      sinon.assert.calledWith(createStub, [{
        dataset: 'datasetId',
        key: ['country', 'year'],
        resources: ['ddf--datapoints--yearly_co2_emissions_1000_tonnes--by--country--year'],
        transaction: 'transactionId',
        type: 'datapoints',
        value: 'yearly_co2_emissions_1000_tonnes'
      }]);

      done();
    });
  });
});
