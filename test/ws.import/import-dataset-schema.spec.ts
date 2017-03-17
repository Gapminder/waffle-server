import  * as _ from 'lodash';
import  * as hi from 'highland';
import  * as sinon from 'sinon';
import  {expect} from 'chai';
import {logger} from '../../ws.config/log';


import '../../ws.repository';
import {config} from '../../ws.config/config';
import {constants} from '../../ws.utils/constants';
import * as fileUtils from '../../ws.utils/file';
import {DatasetSchemaRepository} from '../../ws.repository/ddf/dataset-index/dataset-index.repository';
import {DatapointsRepositoryFactory} from '../../ws.repository/ddf/data-points/data-points.repository';
import {createDatasetSchema as importDatasetSchema} from '../../ws.import/import-dataset-schema';

const datasetId = 'datasetId';
const transactionId = 'transactionId';

const externalContext = {
  concepts: {
    company: {
      originId: 'companyOriginId'
    },
    anno: {
      originId: 'annoOriginId'
    },
    lines_of_code: {
      originId: 'lines_of_codeOriginId'
    },
    company_scale: {
      originId: 'company_scaleOriginId'
    }
  },
  pathToDdfFolder: 'pathToDdfFolder',
  transaction: {
    _id: transactionId,
    createdAt: 1484065322122
  },
  dataset: {
    _id: datasetId
  }
};

const originalOptionCalculateSchemaQueriesAggFunctions = config.CALCULATE_SCHEMA_QUERIES_AGG_FUNCTIONS;

describe('Import dataset schema', () => {
  afterEach(() => {
    config.CALCULATE_SCHEMA_QUERIES_AGG_FUNCTIONS = originalOptionCalculateSchemaQueriesAggFunctions;
  });

  it('should import concepts schema', sinon.test(function (done) {
    //Arrange
    const conceptsResources = [
      {
        type: constants.CONCEPTS,
        path: 'concepts.csv',
        primaryKey: ['concept']
      }
    ];

    const conceptsSchemaContext = _.extend({datapackage: {resources: conceptsResources}}, externalContext);

    const expectedConceptSchemas = [
      {
        key: ['concept'],
        value: 'concept_type',
        file: ['concepts.csv'],
        type: constants.CONCEPTS,
        dataset: datasetId,
        transaction: transactionId
      },
      {
        key: ['concept'],
        value: 'name',
        file: ['concepts.csv'],
        type: constants.CONCEPTS,
        dataset: datasetId,
        transaction: transactionId
      }
    ];

    this.stub(fileUtils, 'readCsvFileAsStream', function () {
      return hi([
        {
          concept: 'name',
          concept_type: 'string',
          name: undefined
        },
        {
          concept: 'description',
          concept_type: 'string',
          bla: 'bla'
        }
      ]);
    });

    const loggerInfoStub = this.stub(logger, 'info');

    const datasetSchemaRepositoryCreateStub = this.stub(DatasetSchemaRepository, 'create', schemaItems => {
      // Assert
      expect(schemaItems.length).to.equal(2);
      return Promise.resolve();
    });

    // Act
    importDatasetSchema(conceptsSchemaContext, (error, context) => {
      // Assert
      expect(error).to.not.exist;
      expect(context === conceptsSchemaContext).to.be.true;

      sinon.assert.calledOnce(datasetSchemaRepositoryCreateStub);
      sinon.assert.calledWith(datasetSchemaRepositoryCreateStub, expectedConceptSchemas);

      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `** create Dataset schema items: `, 2);

      done();
    });
  }));

  it('should import entities schema', sinon.test(function (done) {
    // Arrange
    const entitiesResources = [
      {
        type: constants.ENTITIES,
        primaryKey: [
          "company_scale"
        ],
        path: "ddf--entities--company--company_scale.csv",
        fields: [
          "company_scale",
          "full_name_changed",
          "is--company_scale"
        ],
        concept: "company_scale",
        entitySets: [
          "company_scale"
        ]
      },
      {
        type: constants.ENTITIES,
        primaryKey: [
          "english_speaking"
        ],
        path: "ddf--entities--company--english_speaking.csv",
        fields: [
          "english_speaking",
          "is--english_speaking",
          "name",
          "additional_column"
        ],
        concept: "english_speaking",
        entitySets: [
          "english_speaking"
        ]
      },
    ];

    const entitiesSchemaContext = _.extend({datapackage: {resources: entitiesResources}}, externalContext);

    const expectedEntitiesSchemas = [
      {
        dataset: "datasetId",
        file: ["ddf--entities--company--company_scale.csv"],
        key: "company_scale",
        transaction: "transactionId",
        type: "entities",
        value: "full_name_changed"
      }, {
        dataset: "datasetId",
        file: ["ddf--entities--company--company_scale.csv"],
        key: "company_scale",
        transaction: "transactionId",
        type: "entities",
        value: "is--company_scale"
      }, {
        dataset: "datasetId",
        file: ["ddf--entities--company--english_speaking.csv"],
        key: "english_speaking",
        transaction: "transactionId",
        type: "entities",
        value: "is--english_speaking"
      }, {
        dataset: "datasetId",
        file: ["ddf--entities--company--english_speaking.csv"],
        key: "english_speaking",
        transaction: "transactionId",
        type: "entities",
        value: "name"
      }, {
        dataset: "datasetId",
        file: ["ddf--entities--company--english_speaking.csv"],
        key: "english_speaking",
        transaction: "transactionId",
        type: "entities",
        value: "additional_column"
      }
    ];

    const loggerInfoStub = this.stub(logger, 'info');

    const datasetSchemaRepositoryCreateStub = this.stub(DatasetSchemaRepository, 'create', schemaItems => {
      // Assert
      expect(schemaItems.length).to.equal(5);
      return Promise.resolve();
    });

    // Act
    importDatasetSchema(entitiesSchemaContext, (error, context) => {

      // Assert
      expect(error).to.not.exist;
      expect(context === entitiesSchemaContext).to.be.true;

      sinon.assert.calledOnce(datasetSchemaRepositoryCreateStub);
      sinon.assert.calledWith(datasetSchemaRepositoryCreateStub, expectedEntitiesSchemas);

      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `** create Dataset schema items: `, 5);

      done();
    });
  }));

  it('should import datapoints schema without aggregate functions calculation', sinon.test(function (done) {
    config.CALCULATE_SCHEMA_QUERIES_AGG_FUNCTIONS = false;

    // Arrange
    const datapointsResources = [
      {
        type: "datapoints",
        primaryKey: [
          "company",
          "anno"
        ],
        path: "ddf--datapoints--company_scale--by--company--anno.csv",
        dimensions: [
          "company",
          "anno"
        ],
        indicators: [
          "company_scale"
        ]
      },
      {
        type: "datapoints",
        primaryKey: [
          "company",
          "anno"
        ],
        path: "ddf--datapoints--lines_of_code--by--company--anno.csv",
        dimensions: [
          "company",
          "anno"
        ],
        indicators: [
          "lines_of_code"
        ]
      },
      {
        type: "datapoints",
        primaryKey: [
          "company",
          "anno"
        ],
        path: "ddf--datapoints--lines_of_code--by--company--anno42.csv",
        dimensions: [
          "company",
          "anno"
        ],
        indicators: [
          "lines_of_code"
        ]
      },
    ];

    const datapointsSchemaContext = _.extend({datapackage: {resources: datapointsResources}}, externalContext);

    const expectedDatapointsSchemas = [
      {
        dataset: "datasetId",
        file: ["ddf--datapoints--company_scale--by--company--anno.csv"],
        key: ["company", "anno"],
        transaction: "transactionId",
        type: "datapoints",
        value: "company_scale",
        keyOriginIds: ["companyOriginId", "annoOriginId"],
        valueOriginId: 'company_scaleOriginId'
      }, {
        dataset: "datasetId",
        file: ["ddf--datapoints--lines_of_code--by--company--anno.csv"],
        key: ["company", "anno"],
        transaction: "transactionId",
        type: "datapoints",
        value: "lines_of_code",
        keyOriginIds: ["companyOriginId", "annoOriginId"],
        valueOriginId: "lines_of_codeOriginId"
      }
    ];

    const datasetSchemaRepositoryCreateStub = this.stub(DatasetSchemaRepository, 'create', schemaItems => {
      // Assert
      expect(schemaItems.length).to.equal(2);
      return Promise.resolve();
    });

    const loggerInfoStub = this.stub(logger, 'info');

    // Act
    importDatasetSchema(datapointsSchemaContext, (error, context) => {

      // Assert
      expect(error).to.not.exist;
      expect(context === datapointsSchemaContext).to.be.true;

      sinon.assert.calledOnce(datasetSchemaRepositoryCreateStub);
      sinon.assert.calledWith(datasetSchemaRepositoryCreateStub, expectedDatapointsSchemas);

      sinon.assert.callCount(loggerInfoStub, 4);
      sinon.assert.calledWithExactly(loggerInfoStub, '** populate Dataset Index with originIds');
      sinon.assert.calledWithExactly(loggerInfoStub, '** create Dataset schema items: ', expectedDatapointsSchemas.length);

      done()
    });
  }));

  it('should import datapoints schema with aggregate functions calculation', sinon.test(function (done) {
    config.CALCULATE_SCHEMA_QUERIES_AGG_FUNCTIONS = true;

    // Arrange
    const datapointsResources = [
      {
        type: "datapoints",
        primaryKey: [
          "company",
          "anno"
        ],
        path: "ddf--datapoints--company_scale--by--company--anno.csv",
        dimensions: [
          "company",
          "anno"
        ],
        indicators: [
          "company_scale"
        ]
      },
      {
        type: "datapoints",
        primaryKey: [
          "company",
          "anno"
        ],
        path: "ddf--datapoints--lines_of_code--by--company--anno.csv",
        dimensions: [
          "company",
          "anno"
        ],
        indicators: [
          "lines_of_code"
        ]
      },
      {
        type: "datapoints",
        primaryKey: [
          "company",
          "anno"
        ],
        path: "ddf--datapoints--lines_of_code--by--company--anno42.csv",
        dimensions: [
          "company",
          "anno"
        ],
        indicators: [
          "lines_of_code"
        ]
      },
    ];

    const datapointsSchemaContext = _.extend({datapackage: {resources: datapointsResources}}, externalContext);

    const expectedDatapointsSchemas = [
      {
        dataset: "datasetId",
        file: ["ddf--datapoints--company_scale--by--company--anno.csv"],
        key: ["company", "anno"],
        transaction: "transactionId",
        type: "datapoints",
        value: "company_scale",
        keyOriginIds: ["companyOriginId", "annoOriginId"],
        valueOriginId: 'company_scaleOriginId',
        max: "cruel",
        min: "big",
        avg: null
      }, {
        dataset: "datasetId",
        file: ["ddf--datapoints--lines_of_code--by--company--anno.csv"],
        key: ["company", "anno"],
        transaction: "transactionId",
        type: "datapoints",
        value: "lines_of_code",
        keyOriginIds: ["companyOriginId", "annoOriginId"],
        valueOriginId: "lines_of_codeOriginId",
        max: 2,
        min: 1,
        avg: 1.55554
      }
    ];


    const datasetSchemaRepositoryCreateStub = this.stub(DatasetSchemaRepository, 'create', schemaItems => {
      // Assert
      expect(schemaItems.length).to.equal(2);
      return Promise.resolve();
    });

    const stubRepository = {findStats: _.noop};
    const findStatsStub = this.stub(stubRepository, 'findStats', (options, onFound) => {
      if (options.measureId === 'lines_of_codeOriginId') {
        onFound(null, {min: 1, max: 2, avg: 1.55553555});
      } else if (options.measureId === 'company_scaleOriginId') {
        onFound(null, {min: 'big', max: 'cruel', avg: null});
      } else {
        onFound('MeasureId is not recognized');
      }
    });

    const datapointsRepositoryFactoryCurrentVersionStub = this.stub(DatapointsRepositoryFactory, 'currentVersion', () => stubRepository);
    const loggerInfoStub = this.stub(logger, 'info');
    const measureName = _.map(datapointsResources, 'indicators');

    // Act
    importDatasetSchema(datapointsSchemaContext, (error, context) => {

      // Assert
      expect(error).to.not.exist;
      expect(context === datapointsSchemaContext).to.be.true;

      sinon.assert.calledOnce(datasetSchemaRepositoryCreateStub);
      sinon.assert.calledWith(datasetSchemaRepositoryCreateStub, expectedDatapointsSchemas);

      sinon.assert.calledWith(findStatsStub, {
        dimensionsConceptsIds: ["companyOriginId", "annoOriginId"],
        dimensionsSize: 2,
        measureId: "company_scaleOriginId"
      });

      sinon.assert.calledWith(findStatsStub, {
        dimensionsConceptsIds: ["companyOriginId", "annoOriginId"],
        dimensionsSize: 2,
        measureId: "lines_of_codeOriginId"
      });

      sinon.assert.calledThrice(datapointsRepositoryFactoryCurrentVersionStub);
      sinon.assert.calledWith(datapointsRepositoryFactoryCurrentVersionStub, datapointsSchemaContext.dataset._id, datapointsSchemaContext.transaction.createdAt);

      sinon.assert.callCount(loggerInfoStub, 7);
      sinon.assert.calledWithExactly(loggerInfoStub, '** populate Dataset Index with originIds');
      sinon.assert.calledWithExactly(loggerInfoStub, `** find Datapoints stats for Measure ${measureName[0]}`);
      sinon.assert.calledWithExactly(loggerInfoStub, `** find Datapoints stats for Measure ${measureName[1]}`);
      sinon.assert.calledWithExactly(loggerInfoStub, `** find Datapoints stats for Measure ${measureName[2]}`);
      sinon.assert.calledWithExactly(loggerInfoStub, '** create Dataset schema items: ', expectedDatapointsSchemas.length);

      done();
    });
  }));

  it('should not import datapoints schema if error occurs during aggregate functions calculation', sinon.test(function (done) {
    config.CALCULATE_SCHEMA_QUERIES_AGG_FUNCTIONS = true;

    // Arrange
    const datapointsResources = [
      {
        type: "datapoints",
        primaryKey: [
          "company",
          "anno"
        ],
        path: "ddf--datapoints--company_scale--by--company--anno.csv",
        dimensions: [
          "company",
          "anno"
        ],
        indicators: [
          "bla"
        ]
      }
    ];

    const datapointsSchemaContext = _.extend({datapackage: {resources: datapointsResources}}, externalContext);

    const datasetSchemaRepositoryCreateStub = this.stub(DatasetSchemaRepository, 'create', schemaItems => {
      // Assert
      expect(schemaItems.length).to.equal(2);
      return Promise.resolve();
    });

    const stubRepository = {findStats: _.noop};
    this.stub(stubRepository, 'findStats', (options, onFound) => onFound('MeasureId is not recognized'));

    this.stub(DatapointsRepositoryFactory, 'currentVersion', () => stubRepository);

    const loggerInfoStub = this.stub(logger, 'info');
    const measureName = _.get(datapointsResources[0], 'indicators');

    // Act
    importDatasetSchema(datapointsSchemaContext, (error, context) => {

      // Assert
      expect(error).to.deep.equal(['MeasureId is not recognized']);
      expect(context === datapointsSchemaContext).to.be.true;

      sinon.assert.calledTwice(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, `** populate Dataset Index with originIds`);
      sinon.assert.calledWithExactly(loggerInfoStub, `** find Datapoints stats for Measure ${measureName}`);
      sinon.assert.notCalled(datasetSchemaRepositoryCreateStub);
      done();
    });
  }));
});
