import { expect } from 'chai';
import * as sinon from 'sinon';

import { createLongRunningQueriesKiller } from '../../ws.utils/long-running-queries-killer';
import { logger } from '../../ws.config/log';
import { config } from '../../ws.config/config';

const sandbox = sinon.createSandbox()

const THIRTY_SECONDS = 30000;

describe('Long running queries killer', () => {

  afterEach(() => sandbox.restore());

  it('gets spawned as not active job', function (): any {
    const dbService: any = {};
    const killer = createLongRunningQueriesKiller(dbService);

    expect(killer.running).to.equal(undefined);
  });

  it('can be activated', function (): any {
    const dbService: any = {};
    const killer = createLongRunningQueriesKiller(dbService);
    killer.start();

    expect(killer.running).to.be.true;
  });

  it('can be stopped', function (): any {
    const dbService: any = {};
    const killer = createLongRunningQueriesKiller(dbService);
    killer.stop();

    expect(killer.running).to.be.false;
  });

  it('doesn\'t run given task every 30 seconds on ordinary node machine', function (): any {
    const clock = sinon.useFakeTimers();

    const traceStub = sandbox.stub(logger, 'trace');

    const dbService: any = {
      killLongRunningQueries: sandbox.stub().resolves([])
    };

    const killer = createLongRunningQueriesKiller(dbService);

    killer.start();

    clock.tick(THIRTY_SECONDS);

    sinon.assert.notCalled(dbService.killLongRunningQueries);
    sinon.assert.notCalled(traceStub);

    clock.restore();
  });

  it('runs given task every 30 seconds on trashing machine', function (): any {
    const clock = sinon.useFakeTimers();

    const traceStub = sandbox.stub(logger, 'trace');
    sandbox.stub(config, 'THRASHING_MACHINE').value(true);

    const dbService: any = {
      killLongRunningQueries: sandbox.stub().resolves([])
    };

    const killer = createLongRunningQueriesKiller(dbService);

    killer.start();

    clock.tick(THIRTY_SECONDS);

    sinon.assert.calledOnce(dbService.killLongRunningQueries);
    sinon.assert.calledOnce(traceStub);

    clock.restore();
  });

  it('does not run given task if time passed since last run less then 30 seconds', function (): any {
    const clock = sinon.useFakeTimers();

    const dbService: any = {
      killLongRunningQueries: sandbox.stub().resolves([])
    };

    const killer = createLongRunningQueriesKiller(dbService);

    killer.start();

    clock.tick(THIRTY_SECONDS - 1);

    sinon.assert.notCalled(dbService.killLongRunningQueries);
    clock.restore();
  });
});
