import '../../../../ws.repository';

import * as sinon from 'sinon';
import {expect} from 'chai'
import * as proxyquire from 'proxyquire';
import * as stream from 'stream';
import {constants} from '../../../../ws.utils/constants';
import * as routesUtils from '../../../../ws.routes/utils';

describe('Format Post Processor', () => {
  it('should respond with an error if formatting failed', sinon.test(function () {

    const expectedError = 'Boo!';
    const expectedErrorResponse = {success: false, error: expectedError};

    const toErrorResponseSpy = this.spy(routesUtils, 'toErrorResponse');

    const jsonSpy = this.spy();

    const req = {
      query: {
        format: 'bla'
      },
      rawData: [],
      ddfDataType: constants.CONCEPTS
    };

    const res = {
      use_express_redis_cache: true,
      json: jsonSpy
    };

    const formatter = proxyquire('../../../../ws.routes/data-post-processors/format', {
      './format.processor': {
        format: (data, formatType, onFormatted) => {
          expect(data).to.equal(req.rawData);
          expect(formatType).to.equal(req.query.format);

          onFormatted(expectedError);
        }
      }
    }).formatMiddleware;

    formatter(req, res);

    expect(res.use_express_redis_cache).to.equal(false);
    sinon.assert.calledOnce(jsonSpy);
    sinon.assert.calledWith(jsonSpy, expectedErrorResponse);

    sinon.assert.calledOnce(toErrorResponseSpy);
    sinon.assert.calledWith(toErrorResponseSpy, expectedError);
  }));

  it('should send response as data with Content-Type set according to given formatType: csv', sinon.test(function () {
    const sendSpy = this.spy();
    const setSpy = this.spy();

    const expectedMimeType = 'application/csv';
    const expectedFormattedData = [];

    const req = {
      query: {
        format: 'csv'
      },
      rawData: [],
      ddfDataType: constants.CONCEPTS
    };

    const res = {
      send: sendSpy,
      set: setSpy
    };

    const formatter = proxyquire('../../../../ws.routes/data-post-processors/format', {
      './format.processor': {
        format: (data, formatType, onFormatted) => {
          expect(data).to.equal(req.rawData);
          expect(formatType).to.equal(req.query.format);

          onFormatted(null, expectedFormattedData);
        }
      }
    }).formatMiddleware;

    formatter(req, res);

    sinon.assert.calledOnce(setSpy);
    sinon.assert.calledWith(setSpy, 'Content-Type', expectedMimeType);

    sinon.assert.calledOnce(sendSpy);
    sinon.assert.calledWith(sendSpy, expectedFormattedData);
  }));

  it('should send response as data with Content-Type set according to given formatType: wsJson', sinon.test(function () {
    const sendSpy = this.spy();
    const setSpy = this.spy();

    const expectedMimeType = 'application/x-ws+json';
    const expectedFormattedData = [];

    const req = {
      query: {
        format: 'wsJson'
      },
      rawData: [],
      ddfDataType: constants.CONCEPTS
    };

    const res = {
      send: sendSpy,
      set: setSpy
    };

    const formatter = proxyquire('../../../../ws.routes/data-post-processors/format', {
      './format.processor': {
        format: (data, formatType, onFormatted) => {
          expect(data).to.equal(req.rawData);
          expect(formatType).to.equal(req.query.format);

          onFormatted(null, expectedFormattedData);
        }
      }
    }).formatMiddleware;

    formatter(req, res);

    sinon.assert.calledOnce(setSpy);
    sinon.assert.calledWith(setSpy, 'Content-Type', expectedMimeType);

    sinon.assert.calledOnce(sendSpy);
    sinon.assert.calledWith(sendSpy, expectedFormattedData);
  }));

  it('should send response as data with default Content-Type if formatType was not given explicitly', sinon.test(function () {
    const sendSpy = this.spy();
    const setSpy = this.spy();

    const expectedMimeType = 'application/x-ws+json';
    const expectedFormattedData = [];

    const req = {
      query: {
        format: 'notExistingFormat'
      },
      rawData: [],
      ddfDataType: constants.CONCEPTS
    };

    const res = {
      send: sendSpy,
      set: setSpy
    };

    const formatter = proxyquire('../../../../ws.routes/data-post-processors/format', {
      './format.processor': {
        format: (data, formatType, onFormatted) => {
          expect(data).to.equal(req.rawData);
          expect(formatType).to.equal(req.query.format);

          onFormatted(null, expectedFormattedData);
        }
      }
    }).formatMiddleware;

    formatter(req, res);

    sinon.assert.calledOnce(setSpy);
    sinon.assert.calledWith(setSpy, 'Content-Type', expectedMimeType);

    sinon.assert.calledOnce(sendSpy);
    sinon.assert.calledWith(sendSpy, expectedFormattedData);
  }));

  it('should stream response if formatter returned data as stream', sinon.test(function () {
    const setSpy = this.spy();

    const expectedMimeType = 'application/x-ws+json';

    const pipeSpy = this.spy();
    const expectedFormattedData = {
      pipe: pipeSpy
    };

    Object.setPrototypeOf(expectedFormattedData, stream.Readable.prototype);

    const req = {
      query: {
        format: 'notExistingFormat'
      },
      rawData: [],
      ddfDataType: constants.CONCEPTS
    };

    const res = {
      set: setSpy
    };

    const formatter = proxyquire('../../../../ws.routes/data-post-processors/format', {
      './format.processor': {
        format: (data, formatType, onFormatted) => {
          expect(data).to.equal(req.rawData);
          expect(formatType).to.equal(req.query.format);

          onFormatted(null, expectedFormattedData);
        }
      }
    }).formatMiddleware;

    formatter(req, res);

    sinon.assert.calledOnce(setSpy);
    sinon.assert.calledWith(setSpy, 'Content-Type', expectedMimeType);

    sinon.assert.calledOnce(pipeSpy);
    sinon.assert.calledWith(pipeSpy, res);
  }));
});
