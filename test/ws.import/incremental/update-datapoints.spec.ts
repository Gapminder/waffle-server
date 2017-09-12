import '../../../ws.repository';

import * as path from 'path';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import { expect } from 'chai';

import * as fileUtils from '../../../ws.utils/file';
import * as datapointsUtils from '../../../ws.import/utils/datapoints.utils';
import { updateDatapoints } from '../../../ws.import/incremental/update-datapoints';
import { logger } from '../../../ws.config/log';
import { DatapointsRepositoryFactory } from '../../../ws.repository/ddf/data-points/data-points.repository';
import { constants } from '../../../ws.utils/constants';

const sandbox = sinonTest.configureTest(sinon);

const context = {
  pathToDatasetDiff: path.resolve(__dirname, './fixtures/result--VS-work--ddf--ws-testing--master--output.txt'),
  previousConcepts: {},
  concepts: {
    company: {
      gid: 'company',
      type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
      originId: 'company'
    },
    anno: {
      gid: 'anno',
      type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
      originId: 'anno'
    },
    company_size: {
      gid: 'company_size',
      type: constants.CONCEPT_TYPE_ENTITY_SET,
      domain: 'company',
      originId: 'company_size'
    },
    lines_of_code: {
      gid: 'lines_of_code',
      type: constants.CONCEPT_TYPE_MEASURE,
      originId: 'lines_of_code'
    },
    project: {
      gid: 'project',
      type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
      originId: 'project'
    },
    longitude: {
      gid: 'longitude',
      originId: 'longitude'
    },
    latitude: {
      gid: 'latitude',
      originId: 'latitude'
    },
    num_users: {
      gid: 'num_users',
      originId: 'num_users'
    },
    full_name_changed: {
      gid: 'full_name_changed',
      originId: 'full_name_changed'
    },
    name: {
      gid: 'name',
      originId: 'name'
    },
    additional_column: {
      gid: 'additional_column',
      originId: 'additional_column'
    },
    english_speaking: {
      gid: 'english_speaking',
      type: constants.CONCEPT_TYPE_ENTITY_SET,
      domain: 'company',
      originId: 'english_speaking'
    },
    foundation: {
      gid: 'foundation',
      type: constants.CONCEPT_TYPE_ENTITY_SET,
      domain: 'company',
      originId: 'foundation'
    },
    country: {
      gid: 'country',
      originId: 'country'
    },
    region: {
      gid: 'region',
      type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
      originId: 'region'
    }
  },
  timeConcepts: {
    anno: {
      gid: 'anno',
      originId: 'anno'
    }
  },
  transaction: {
    _id: 'txCurrent',
    createdAt: 2222222
  },
  previousTransaction: {
    _id: 'txPrevious',
    createdAt: 1111111
  },
  dataset: {
    _id: 'datasetId'
  }
};

const segregatedEntities = {
  byGid: {
    ws: {domain: 'company', originId: 'wsOriginId'},
    gap: {domain: 'company', originId: 'gapOriginId'},
    mcrsft: {domain: 'company', originId: 'mcrsftOriginId'},
    1975: {
      domain: 'anno',
      originId: '1975OriginId'
    },
    2015: {
      domain: 'anno',
      originId: '2015OriginId'
    },
    2016: {
      domain: 'anno',
      originId: '2016OriginId'
    }
  },
  groupedByGid: {
    1975: [{
      domain: 'anno',
      originId: '1975OriginId'
    }],
    2015: [{
      domain: 'anno',
      originId: '2015OriginId'
    }],
    2016: [{
      domain: 'anno',
      originId: '2016OriginId'
    }],
    mcrsft: [{
      domain: 'company',
      originId: 'mcrsftOriginId'
    }],
    windows: [{
      domain: 'project',
      originId: 'windowsOriginId'
    }]
  }
};

const segregatedPreviousEntities = {
  groupedByGid: {
    mic: [{domain: 'company', originId: 'micOriginId'}]
  }
};

let readTextFileByLineAsJsonStreamOriginal;

describe('Datapoints incremental update flow', () => {
  beforeEach(() => {
    readTextFileByLineAsJsonStreamOriginal = fileUtils.readTextFileByLineAsJsonStream.bind(fileUtils);
  });

  it('creates newly added datapoints', sandbox(function (done: Function) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(segregatedPreviousEntities));

    this.stub(fileUtils, 'readTextFileByLineAsJsonStream').callsFake((pathToDiff: string) => {
      return readTextFileByLineAsJsonStreamOriginal(pathToDiff)
        .filter(({metadata}) => {
          return metadata.action === 'create';
        });
    });

    const createEntitiesFoundInDatapointsSaverWithCacheStub = this.stub(datapointsUtils, 'createEntitiesFoundInDatapointsSaverWithCache').returns((datapoints) => {
      return Promise.resolve(datapoints);
    });

    const collectedDatapoints = [];
    const saveDatapointsAndEntitiesFoundInThemStub = this.stub(datapointsUtils, 'saveDatapointsAndEntitiesFoundInThem').callsFake((saveEntitiesFoundInDatapoints, externalContextFrozen, datapointsFoundEntitiesStream) => {
      return datapointsFoundEntitiesStream
        .tap((datapointsWithFoundEntities) => {
          collectedDatapoints.push(datapointsWithFoundEntities);
        });
    });

    const loggerInfoStub = this.stub(logger, 'info');

    updateDatapoints(context, (errors, externalContext) => {
      expect(errors).to.not.exist;
      expect(externalContext).to.equal(context);

      sinon.assert.calledOnce(createEntitiesFoundInDatapointsSaverWithCacheStub);
      sinon.assert.calledOnce(saveDatapointsAndEntitiesFoundInThemStub);

      expect(collectedDatapoints.length).to.equal(2);

      sinon.assert.calledOnce(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, 'Start process of datapoints update');

      // FIRST CREATED DATAPOINT ASSERTION -----------------------------------------------------------------------------
      const datapoint1 = collectedDatapoints[0];
      expect(datapoint1.datapoint).to.deep.equal({
        company: 'mcrsft',
        anno: '2010',
        lines_of_code: '31111'
      });

      const expectedContext1 = Object.assign({
        segregatedEntities,
        segregatedPreviousEntities,
        filename: 'ddf--datapoints--lines_of_code--by--company--anno.csv',
        measures: {
          lines_of_code: {
            gid: 'lines_of_code',
            type: 'measure',
            originId: 'lines_of_code'
          }
        },
        dimensions: {
          company: {
            gid: 'company',
            type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
            originId: 'company'
          },
          anno: {
            gid: 'anno',
            type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
            originId: 'anno'
          }
        }
      }, context);

      expect(datapoint1.context).to.deep.equal(expectedContext1);
      expect(datapoint1.entitiesFoundInDatapoint.length).to.equal(1);

      const foundEntityInDatapoint1 = datapoint1.entitiesFoundInDatapoint[0];
      expect(foundEntityInDatapoint1.gid).to.equal('2010');
      expect(foundEntityInDatapoint1.domain).to.equal('anno');
      expect(foundEntityInDatapoint1.from).to.equal(context.transaction.createdAt);
      expect(foundEntityInDatapoint1.dataset).to.equal(context.dataset._id);
      expect(foundEntityInDatapoint1.sources).to.deep.equal(['ddf--datapoints--lines_of_code--by--company--anno.csv']);
      expect(foundEntityInDatapoint1.parsedProperties).to.deep.equal({
        anno: {
          millis: 1262304000000,
          timeType: 'YEAR_TYPE'
        }
      });
      expect(foundEntityInDatapoint1.properties).to.deep.equal({
        company: 'mcrsft',
        anno: '2010',
        lines_of_code: '31111'
      });

      // SECOND CREATED DATAPOINT ASSERTION -----------------------------------------------------------------------------
      const datapoint2 = collectedDatapoints[1];
      expect(datapoint2.datapoint).to.deep.equal({
        company: 'gap',
        project: 'ws',
        anno: '2014',
        lines_of_code: '52111'
      });

      const expectedContext2 = Object.assign({
        segregatedEntities,
        segregatedPreviousEntities,
        filename: 'ddf--datapoints--lines_of_code--by--company--project--anno.csv',
        measures: {
          lines_of_code: {
            gid: 'lines_of_code',
            type: 'measure',
            originId: 'lines_of_code'
          }
        },
        dimensions: {
          company: {
            gid: 'company',
            type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
            originId: 'company'
          },
          project: {
            gid: 'project',
            type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
            originId: 'project'
          },
          anno: {
            gid: 'anno',
            type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
            originId: 'anno'
          }
        }
      }, context);

      expect(datapoint2.context).to.deep.equal(expectedContext2);
      expect(datapoint2.entitiesFoundInDatapoint.length).to.equal(1);

      const foundEntityInDatapoint2 = datapoint2.entitiesFoundInDatapoint[0];
      expect(foundEntityInDatapoint2.gid).to.equal('2014');
      expect(foundEntityInDatapoint2.domain).to.equal('anno');
      expect(foundEntityInDatapoint2.from).to.equal(context.transaction.createdAt);
      expect(foundEntityInDatapoint2.dataset).to.equal(context.dataset._id);
      expect(foundEntityInDatapoint2.sources).to.deep.equal(['ddf--datapoints--lines_of_code--by--company--project--anno.csv']);
      expect(foundEntityInDatapoint2.parsedProperties).to.deep.equal({
        anno: {
          millis: 1388534400000,
          timeType: 'YEAR_TYPE'
        }
      });
      expect(foundEntityInDatapoint2.properties).to.deep.equal({
        company: 'gap',
        project: 'ws',
        anno: '2014',
        lines_of_code: '52111'
      });

      done();
    });
  }));

  it('updates existing datapoints', sandbox(function (done: Function): void {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(segregatedPreviousEntities));

    this.stub(fileUtils, 'readTextFileByLineAsJsonStream').callsFake((pathToDiff: string) => {
      return readTextFileByLineAsJsonStreamOriginal(pathToDiff)
        .filter(({metadata}) => {
          return metadata.action === 'change';
        });
    });

    this.stub(datapointsUtils, 'createEntitiesFoundInDatapointsSaverWithCache').returns((datapoints) => {
      return Promise.resolve(datapoints);
    });

    const collectedDatapoints = [];
    this.stub(datapointsUtils, 'saveDatapointsAndEntitiesFoundInThem').callsFake((saveEntitiesFoundInDatapoints, externalContextFrozen, datapointsFoundEntitiesStream) => {
      return datapointsFoundEntitiesStream
        .tap((datapointsWithFoundEntities) => {
          collectedDatapoints.push(datapointsWithFoundEntities);
        });
    });

    const measureToDatapoint = {
      company_size: {
        originId: 'company_sizeDatapointOriginId'
      },
      longitude: {
        originId: 'longitudeDatapointOriginId'
      },
      latitude: {
        originId: 'latitudeDatapointOriginId'
      },
      num_users: {
        originId: 'num_usersDatapointOriginId'
      }
    };

    this.stub(DatapointsRepositoryFactory, 'latestExceptCurrentVersion').returns({
      closeDatapointByMeasureAndDimensions: (options, callback) => {
        callback(null, measureToDatapoint[options.measureOriginId]);
      }
    });

    const loggerInfoStub = this.stub(logger, 'info');

    updateDatapoints(context, (errors, externalContext) => {
      expect(errors).to.not.exist;
      expect(externalContext).to.equal(context);

      expect(collectedDatapoints[0].datapoint).to.deep.equal({
        originId: 'company_sizeDatapointOriginId',
        company: 'mcrsft',
        anno: '1975',
        company_size: 'small'
      });

      expect(collectedDatapoints[1].datapoint).to.deep.equal({
        originId: 'longitudeDatapointOriginId',
        company: 'mcrsft',
        project: 'office',
        longitude: '34'
      });

      expect(collectedDatapoints[1].entitiesFoundInDatapoint).to.deep.equal([{
        gid: 'office',
        sources: [
          'ddf--datapoints--num_users--by--company--project.csv'
        ],
        properties: {
          company: 'mcrsft',
          project: 'office',
          longitude: '34',
          latitude: '74.32',
          num_users: '333'
        },
        parsedProperties: {},
        domain: 'project',
        sets: [],
        drillups: [],
        from: 2222222,
        dataset: 'datasetId'
      }]);

      expect(collectedDatapoints[1].context.filename).to.equal('ddf--datapoints--num_users--by--company--project.csv');
      expect(collectedDatapoints[1].context.dimensions).to.deep.equal({
        company: {
          gid: 'company',
          type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
          originId: 'company'
        },
        project: {
          gid: 'project',
          type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
          originId: 'project'
        }
      });
      expect(collectedDatapoints[1].context.measures).to.deep.equal({
        longitude: {
          gid: 'longitude',
          originId: 'longitude'
        },
        latitude: {
          gid: 'latitude',
          originId: 'latitude'
        },
        num_users: {
          gid: 'num_users',
          originId: 'num_users'
        }
      });
      expect(collectedDatapoints[1].context.segregatedEntities).to.equal(segregatedEntities);

      expect(collectedDatapoints[2].datapoint).to.deep.equal({
        originId: 'latitudeDatapointOriginId',
        company: 'mcrsft',
        project: 'office',
        latitude: '74.32'
      });

      expect(collectedDatapoints[3].datapoint).to.deep.equal({
        originId: 'num_usersDatapointOriginId',
        company: 'mcrsft',
        project: 'office',
        num_users: '333'
      });

      sinon.assert.calledTwice(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, 'Start process of datapoints update');
      sinon.assert.calledWithExactly(loggerInfoStub, 'Closing updated datapoints');

      done();
    });
  }));

  it('updates existing datapoints: datapoint to close was not found - this should be logged', sandbox(function (done: Function) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(segregatedPreviousEntities));

    this.stub(fileUtils, 'readTextFileByLineAsJsonStream').callsFake((pathToDiff: string) => {
      return readTextFileByLineAsJsonStreamOriginal(pathToDiff)
        .filter(({metadata}) => {
          return metadata.action === 'change';
        });
    });

    this.stub(datapointsUtils, 'createEntitiesFoundInDatapointsSaverWithCache').returns((datapoints) => {
      return Promise.resolve(datapoints);
    });

    const collectedDatapoints = [];
    this.stub(datapointsUtils, 'saveDatapointsAndEntitiesFoundInThem').callsFake((saveEntitiesFoundInDatapoints, externalContextFrozen, datapointsFoundEntitiesStream) => {
      return datapointsFoundEntitiesStream
        .tap((datapointsWithFoundEntities) => {
          collectedDatapoints.push(datapointsWithFoundEntities);
        });
    });

    this.stub(DatapointsRepositoryFactory, 'latestExceptCurrentVersion').returns({
      closeDatapointByMeasureAndDimensions: (options, callback) => {
        callback();
      }
    });

    const loggerErrorStub = this.stub(logger, 'error');
    const loggerInfoStub = this.stub(logger, 'info');

    updateDatapoints(context, (errors, externalContext) => {
      expect(errors).to.not.exist;
      expect(externalContext).to.equal(context);

      expect(collectedDatapoints).to.deep.equal([
        undefined,
        undefined,
        undefined,
        undefined
      ]);

      sinon.assert.callCount(loggerErrorStub, 4);
      sinon.assert.calledWith(loggerErrorStub, 'Datapoint that should be closed was not found by given params: ');

      sinon.assert.calledTwice(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, 'Start process of datapoints update');
      sinon.assert.calledWithExactly(loggerInfoStub, 'Closing updated datapoints');

      done();
    });
  }));

  it('updates existing datapoints: error had happened while closing datapoint', sandbox(function (done: Function) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(segregatedPreviousEntities));

    this.stub(fileUtils, 'readTextFileByLineAsJsonStream').callsFake((pathToDiff: string) => {
      return readTextFileByLineAsJsonStreamOriginal(pathToDiff)
        .filter(({metadata}) => {
          return metadata.action === 'change';
        });
    });

    this.stub(datapointsUtils, 'createEntitiesFoundInDatapointsSaverWithCache').returns((datapoints) => {
      return Promise.resolve(datapoints);
    });

    const collectedDatapoints = [];
    this.stub(datapointsUtils, 'saveDatapointsAndEntitiesFoundInThem').callsFake((saveEntitiesFoundInDatapoints, externalContextFrozen, datapointsFoundEntitiesStream) => {
      return datapointsFoundEntitiesStream
        .tap((datapointsWithFoundEntities) => {
          collectedDatapoints.push(datapointsWithFoundEntities);
        });
    });

    const expectedError = 'Boo!';

    this.stub(DatapointsRepositoryFactory, 'latestExceptCurrentVersion').returns({
      closeDatapointByMeasureAndDimensions: (options, callback) => {
        callback(expectedError);
      }
    });

    const loggerInfoStub = this.stub(logger, 'info');

    updateDatapoints(context, (errors, externalContext) => {
      expect(errors).to.deep.equal([expectedError]);
      expect(externalContext).to.equal(context);

      sinon.assert.calledTwice(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, 'Start process of datapoints update');
      sinon.assert.calledWithExactly(loggerInfoStub, 'Closing updated datapoints');

      done();
    });
  }));

  it('remove existing datapoints', sandbox(function (done: Function) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(segregatedPreviousEntities));

    this.stub(fileUtils, 'readTextFileByLineAsJsonStream').callsFake((pathToDiff: string) => {
      return readTextFileByLineAsJsonStreamOriginal(pathToDiff)
        .filter(({metadata}) => {
          return metadata.action === 'remove';
        });
    });

    this.stub(datapointsUtils, 'createEntitiesFoundInDatapointsSaverWithCache').returns((datapoints) => {
      return Promise.resolve(datapoints);
    });

    const collectedDatapoints = [];
    this.stub(datapointsUtils, 'saveDatapointsAndEntitiesFoundInThem').callsFake((saveEntitiesFoundInDatapoints, externalContextFrozen, datapointsFoundEntitiesStream) => {
      return datapointsFoundEntitiesStream
        .tap((datapointsWithFoundEntities) => {
          collectedDatapoints.push(datapointsWithFoundEntities);
        });
    });

    const closeDatapointByMeasureAndDimensionsStub = this.stub().callsArgWithAsync(1, null, {});
    this.stub(DatapointsRepositoryFactory, 'latestExceptCurrentVersion').returns({
      closeDatapointByMeasureAndDimensions: closeDatapointByMeasureAndDimensionsStub
    });

    const loggerInfoStub = this.stub(logger, 'info');

    updateDatapoints(context, (errors: any[], externalContext: any) => {
      expect(errors).to.not.exist;
      expect(externalContext).to.equal(context);
      expect(collectedDatapoints).to.deep.equal([undefined], 'Here we have "undefined" cause deleted datapoints should not be pushed down the stream after removal');

      sinon.assert.calledThrice(closeDatapointByMeasureAndDimensionsStub);
      const closeDatapointByMeasureAndDimensionsArgs = closeDatapointByMeasureAndDimensionsStub.args;
      expect(closeDatapointByMeasureAndDimensionsArgs[0][0]).to.deep.equal({
        measureOriginId: 'longitude',
        dimensionsEntityOriginIds: [
          'mcrsftOriginId',
          'windowsOriginId'
        ],
        time: undefined,
        datapointValue: '90'
      });
      expect(closeDatapointByMeasureAndDimensionsArgs[1][0]).to.deep.equal({
        measureOriginId: 'latitude',
        dimensionsEntityOriginIds: [
          'mcrsftOriginId',
          'windowsOriginId'
        ],
        time: undefined,
        datapointValue: '44.1'
      });
      expect(closeDatapointByMeasureAndDimensionsArgs[2][0]).to.deep.equal({
        measureOriginId: 'num_users',
        dimensionsEntityOriginIds: [
          'mcrsftOriginId',
          'windowsOriginId'
        ],
        time: undefined,
        datapointValue: '4'
      });

      sinon.assert.calledTwice(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, 'Start process of datapoints update');
      sinon.assert.calledWithExactly(loggerInfoStub, 'Closing removed datapoints');

      done();
    });
  }));

  it('remove existing datapoints: datapoint to close was not found - this should be logged', sandbox(function (done: Function) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(segregatedPreviousEntities));

    this.stub(fileUtils, 'readTextFileByLineAsJsonStream').callsFake((pathToDiff: string) => {
      return readTextFileByLineAsJsonStreamOriginal(pathToDiff)
        .filter(({metadata}) => {
          return metadata.action === 'remove';
        });
    });

    this.stub(datapointsUtils, 'createEntitiesFoundInDatapointsSaverWithCache').returns((datapoints) => {
      return Promise.resolve(datapoints);
    });

    const collectedDatapoints = [];
    this.stub(datapointsUtils, 'saveDatapointsAndEntitiesFoundInThem').callsFake((saveEntitiesFoundInDatapoints, externalContextFrozen, datapointsFoundEntitiesStream) => {
      return datapointsFoundEntitiesStream
        .tap((datapointsWithFoundEntities) => {
          collectedDatapoints.push(datapointsWithFoundEntities);
        });
    });

    const closeDatapointByMeasureAndDimensionsStub = this.stub().callsArgWithAsync(1, null, null);
    this.stub(DatapointsRepositoryFactory, 'latestExceptCurrentVersion').returns({
      closeDatapointByMeasureAndDimensions: closeDatapointByMeasureAndDimensionsStub
    });

    const loggerErrorStub = this.stub(logger, 'error');
    const loggerInfoStub = this.stub(logger, 'info');

    updateDatapoints(context, (errors, externalContext) => {
      expect(errors).to.not.exist;
      expect(externalContext).to.equal(context);

      sinon.assert.callCount(loggerErrorStub, 3);
      sinon.assert.calledWith(loggerErrorStub, 'Datapoint that should be closed was not found by given params: ');

      sinon.assert.calledTwice(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, 'Start process of datapoints update');
      sinon.assert.calledWithExactly(loggerInfoStub, 'Closing removed datapoints');

      done();
    });
  }));

  it('remove existing datapoints: error had happened while closing datapoint', sandbox(function (done: Function) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(segregatedPreviousEntities));

    this.stub(fileUtils, 'readTextFileByLineAsJsonStream').callsFake((pathToDiff: string) => {
      return readTextFileByLineAsJsonStreamOriginal(pathToDiff)
        .filter(({metadata}) => {
          return metadata.action === 'remove';
        });
    });

    this.stub(datapointsUtils, 'createEntitiesFoundInDatapointsSaverWithCache').returns((datapoints) => {
      return Promise.resolve(datapoints);
    });

    const collectedDatapoints = [];
    this.stub(datapointsUtils, 'saveDatapointsAndEntitiesFoundInThem').callsFake((saveEntitiesFoundInDatapoints, externalContextFrozen, datapointsFoundEntitiesStream) => {
      return datapointsFoundEntitiesStream
        .tap((datapointsWithFoundEntities) => {
          collectedDatapoints.push(datapointsWithFoundEntities);
        });
    });

    const expectedError = 'Boo!';
    const closeDatapointByMeasureAndDimensionsStub = this.stub().callsArgWithAsync(1, expectedError);
    this.stub(DatapointsRepositoryFactory, 'latestExceptCurrentVersion').returns({
      closeDatapointByMeasureAndDimensions: closeDatapointByMeasureAndDimensionsStub
    });

    const loggerInfoStub = this.stub(logger, 'info');

    updateDatapoints(context, (errors, externalContext) => {
      expect(errors).to.deep.equal([expectedError]);
      expect(externalContext).to.equal(context);

      sinon.assert.calledTwice(loggerInfoStub);
      sinon.assert.calledWithExactly(loggerInfoStub, 'Start process of datapoints update');
      sinon.assert.calledWithExactly(loggerInfoStub, 'Closing removed datapoints');

      done();
    });
  }));
});
