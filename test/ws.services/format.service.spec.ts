import 'mocha';

import {expect} from 'chai';
import * as sinon from 'sinon';
import * as hi from 'highland';

import '../../ws.repository';

import * as wsJsonFormatter from '../../ws.routes/data-post-processors/format/format-ws.processor';
import * as formatService from '../../ws.services/format.service';
import {constants} from '../../ws.utils/constants';

describe('Format Service', () => {

  it('should use WsJson formatter as the default one', function () {
    expect(formatService.wsJson).to.be.instanceof(Function);
    expect(formatService.wsJson).to.equal(formatService.default);
  });

  it('should format datapoints data in WsJson', sinon.test(function (done) {
    const data = {
      rawDdf: {
        dataset: {
          name: 'datasetName'
        },
        transaction: {
          commit: 'aaaaaaa'
        }
      },
      type: constants.DATAPOINTS
    };

    const expectedDatapointsResponse = {headers: ['name'], rows: ['datapoint']};
    const mapDatapointsStub = this.stub(wsJsonFormatter, 'mapDatapoints').returns(expectedDatapointsResponse);

    formatService.wsJson(data, (error, formattedData) => {
      expect(error).to.not.exist;
      expect(formattedData).to.deep.equal(expectedDatapointsResponse);

      sinon.assert.calledOnce(mapDatapointsStub);
      sinon.assert.calledWith(mapDatapointsStub, data.rawDdf);

      expect(mapDatapointsStub.args[0][0].datasetName).to.equal(data.rawDdf.dataset.name);
      expect(mapDatapointsStub.args[0][0].datasetVersionCommit).to.equal(data.rawDdf.transaction.commit);

      done();
    });
  }));

  it('should format concepts data in WsJson', sinon.test(function (done) {
    const data = {
      rawDdf: {
        dataset: {
          name: 'datasetName'
        },
        transaction: {
          commit: 'aaaaaaa'
        }
      },
      type: constants.CONCEPTS
    };

    const expectedResponse = {headers: ['name'], rows: ['concept']};
    const mapConceptsStub = this.stub(wsJsonFormatter, 'mapConcepts').returns(expectedResponse);

    formatService.wsJson(data, (error, formattedData) => {
      expect(error).to.not.exist;
      expect(formattedData).to.deep.equal(expectedResponse);

      sinon.assert.calledOnce(mapConceptsStub);
      sinon.assert.calledWith(mapConceptsStub, data.rawDdf);

      expect(mapConceptsStub.args[0][0].datasetName).to.equal(data.rawDdf.dataset.name);
      expect(mapConceptsStub.args[0][0].datasetVersionCommit).to.equal(data.rawDdf.transaction.commit);

      done();
    });
  }));

  it('should format entities data in WsJson', sinon.test(function (done) {
    const data = {
      rawDdf: {
        dataset: {
          name: 'datasetName'
        },
        transaction: {
          commit: 'aaaaaaa'
        }
      },
      type: constants.ENTITIES
    };

    const expectedResponse = {headers: ['name'], rows: ['entity']};
    const mapEntitiesStub = this.stub(wsJsonFormatter, 'mapEntities').returns(expectedResponse);

    formatService.wsJson(data, (error, formattedData) => {
      expect(error).to.not.exist;
      expect(formattedData).to.deep.equal(expectedResponse);

      sinon.assert.calledOnce(mapEntitiesStub);
      sinon.assert.calledWith(mapEntitiesStub, data.rawDdf);

      expect(mapEntitiesStub.args[0][0].datasetName).to.equal(data.rawDdf.dataset.name);
      expect(mapEntitiesStub.args[0][0].datasetVersionCommit).to.equal(data.rawDdf.transaction.commit);
      done();
    });
  }));

  it('should format schema data in WsJson', sinon.test(function (done) {
    const data = {
      rawDdf: {
        dataset: {
          name: 'datasetName'
        },
        transaction: {
          commit: 'aaaaaaa'
        }
      },
      type: constants.SCHEMA
    };

    const expectedResponse = {headers: ['name'], rows: ['schema']};
    const mapSchemaStub = this.stub(wsJsonFormatter, 'mapSchema').returns(expectedResponse);

    formatService.wsJson(data, (error, formattedData) => {
      expect(error).to.not.exist;
      expect(formattedData).to.deep.equal(expectedResponse);

      sinon.assert.calledOnce(mapSchemaStub);
      sinon.assert.calledWith(mapSchemaStub, data.rawDdf);

      expect(mapSchemaStub.args[0][0].datasetName).to.equal(data.rawDdf.dataset.name);
      expect(mapSchemaStub.args[0][0].datasetVersionCommit).to.equal(data.rawDdf.transaction.commit);
      done();
    });
  }));

  it('should respond with an empty object if data type is unknown', sinon.test(function (done) {
    const data = {
      rawDdf: {
        dataset: {
          name: 'datasetName'
        },
        transaction: {
          commit: 'aaaaaaa'
        }
      },
      type: 'notExisted'
    };

    formatService.wsJson(data, (error, formattedData) => {
      expect(error).to.not.exist;
      expect(formattedData).to.deep.equal({});
      done();
    });
  }));

  it('should format with empty object by default if data was not given', sinon.test(function (done) {
    const data = {
      type: constants.SCHEMA
    };

    const mapSchemaStub = this.stub(wsJsonFormatter, 'mapSchema');


    formatService.wsJson(data, error => {
      expect(error).to.not.exist;

      sinon.assert.calledOnce(mapSchemaStub);
      expect(mapSchemaStub.args[0][0]).to.have.ownProperty('datasetName');
      expect(mapSchemaStub.args[0][0]).to.have.ownProperty('datasetVersionCommit');
      done();
    });
  }));

  it('should format datapoints data as CSV', sinon.test(function (done) {
    const data = {
      rawDdf: {
        dataset: {
          name: 'datasetName'
        },
        transaction: {
          commit: 'aaaaaaa'
        }
      },
      type: constants.DATAPOINTS
    };

    const wsJsonFormattedData = {headers: ['anno', 'population'], rows: [['1900', 20000], ['1901', 30000], ['1902', 40000]]};
    this.stub(wsJsonFormatter, 'mapDatapoints').returns(wsJsonFormattedData);

    formatService.csv(data, (error, formattedData) => {
      expect(error).to.not.exist;

      hi(formattedData).toArray(csv => {
        const header = Buffer.from(csv[0]).toString();
        const row1 = Buffer.from(csv[1]).toString();
        const row2 = Buffer.from(csv[2]).toString();
        const row3 = Buffer.from(csv[3]).toString();

        expect(header).to.equal("anno,population");
        expect(row1).to.equal("\n1900,20000");
        expect(row2).to.equal("\n1901,30000");
        expect(row3).to.equal("\n1902,40000");
        done();
      });
    });
  }));

});
