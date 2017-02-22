import '../../../ws.repository';

import * as path from 'path';
import * as sinon from 'sinon';
import { expect } from 'chai';

import * as fileUtils from '../../../ws.utils/file';
import * as datapointsUtils from '../../../ws.import/utils/datapoints.utils';
import { updateDatapoints } from '../../../ws.import/incremental/update-datapoints';
import { logger } from '../../../ws.config/log';
import { DatapointsRepositoryFactory } from '../../../ws.repository/ddf/data-points/data-points.repository';

const context = {
  pathToDatasetDiff: path.resolve(__dirname, './fixtures/result--VS-work--ddf--ws-testing--master--output.txt'),
  previousConcepts: {},
  concepts: {
    company: {
      gid: 'company',
      originId: 'company'
    },
    anno: {
      gid: 'anno',
      originId: 'anno'
    },
    company_size: {
      gid: 'company_size',
      originId: 'company_size'
    },
    lines_of_code: {
      gid: 'lines_of_code',
      originId: 'lines_of_code'
    },
    project: {
      gid: 'project',
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
      originId: 'english_speaking'
    },
    foundation: {
      gid: 'foundation',
      originId: 'foundation'
    },
    country: {
      gid: 'country',
      originId: 'country'
    },
    region: {
      gid: 'region',
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
  },
};

const segregatedEntities = {
  byGid: {
    ws: {originId: 'wsOriginId'},
    gap: {originId: 'gapOriginId'},
    mcrsft: {originId: 'mcrsftOriginId'},
    1975: {
      originId: '1975OriginId'
    },
    2015: {
      originId: '2015OriginId'
    },
    2016: {
      originId: '2016OriginId'
    }
  },
  groupedByGid: {
    1975: [{
      originId: '1975OriginId'
    }],
    2015: [{
      originId: '2015OriginId'
    }],
    2016: [{
      originId: '2016OriginId'
    }],
    mcrsft: [{
      originId: 'mcrsftOriginId'
    }],
    windows: [{
      originId: 'windowsOriginId'
    }]
  }
};

const segregatedPreviousEntities = {
  groupedByGid: {
    mic: [{originId: 'micOriginId'}]
  }
};

let readTextFileByLineAsJsonStreamOriginal;

describe('Datapoints incremental update flow', () => {
  beforeEach(() => {
    readTextFileByLineAsJsonStreamOriginal = fileUtils.readTextFileByLineAsJsonStream.bind(fileUtils);
  });

  it('creates newly added datapoints', sinon.test(function (done) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(segregatedPreviousEntities));

    this.stub(fileUtils, 'readTextFileByLineAsJsonStream', (pathToDiff: string) => {
      return readTextFileByLineAsJsonStreamOriginal(pathToDiff)
        .filter(({metadata}) => {
          return metadata.action === 'create';
        });
    });

    const createEntitiesFoundInDatapointsSaverWithCacheStub = this.stub(datapointsUtils, 'createEntitiesFoundInDatapointsSaverWithCache').returns(datapoints => {
      return Promise.resolve(datapoints);
    });

    const collectedDatapoints = [];
    const saveDatapointsAndEntitiesFoundInThemStub = this.stub(datapointsUtils, 'saveDatapointsAndEntitiesFoundInThem', (saveEntitiesFoundInDatapoints, externalContextFrozen, datapointsFoundEntitiesStream) => {
      return datapointsFoundEntitiesStream
        .tap(datapointsWithFoundEntities => {
          collectedDatapoints.push(datapointsWithFoundEntities);
        });
    });

    updateDatapoints(context, (errors, externalContext) => {
      expect(errors).to.not.exist;
      expect(externalContext).to.equal(context);

      sinon.assert.calledOnce(createEntitiesFoundInDatapointsSaverWithCacheStub);
      sinon.assert.calledOnce(saveDatapointsAndEntitiesFoundInThemStub);

      expect(collectedDatapoints.length).to.equal(2);

      // FIRST CREATED DATAPOINT ASSERTION -----------------------------------------------------------------------------
      const datapoint1 = collectedDatapoints[0];
      expect(datapoint1.datapoint).to.deep.equal({
        "company": "mcrsft",
        "anno": "2010",
        "lines_of_code": "31111"
      });

      const expectedContext1 = Object.assign({
        segregatedEntities,
        segregatedPreviousEntities,
        filename: 'ddf--datapoints--lines_of_code--by--company--anno.csv',
        "measures": {
          "lines_of_code": {
            "gid": "lines_of_code",
            "originId": "lines_of_code"
          }
        },
        "dimensions": {
          "company": {
            "gid": "company",
            "originId": "company"
          },
          "anno": {
            "gid": "anno",
            "originId": "anno"
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
        "anno": {
          "millis": 1262304000000,
          "timeType": "YEAR_TYPE"
        }
      });
      expect(foundEntityInDatapoint1.properties).to.deep.equal({
        "company": "mcrsft",
        "anno": "2010",
        "lines_of_code": "31111"
      });

      // SECOND CREATED DATAPOINT ASSERTION -----------------------------------------------------------------------------
      const datapoint2 = collectedDatapoints[1];
      expect(datapoint2.datapoint).to.deep.equal({
        "company": "gap",
        "project": "ws",
        "anno": "2014",
        "lines_of_code": "52111"
      });

      const expectedContext2 = Object.assign({
        segregatedEntities,
        segregatedPreviousEntities,
        filename: 'ddf--datapoints--lines_of_code--by--company--project--anno.csv',
        "measures": {
          "lines_of_code": {
            "gid": "lines_of_code",
            "originId": "lines_of_code"
          }
        },
        "dimensions": {
          "company": {
            "gid": "company",
            "originId": "company"
          },
          "project": {
            "gid": "project",
            "originId": "project"
          },
          "anno": {
            "gid": "anno",
            "originId": "anno"
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
      expect(foundEntityInDatapoint2.sources).to.deep.equal(["ddf--datapoints--lines_of_code--by--company--project--anno.csv"]);
      expect(foundEntityInDatapoint2.parsedProperties).to.deep.equal({
        "anno": {
          "millis": 1388534400000,
          "timeType": "YEAR_TYPE"
        }
      });
      expect(foundEntityInDatapoint2.properties).to.deep.equal({
        "company": "gap",
        "project": "ws",
        "anno": "2014",
        "lines_of_code": "52111"
      });

      done();
    });
  }));

  it('updates existing datapoints', sinon.test(function (done) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(segregatedPreviousEntities));

    this.stub(fileUtils, 'readTextFileByLineAsJsonStream', (pathToDiff: string) => {
      return readTextFileByLineAsJsonStreamOriginal(pathToDiff)
        .filter(({metadata}) => {
          return metadata.action === 'change';
        });
    });

    this.stub(datapointsUtils, 'createEntitiesFoundInDatapointsSaverWithCache').returns(datapoints => {
      return Promise.resolve(datapoints);
    });

    const collectedDatapoints = [];
    this.stub(datapointsUtils, 'saveDatapointsAndEntitiesFoundInThem', (saveEntitiesFoundInDatapoints, externalContextFrozen, datapointsFoundEntitiesStream) => {
      return datapointsFoundEntitiesStream
        .tap(datapointsWithFoundEntities => {
          collectedDatapoints.push(datapointsWithFoundEntities);
        });
    });

    const measureToDatapoint = {
      company_size: {
        originId: "company_sizeDatapointOriginId",
      },
      longitude: {
        originId: "longitudeDatapointOriginId",
      },
      latitude: {
        originId: "latitudeDatapointOriginId",
      },
      num_users: {
        originId: "num_usersDatapointOriginId",
      },
    };

    this.stub(DatapointsRepositoryFactory, 'latestExceptCurrentVersion').returns({
      closeDatapointByMeasureAndDimensionsAndValue: (options, callback) => {
        callback(null, measureToDatapoint[options.measureOriginId]);
      }
    });

    updateDatapoints(context, (errors, externalContext) => {
      expect(errors).to.not.exist;
      expect(externalContext).to.equal(context);

      expect(collectedDatapoints[0].datapoint).to.deep.equal({
        "originId": "company_sizeDatapointOriginId",
        "company": "mcrsft",
        "anno": "1975",
        "company_size": "small"
      });

      expect(collectedDatapoints[1].datapoint).to.deep.equal({
        "originId": "longitudeDatapointOriginId",
        "company": "mcrsft",
        "project": "office",
        "longitude": "34"
      });

      expect(collectedDatapoints[1].entitiesFoundInDatapoint).to.deep.equal([{
        "gid": "office",
        "sources": [
          "ddf--datapoints--num_users--by--company--project.csv"
        ],
        "properties": {
          "company": "mcrsft",
          "project": "office",
          "longitude": "34",
          "latitude": "74.32",
          "num_users": "333"
        },
        "parsedProperties": {},
        "domain": "project",
        "sets": [],
        "drillups": [],
        "from": 2222222,
        "dataset": "datasetId"
      }]);

      expect(collectedDatapoints[1].context.filename).to.equal('ddf--datapoints--num_users--by--company--project.csv');
      expect(collectedDatapoints[1].context.dimensions).to.deep.equal({
        "company": {
          "gid": "company",
          "originId": "company"
        },
        "project": {
          "gid": "project",
          "originId": "project"
        }
      });
      expect(collectedDatapoints[1].context.measures).to.deep.equal({
        "longitude": {
          "gid": "longitude",
          "originId": "longitude"
        },
        "latitude": {
          "gid": "latitude",
          "originId": "latitude"
        },
        "num_users": {
          "gid": "num_users",
          "originId": "num_users"
        }
      });
      expect(collectedDatapoints[1].context.segregatedEntities).to.equal(segregatedEntities);

      expect(collectedDatapoints[2].datapoint).to.deep.equal({
        "originId": "latitudeDatapointOriginId",
        "company": "mcrsft",
        "project": "office",
        "latitude": "74.32"
      });

      expect(collectedDatapoints[3].datapoint).to.deep.equal({
        "originId": "num_usersDatapointOriginId",
        "company": "mcrsft",
        "project": "office",
        "num_users": "333"
      });

      done();
    });
  }));

  it('updates existing datapoints: datapoint to close was not found - this should be logged', sinon.test(function (done) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(segregatedPreviousEntities));

    this.stub(fileUtils, 'readTextFileByLineAsJsonStream', (pathToDiff: string) => {
      return readTextFileByLineAsJsonStreamOriginal(pathToDiff)
        .filter(({metadata}) => {
          return metadata.action === 'change';
        });
    });

    this.stub(datapointsUtils, 'createEntitiesFoundInDatapointsSaverWithCache').returns(datapoints => {
      return Promise.resolve(datapoints);
    });

    const collectedDatapoints = [];
    this.stub(datapointsUtils, 'saveDatapointsAndEntitiesFoundInThem', (saveEntitiesFoundInDatapoints, externalContextFrozen, datapointsFoundEntitiesStream) => {
      return datapointsFoundEntitiesStream
        .tap(datapointsWithFoundEntities => {
          collectedDatapoints.push(datapointsWithFoundEntities);
        });
    });

    this.stub(DatapointsRepositoryFactory, 'latestExceptCurrentVersion').returns({
      closeDatapointByMeasureAndDimensionsAndValue: (options, callback) => {
        callback();
      }
    });

    const loggerErrorStub = this.stub(logger, 'error');

    updateDatapoints(context, (errors, externalContext) => {
      expect(errors).to.not.exist;
      expect(externalContext).to.equal(context);

      expect(collectedDatapoints).to.deep.equal([
        undefined,
        undefined,
        undefined,
        undefined,
      ]);

      sinon.assert.callCount(loggerErrorStub, 4);
      sinon.assert.calledWith(loggerErrorStub, 'Datapoint that should be closed was not found by given params: ');

      done();
    });
  }));

  it('updates existing datapoints: error had happened while closing datapoint', sinon.test(function (done) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(segregatedPreviousEntities));

    this.stub(fileUtils, 'readTextFileByLineAsJsonStream', (pathToDiff: string) => {
      return readTextFileByLineAsJsonStreamOriginal(pathToDiff)
        .filter(({metadata}) => {
          return metadata.action === 'change';
        });
    });

    this.stub(datapointsUtils, 'createEntitiesFoundInDatapointsSaverWithCache').returns(datapoints => {
      return Promise.resolve(datapoints);
    });

    const collectedDatapoints = [];
    this.stub(datapointsUtils, 'saveDatapointsAndEntitiesFoundInThem', (saveEntitiesFoundInDatapoints, externalContextFrozen, datapointsFoundEntitiesStream) => {
      return datapointsFoundEntitiesStream
        .tap(datapointsWithFoundEntities => {
          collectedDatapoints.push(datapointsWithFoundEntities);
        });
    });

    const expectedError = 'Boo!';

    this.stub(DatapointsRepositoryFactory, 'latestExceptCurrentVersion').returns({
      closeDatapointByMeasureAndDimensionsAndValue: (options, callback) => {
        callback(expectedError);
      }
    });

    updateDatapoints(context, (errors, externalContext) => {
      expect(errors).to.deep.equal([expectedError]);
      expect(externalContext).to.equal(context);
      done();
    });
  }));

  it('remove existing datapoints', sinon.test(function (done) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(segregatedPreviousEntities));

    this.stub(fileUtils, 'readTextFileByLineAsJsonStream', (pathToDiff: string) => {
      return readTextFileByLineAsJsonStreamOriginal(pathToDiff)
        .filter(({metadata}) => {
          return metadata.action === 'remove';
        });
    });

    this.stub(datapointsUtils, 'createEntitiesFoundInDatapointsSaverWithCache').returns(datapoints => {
      return Promise.resolve(datapoints);
    });

    const collectedDatapoints = [];
    this.stub(datapointsUtils, 'saveDatapointsAndEntitiesFoundInThem', (saveEntitiesFoundInDatapoints, externalContextFrozen, datapointsFoundEntitiesStream) => {
      return datapointsFoundEntitiesStream
        .tap(datapointsWithFoundEntities => {
          collectedDatapoints.push(datapointsWithFoundEntities);
        });
    });

    const closeDatapointByMeasureAndDimensionsAndValueStub = this.stub().callsArgWithAsync(1, null, {});
    this.stub(DatapointsRepositoryFactory, 'latestExceptCurrentVersion').returns({
      closeDatapointByMeasureAndDimensionsAndValue: closeDatapointByMeasureAndDimensionsAndValueStub
    });

    updateDatapoints(context, (errors, externalContext) => {
      expect(errors).to.not.exist;
      expect(externalContext).to.equal(context);
      expect(collectedDatapoints).to.deep.equal([undefined], 'Here we have "undefined" cause deleted datapoints should not be pushed down the stream after removal');

      sinon.assert.calledThrice(closeDatapointByMeasureAndDimensionsAndValueStub);
      sinon.assert.calledWith(closeDatapointByMeasureAndDimensionsAndValueStub, {
        "measureOriginId": "longitude",
        "dimensionsSize": 2,
        "dimensionsEntityOriginIds": [
          "mcrsftOriginId",
          "windowsOriginId"
        ],
        "datapointValue": "90"
      });

      sinon.assert.calledWith(closeDatapointByMeasureAndDimensionsAndValueStub, {
        "measureOriginId": "latitude",
        "dimensionsSize": 2,
        "dimensionsEntityOriginIds": [
          "mcrsftOriginId",
          "windowsOriginId"
        ],
        "datapointValue": "44.1"
      });

      sinon.assert.calledWith(closeDatapointByMeasureAndDimensionsAndValueStub, {
        "measureOriginId": "num_users",
        "dimensionsSize": 2,
        "dimensionsEntityOriginIds": [
          "mcrsftOriginId",
          "windowsOriginId"
        ],
        "datapointValue": "4"
      });

      done();
    });
  }));

  it('remove existing datapoints: datapoint to close was not found - this should be logged', sinon.test(function (done) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(segregatedPreviousEntities));

    this.stub(fileUtils, 'readTextFileByLineAsJsonStream', (pathToDiff: string) => {
      return readTextFileByLineAsJsonStreamOriginal(pathToDiff)
        .filter(({metadata}) => {
          return metadata.action === 'remove';
        });
    });

    this.stub(datapointsUtils, 'createEntitiesFoundInDatapointsSaverWithCache').returns(datapoints => {
      return Promise.resolve(datapoints);
    });

    const collectedDatapoints = [];
    this.stub(datapointsUtils, 'saveDatapointsAndEntitiesFoundInThem', (saveEntitiesFoundInDatapoints, externalContextFrozen, datapointsFoundEntitiesStream) => {
      return datapointsFoundEntitiesStream
        .tap(datapointsWithFoundEntities => {
          collectedDatapoints.push(datapointsWithFoundEntities);
        });
    });

    const closeDatapointByMeasureAndDimensionsAndValueStub = this.stub().callsArgWithAsync(1, null, null);
    this.stub(DatapointsRepositoryFactory, 'latestExceptCurrentVersion').returns({
      closeDatapointByMeasureAndDimensionsAndValue: closeDatapointByMeasureAndDimensionsAndValueStub
    });

    const loggerErrorStub = this.stub(logger, 'error');

    updateDatapoints(context, (errors, externalContext) => {
      expect(errors).to.not.exist;
      expect(externalContext).to.equal(context);

      sinon.assert.callCount(loggerErrorStub, 3);
      sinon.assert.calledWith(loggerErrorStub, 'Datapoint that should be closed was not found by given params: ');

      done();
    });
  }));

  it('remove existing datapoints: error had happened while closing datapoint', sinon.test(function (done) {
    this.stub(datapointsUtils, 'findAllEntities').returns(Promise.resolve(segregatedEntities));
    this.stub(datapointsUtils, 'findAllPreviousEntities').returns(Promise.resolve(segregatedPreviousEntities));

    this.stub(fileUtils, 'readTextFileByLineAsJsonStream', (pathToDiff: string) => {
      return readTextFileByLineAsJsonStreamOriginal(pathToDiff)
        .filter(({metadata}) => {
          return metadata.action === 'remove';
        });
    });

    this.stub(datapointsUtils, 'createEntitiesFoundInDatapointsSaverWithCache').returns(datapoints => {
      return Promise.resolve(datapoints);
    });

    const collectedDatapoints = [];
    this.stub(datapointsUtils, 'saveDatapointsAndEntitiesFoundInThem', (saveEntitiesFoundInDatapoints, externalContextFrozen, datapointsFoundEntitiesStream) => {
      return datapointsFoundEntitiesStream
        .tap(datapointsWithFoundEntities => {
          collectedDatapoints.push(datapointsWithFoundEntities);
        });
    });

    const expectedError = 'Boo!';
    const closeDatapointByMeasureAndDimensionsAndValueStub = this.stub().callsArgWithAsync(1, expectedError);
    this.stub(DatapointsRepositoryFactory, 'latestExceptCurrentVersion').returns({
      closeDatapointByMeasureAndDimensionsAndValue: closeDatapointByMeasureAndDimensionsAndValueStub
    });

    updateDatapoints(context, (errors, externalContext) => {
      expect(errors).to.deep.equal([expectedError]);
      expect(externalContext).to.equal(context);
      done();
    });
  }));
});