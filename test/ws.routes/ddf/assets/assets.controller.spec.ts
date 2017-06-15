import { expect } from 'chai';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';

import * as AssetsController from '../../../../ws.routes/ddf/assets/assets.controller';
import { constants } from '../../../../ws.utils/constants';

const sandbox = sinonTest.configureTest(sinon);

describe('AssetsController', () => {
  it('sends 404 when there is no assetPathDescriptor attached to the request body', sandbox(function (done: Function): any {
    const req: any = {};
    const res: any = {
      _status: -1,
      status(code: number): any {
        this._status = code;
        return this;
      },
      end(): void {
        expect(this._status).to.equal(404);
        done();
      }
    };

    AssetsController.serveAsset(req, res);
  }));

  it('sends file when there is a valid assetPathDescriptor in the request body', sandbox(function (): any {
    const req: any = {
      body: {
        assetPathDescriptor: {
          path: '/far/far/galaxy/deathStar.json',
          assetName: 'deathStar.json'
        }
      }
    };

    const res: any = {
      setHeader: this.stub(),
      sendFile: this.stub()
    };

    AssetsController.serveAsset(req, res);

    sinon.assert.calledOnce(res.setHeader);
    sinon.assert.calledOnce(res.sendFile);

    sinon.assert.calledWith(res.setHeader, 'Content-Disposition', `attachment; filename=deathStar.json`);
    sinon.assert.calledWith(res.sendFile, '/far/far/galaxy/deathStar.json', {maxAge: constants.ASSETS_CACHE_CONTROL_MAX_AGE_IN_MILLIS});
  }));
});
