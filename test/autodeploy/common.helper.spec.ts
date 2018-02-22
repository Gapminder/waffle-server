import 'mocha';
import * as sinon from 'sinon';
import * as shell from 'shelljs';
import { expect } from 'chai';

import * as commonHelpers from '../../deployment/gcp_scripts/common.helpers';
import { constants } from '../../ws.utils/constants';
import { ChildProcess } from 'child_process';
import { ExecOutputReturnValue } from 'shelljs';
import * as async from 'async';

const sandbox = sinon.createSandbox();

describe('Common.helpers Tests', () => {

  afterEach(() => sandbox.restore());

  it('getDockerArguments', (done: Function) => {
    const testArgs = {
      NUMBER: 111,
      STRING: 'STRING',
      BOOLEAN: true,
      ARRAY: ['test']
    };

    const actual = commonHelpers.getDockerArguments(testArgs as any);

    expect(actual).equal(`--build-arg NUMBER=${testArgs.NUMBER} --build-arg STRING="${testArgs.STRING}" --build-arg BOOLEAN=${testArgs.BOOLEAN} --build-arg ARRAY="${testArgs.ARRAY}"`);

    done();
  });

  it('getGCloudArguments', (done: Function) => {
    const testArgs = {
      NUMBER: 111,
      STRING: 'STRING',
      BOOLEAN: true
    };

    const actual = commonHelpers.getGCloudArguments(testArgs);

    expect(actual).equal(`--number=${testArgs.NUMBER} --string="${testArgs.STRING}" --boolean`);

    done();
  });

  it('getMongoArguments', (done: Function) => {
    const testArgs = {
      NUMBER: 111,
      STRING: 'STRING',
      BOOLEAN: true,
      'snake-case': 'snake-case'
    };

    const actual = commonHelpers.getMongoArguments(testArgs as any);

    expect(actual).equal(`number=${testArgs.NUMBER}#&&#string=${testArgs.STRING}#&&#boolean=${testArgs.BOOLEAN}#&&#snake_case=${testArgs['snake-case']}`);

    done();
  });

  it('runShellCommand: exit on error', (done: Function) => {
    const execResult = {
      code: 1,
      stdout: 'stdout',
      stderr: 'stderr'
    };

    sandbox.stub(constants, 'AUTODEPLOY_RETRY_TIMES').value(1);
    sandbox.stub(constants, 'AUTODEPLOY_RETRY_INTERVAL').value(10);
    sandbox.stub(shell, 'exec').returns({ ...execResult });
    sandbox.stub(shell, 'error').returns(true);

    commonHelpers.runShellCommand('gcloud compute', {}, ((err: string, result: any) => {
      expect(err).to.contain(execResult.code, 'Error Code');
      expect(err).to.contain(execResult.stderr, 'StdErr');
      expect(result).to.deep.equal(execResult);

      done();
    }));
  });

  it('runShellCommand: skip step by specific error/result', (done: Function) => {
    const skipMarkers: string[] = ['already exists', 'scaled', 'AlreadyExists', 'is already in use', 'code=404', 'was not found', 'is not a valid name'];

    const execStub = sandbox.stub(shell, 'exec');
    sandbox.stub(constants, 'AUTODEPLOY_RETRY_INTERVAL').value(10);
    sandbox.stub(constants, 'AUTODEPLOY_RETRY_TIMES').value(2);
    sandbox.stub(shell, 'error').returns(false);

    async.eachSeries(skipMarkers, (marker: string, cb: Function) => {
      execStub.returns({
        code: 2,
        stdout: 'stdout',
        stderr: marker
      });

      commonHelpers.runShellCommand('gcloud compute', {}, (error: string, result: ExecOutputReturnValue | ChildProcess) => {
        expect(error, 'ERROR MESSAGE').to.be.a('null');
        expect(result).to.deep.equal({ code: 2, stdout: 'stdout', stderr: marker });

        cb();
      });
    }, (error: string) => {
      return done(error);
    });
  });
});
