import { expect } from 'chai';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';

import { createLongRunningQueriesKiller } from '../../ws.utils/long-running-queries-killer';
import { logger } from '../../ws.config/log';

const sandbox = sinonTest.configureTest(sinon);

const THIRTY_SECONDS = 30000;

describe('Long running queries killer', () => {
  it('gets spawned as not active job', sandbox(function (): any {
    const dbService: any = {};
    const killer = createLongRunningQueriesKiller(dbService);

    expect(killer.running).to.equal(undefined);
  }));

  it('can be activated', sandbox(function (): any {
    const dbService: any = {};
    const killer = createLongRunningQueriesKiller(dbService);
    killer.start();

    expect(killer.running).to.be.true;
  }));

  it('can be stopped', sandbox(function (): any {
    const dbService: any = {};
    const killer = createLongRunningQueriesKiller(dbService);
    killer.stop();

    expect(killer.running).to.be.false;
  }));

  it('runs given task every 30 seconds', sandbox(function (): any {
    const clock = sinon.useFakeTimers();

    const infoStub = this.stub(logger, 'info');

    const dbService: any = {
      killLongRunningQueries: this.stub().resolves([])
    };

    const killer = createLongRunningQueriesKiller(dbService);

    killer.start();

    clock.tick(THIRTY_SECONDS);

    sinon.assert.calledOnce(dbService.killLongRunningQueries);
    sinon.assert.calledOnce(infoStub);

    clock.restore();
  }));

  it('does not run given task if time passed since last run less then 30 seconds', sandbox(function (): any {
    const clock = sinon.useFakeTimers();

    const dbService: any = {
      killLongRunningQueries: this.stub().resolves([])
    };

    const killer = createLongRunningQueriesKiller(dbService);

    killer.start();

    clock.tick(THIRTY_SECONDS - 1);

    sinon.assert.notCalled(dbService.killLongRunningQueries);
    clock.restore();
  }));
});
