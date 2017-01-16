'use strict';

const sinon = require('sinon');

require('../../../../ws.repository/index.js');
const formatService = require('../../../../ws.services/format.service.js');
const formatProcessor = require('../../../../ws.routes/data-post-processors/format/format.processor.js');

describe('Format Processor', () => {
  it('should invoke processor by given format', sinon.test(function () {
    const customFormat = 'csv';
    const customFormatServiceStub = this.stub(formatService, customFormat);

    const data = [];
    const callback = this.spy();

    formatProcessor(data, customFormat, callback);

    sinon.assert.calledOnce(customFormatServiceStub);
    sinon.assert.calledWith(customFormatServiceStub, data, callback);
    sinon.assert.notCalled(callback);
  }));

  it('should invoke default processor if service for a given format is absent', sinon.test(function () {
    const defaultServiceStub = this.stub(formatService, 'default');

    const data = [];
    const callback = this.spy();

    formatProcessor(data, 'notExistingFormat', callback);

    sinon.assert.calledOnce(defaultServiceStub);
    sinon.assert.calledWith(defaultServiceStub, data, callback);
    sinon.assert.notCalled(callback);
  }));
});
