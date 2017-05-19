import '../../../../ws.repository';

import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import * as formatService from '../../../../ws.services/format.service';
import {format as formatProcessor} from '../../../../ws.routes/data-post-processors/format/format.processor';

const test = sinonTest.configureTest(sinon);

describe('Format Processor', () => {
  it('should invoke processor by given format', test(function () {
    const customFormat = 'csv';
    const customFormatServiceStub = this.stub(formatService, customFormat);

    const data = [];
    const callback = this.spy();

    formatProcessor(data, customFormat, callback);

    sinon.assert.calledOnce(customFormatServiceStub);
    sinon.assert.calledWith(customFormatServiceStub, data, callback);
    sinon.assert.notCalled(callback);
  }));

  it('should invoke default processor if service for a given format is absent', test(function () {
    const defaultServiceStub = this.stub(formatService, 'default');

    const data = [];
    const callback = this.spy();

    formatProcessor(data, 'notExistingFormat', callback);

    sinon.assert.calledOnce(defaultServiceStub);
    sinon.assert.calledWith(defaultServiceStub, data, callback);
    sinon.assert.notCalled(callback);
  }));
});
