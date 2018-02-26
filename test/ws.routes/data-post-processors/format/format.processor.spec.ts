import '../../../../ws.repository';

import * as sinon from 'sinon';
import * as formatService from '../../../../ws.services/format.service';
import { format as formatProcessor } from '../../../../ws.routes/data-post-processors/format/format.processor';

const sandbox = sinon.createSandbox();

describe('Format Processor', () => {

  afterEach(() => sandbox.restore());

  it('should invoke processor by given format', () => {
    const customFormat = 'csv';
    const customFormatServiceStub = sandbox.stub(formatService, customFormat);

    const data = [];
    const callback = sandbox.spy();

    formatProcessor(data, customFormat, callback);

    sinon.assert.calledOnce(customFormatServiceStub);
    sinon.assert.calledWith(customFormatServiceStub, data, callback);
    sinon.assert.notCalled(callback);
  });

  it('should invoke default processor if service for a given format is absent', () => {
    const defaultServiceStub = sandbox.stub(formatService, 'default');

    const data = [];
    const callback = sandbox.spy();

    formatProcessor(data, 'notExistingFormat', callback);

    sinon.assert.calledOnce(defaultServiceStub);
    sinon.assert.calledWith(defaultServiceStub, data, callback);
    sinon.assert.notCalled(callback);
  });
});
