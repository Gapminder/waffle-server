import { expect } from 'chai';
import * as sinon from 'sinon';

import { DbService, Operation } from '../../ws.services/db.service';
import { logger } from '../../ws.config/log';

const sandbox = sinon.createSandbox();

describe('DbService', () => {

  afterEach(() => sandbox.restore());

  it('is ok when there are no long running queries', () => {
    const executeDbAdminCommandStub = sandbox.stub().resolves({inprog: []});

    const fakeDb = {
      executeDbAdminCommand: executeDbAdminCommandStub
    };

    const fakeConnection = { db: fakeDb } as any;

    const dbService = new DbService(fakeConnection);

    return dbService.killLongRunningQueries().then(() => {
      sinon.assert.calledOnce(executeDbAdminCommandStub);
      sinon.assert.calledWith(executeDbAdminCommandStub, { currentOp: 1 });
    });
  });

  it('swallows connection errors and behaves as there are no long running queries', () => {
    const executeDbAdminCommandStub = sandbox.stub().rejects('Total domination');
    sandbox.stub(logger, 'error');

    const fakeDb = {
      executeDbAdminCommand: executeDbAdminCommandStub
    };

    const fakeConnection = { db: fakeDb } as any;

    const dbService = new DbService(fakeConnection);

    return dbService.killLongRunningQueries().then((victims: any[]) => {
      expect(victims).to.be.empty;
      sinon.assert.calledOnce(executeDbAdminCommandStub);
      sinon.assert.calledWith(executeDbAdminCommandStub, { currentOp: 1 });
    });
  });

  it('swallows connection errors and behaves as there are no long running queries 2', () => {
    const executeDbAdminCommandStub = sandbox.stub().rejects('Total domination');
    sandbox.stub(logger, 'error');

    const fakeDb = {
      executeDbAdminCommand: executeDbAdminCommandStub
    };

    const fakeConnection = { db: fakeDb } as any;

    const dbService = new DbService(fakeConnection);

    return dbService.killLongRunningQueries().then((victims: any[]) => {
      expect(victims).to.be.empty;
      sinon.assert.calledOnce(executeDbAdminCommandStub);
      sinon.assert.calledWith(executeDbAdminCommandStub, { currentOp: 1 });
    });
  });

  it('searches only operations of particular type, duration, collection  amongst all the possible operations in mongo', () => {
    const operations: Operation[] = [
      {
        active: true,
        opid: 42,
        secs_running: 29,
        op: 'command',
        ns: 'db.datapoints',
        query: '{ test: 1 }',
        planSummary: 'IXSCAN'
      },
      {
        active: true,
        opid: 43,
        secs_running: 30,
        op: 'command',
        ns: 'db.datapoints',
        query: '{ test: 1 }',
        planSummary: 'IXSCAN'
      },
      {
        active: false,
        opid: 44,
        secs_running: 31,
        op: 'query',
        ns: '.datapoints',
        query: '{ test: 1 }',
        planSummary: 'IXSCAN'
      },
      {
        active: true,
        opid: 45,
        secs_running: 31,
        op: 'query',
        ns: '.concepts',
        query: '{ test: 1 }',
        planSummary: 'IXSCAN'
      }
    ];

    const executeDbAdminCommandStub = sandbox.stub();

    executeDbAdminCommandStub.withArgs({currentOp: 1}).resolves({ inprog: operations });

    executeDbAdminCommandStub.withArgs({
      killOp: 1,
      op: sinon.match.number
    }).callsFake((query: any) => Promise.resolve(operations.find((op: Operation) => op.opid === query.op)));

    const fakeDb = {
      executeDbAdminCommand: executeDbAdminCommandStub
    };

    const fakeConnection = { db: fakeDb } as any;

    const dbService = new DbService(fakeConnection);

    return dbService.killLongRunningQueries().then((victims: any[]) => {
      expect(victims).to.deep.equal([
        {
          secs_running: 31,
          ns: '.datapoints',
          query: '{ test: 1 }',
          planSummary: 'IXSCAN'
        }
      ]);
      sinon.assert.calledTwice(executeDbAdminCommandStub);
      sinon.assert.calledWith(executeDbAdminCommandStub, { currentOp: 1 });
      sinon.assert.calledWith(executeDbAdminCommandStub, { killOp: 1, op: 44 });
    });
  });

  it('does nothing if assassination attempt failed - just returns empty result', () => {
    const operations: Operation[] = [
      {
        active: true,
        opid: 43,
        secs_running: 33,
        op: 'command',
        ns: 'db.datapoints',
        query: '{ test: 1 }',
        planSummary: 'IXSCAN'
      },
      {
        active: false,
        opid: 44,
        secs_running: 31,
        op: 'query',
        ns: '.datapoints',
        query: '{ test: 1 }',
        planSummary: 'IXSCAN'
      }
    ];

    const executeDbAdminCommandStub = sandbox.stub();
    sandbox.stub(logger, 'error');

    executeDbAdminCommandStub.withArgs({currentOp: 1}).resolves({ inprog: operations });

    executeDbAdminCommandStub.withArgs({
      killOp: 1,
      op: sinon.match.number
    }).callsFake((query: any) => {
      if (query.op === 43) {
        return Promise.resolve(operations[0]);
      }

      return Promise.reject('Total domination!');
    });

    const fakeDb = {
      executeDbAdminCommand: executeDbAdminCommandStub
    };

    const fakeConnection = { db: fakeDb } as any;

    const dbService = new DbService(fakeConnection);

    return dbService.killLongRunningQueries().then((victims: any[]) => {
      expect(victims).to.deep.equal([]);
      sinon.assert.calledThrice(executeDbAdminCommandStub);
      sinon.assert.calledWith(executeDbAdminCommandStub, { currentOp: 1 });
      sinon.assert.calledWith(executeDbAdminCommandStub, { killOp: 1, op: 43 });
      sinon.assert.calledWith(executeDbAdminCommandStub, { killOp: 1, op: 44 });
    });
  });
});
