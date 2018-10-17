import { expect } from 'chai';
import * as sinon from 'sinon';

import * as AssetsController from '../../../ws.routes/assets/assets.controller';
import { constants } from '../../../ws.utils/constants';
import * as vizabiDdfcsvReader from 'vizabi-ddfcsv-reader/lib/src';

const sandbox = sinon.createSandbox();

describe('AssetsController', () => {

  afterEach(() => sandbox.restore());

  it('sends 404 when there is no repositoryPath attached to the request body', (done: Function) => {
    const req: any = {};
    const res: any = {
      _status: -1,
      status(code: number): any {
        this._status = code;
        return this;
      },
      end(): void {
        expect(this._status).to.equal(200);
        done();
      }
    };

    AssetsController.serveAsset(req, res);
  });

  it('sends file when there is a valid repositoryPath in the request body', async () => {
    const data: any = {
      test: 'test'
    };

    sandbox.stub(vizabiDdfcsvReader, 'getS3FileReaderObject').returns({
      init: sandbox.stub(),
      getAsset: sandbox.stub().resolves(data)
    });

    const req: any = {
      body: {
        repositoryPath: '/far/far',
        filepath: '/galaxy/deathStar.json',
        filename: 'deathStar.json'
      }
    };

    const res: any = {
      setHeader: sandbox.stub(),
      json: sandbox.stub(),
      set: sandbox.stub(),
      send: sandbox.stub()
    };

    await AssetsController.serveAsset(req, res);

    sinon.assert.calledTwice(res.setHeader);
    sinon.assert.calledOnce(res.set);
    sinon.assert.calledOnce(res.send);

    sinon.assert.calledWith(res.setHeader, 'Content-Disposition', `attachment; filename=deathStar.json`);
    sinon.assert.calledWith(res.setHeader, 'Content-type', 'text/plain');
    sinon.assert.calledWith(res.set, 'Cache-Control', `public, max-age=${constants.ASSETS_CACHE_CONTROL_MAX_AGE_IN_MILLIS}, s-maxage=${constants.ASSETS_CACHE_CONTROL_MAX_AGE_IN_MILLIS}`);
    sinon.assert.calledWith(res.send, data);
  });
});
