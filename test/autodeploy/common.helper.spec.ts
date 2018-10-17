import 'mocha';
import * as sinon from 'sinon';
import * as shell from 'shelljs';
import { ExecOutputReturnValue } from 'shelljs';
import { expect } from 'chai';
import * as async from 'async';
import { ChildProcess } from 'child_process';

import * as commonHelpers from '../../deployment/common.helpers';
import { constants } from '../../ws.utils/constants';
import { loggerFactory } from '../../ws.config/log';

const sandbox = sinon.createSandbox();

describe('Common.helpers Tests', () => {
  let loggerStub;

  beforeEach(() => {
    loggerStub = {info: sandbox.stub(), error: sandbox.stub, warn: sandbox.stub()};
    sandbox.stub(loggerFactory, 'getLogger').returns(loggerStub);
  });

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

  it('runShellCommand: exit on error', (done: Function) => {
    const shellExecResult = { code: 1, stdout: 'stdout', stderr: 'stderr' };

    sandbox.stub(constants, 'AUTODEPLOY_RETRY_TIMES').value(1);
    sandbox.stub(constants, 'AUTODEPLOY_RETRY_INTERVAL').value(10);
    sandbox.stub(shell, 'exec').returns({ ...shellExecResult });
    sandbox.stub(shell, 'error').returns(true);

    commonHelpers.runShellCommand('gcloud compute', {}, ((err: string, result: any) => {
      expect(err).to.contain(shellExecResult.code, 'Error Code');
      expect(err).to.contain(shellExecResult.stderr, 'StdErr');
      expect(result).to.deep.equal(shellExecResult);

      done();
    }));
  });

  it('runShellCommand: skip step on specific error', (done: Function) => {
    const skipMarkers: string[] = ['already exists', 'scaled', 'AlreadyExists', 'is already in use', 'code=404', 'was not found', 'is not a valid name'];

    const execStub = sandbox.stub(shell, 'exec');
    sandbox.stub(constants, 'AUTODEPLOY_RETRY_INTERVAL').value(10);
    sandbox.stub(constants, 'AUTODEPLOY_RETRY_TIMES').value(2);
    sandbox.stub(shell, 'error').returns(false);

    async.eachSeries(skipMarkers, (marker: string, cb: Function) => {
      let expectedResultFromShell = { code: 2, stdout: 'stdout', stderr: marker };

      execStub.returns({ ...expectedResultFromShell });

      commonHelpers.runShellCommand('gcloud compute', {}, (error: string, result: ExecOutputReturnValue | ChildProcess) => {
        expect(error, 'ERROR MESSAGE').to.be.a('null');
        expect(result).to.deep.equal(expectedResultFromShell);

        cb();
      });
    }, (error: string) => {
      return done(error);
    });
  });

  it('runShellCommand: skip step on specific result', (done: Function) => {
    const skipMarkers: string[] = ['already exists', 'scaled', 'AlreadyExists', 'is already in use', 'code=404', 'was not found', 'is not a valid name'];

    const execStub = sandbox.stub(shell, 'exec');
    sandbox.stub(constants, 'AUTODEPLOY_RETRY_INTERVAL').value(10);
    sandbox.stub(constants, 'AUTODEPLOY_RETRY_TIMES').value(2);
    sandbox.stub(shell, 'error').returns(false);

    async.eachSeries(skipMarkers, (marker: string, cb: Function) => {
      let expectedResultFromShell = { code: 0, stdout: marker, stderr: null };

      execStub.returns({ ...expectedResultFromShell });

      commonHelpers.runShellCommand('gcloud compute', {}, (error: string, result: ExecOutputReturnValue | ChildProcess) => {
        expect(error, 'ERROR MESSAGE').to.be.a('null');
        expect(result).to.deep.equal(expectedResultFromShell);

        cb();
      });
    }, (error: string) => {
      return done(error);
    });
  });

  it('runShellCommand: skip on empty stdout', (done: Function) => {
    const expectedShellOutput = { code: 0, stdout: '', stderr: null };
    const execStub = sandbox.stub(shell, 'exec').returns({ ...expectedShellOutput });

    sandbox.stub(constants, 'AUTODEPLOY_RETRY_INTERVAL').value(10);
    sandbox.stub(constants, 'AUTODEPLOY_RETRY_TIMES').value(1);
    sandbox.stub(shell, 'error').returns(false);

    commonHelpers.runShellCommand('gcloud compute', {}, (error: string, result: ExecOutputReturnValue | ChildProcess) => {
      expect(error, 'ERROR MESSAGE').to.be.a('null');
      expect(result).to.deep.equal(expectedShellOutput);
      sinon.assert.calledTwice(loggerStub.info);

      done();
    });
  });

  it('runShellCommand: skip on Docker command', (done: Function) => {
    const expectedShellOutput = { code: 0, stdout: 'stdout', stderr: null };
    const execStub = sandbox.stub(shell, 'exec').returns({ ...expectedShellOutput });

    sandbox.stub(constants, 'AUTODEPLOY_RETRY_INTERVAL').value(10);
    sandbox.stub(constants, 'AUTODEPLOY_RETRY_TIMES').value(1);
    sandbox.stub(shell, 'error').returns(false);

    commonHelpers.runShellCommand('gcloud compute docker', {}, (error: string, result: ExecOutputReturnValue | ChildProcess) => {
      expect(error, 'ERROR MESSAGE').to.be.a('null');
      expect(result).to.deep.equal(expectedShellOutput);
      sinon.assert.calledTwice(loggerStub.info);

      done();
    });
  });

  it('runShellCommand: retry if invalid JSON recieved', (done: Function) => {
    const shellResponseStub = { code: 0, stdout: null, stderr: null };
    const incorrectJson = 'incorrect stdout';
    const correctJson = '{"stdout":"correct"}';

    const execStub = sandbox.stub(shell, 'exec');

    execStub.onFirstCall().returns({ ...shellResponseStub, stdout: incorrectJson });
    execStub.onSecondCall().returns({ ...shellResponseStub, stdout: correctJson });

    sandbox.stub(constants, 'AUTODEPLOY_RETRY_INTERVAL').value(10);
    sandbox.stub(constants, 'AUTODEPLOY_RETRY_TIMES').value(2);
    sandbox.stub(shell, 'error').returns(false);

    commonHelpers.runShellCommand('gcloud compute', {}, (error: string, result: ExecOutputReturnValue | ChildProcess) => {
      expect(error, 'ERROR MESSAGE').to.be.a('null');
      expect(result).to.deep.equal({ ...shellResponseStub, stdout: correctJson });
      sinon.assert.calledTwice(loggerStub.info);

      done();
    });
  });

  it('runShellCommand: check for required data in JSON', (done: Function) => {
    const shellResponseStub = { code: 0, stdout: null, stderr: null };
    const correctJson = '{"stdout": {"correct": {"path":"here"} } }';
    const options = { pathsToCheck: ['stdout.correct.path'] };

    sandbox.stub(shell, 'exec').returns({ ...shellResponseStub, stdout: correctJson });
    sandbox.stub(constants, 'AUTODEPLOY_RETRY_INTERVAL').value(10);
    sandbox.stub(constants, 'AUTODEPLOY_RETRY_TIMES').value(1);
    sandbox.stub(shell, 'error').returns(false);

    commonHelpers.runShellCommand('gcloud compute', options, (error: string, result: ExecOutputReturnValue | ChildProcess) => {
      expect(error, 'ERROR MESSAGE').to.be.a('null');
      expect(result).to.deep.equal({ ...shellResponseStub, stdout: correctJson });

      done();
    });
  });

  it('runShellCommand: throw error if no required data in JSON', (done: Function) => {
    const shellResponseStub = { code: 0, stdout: null, stderr: null };
    const correctJson = '{"stdout": {"correct": {"NOpath":"here"} } }';
    const optionsWithIncorrectPath = { pathsToCheck: ['stdout.correct.path'] };

    sandbox.stub(shell, 'exec').returns({ ...shellResponseStub, stdout: correctJson });

    sandbox.stub(constants, 'AUTODEPLOY_RETRY_INTERVAL').value(10);
    sandbox.stub(constants, 'AUTODEPLOY_RETRY_TIMES').value(1);
    sandbox.stub(shell, 'error').returns(false);

    commonHelpers.runShellCommand('gcloud compute', optionsWithIncorrectPath, (error: string, result: ExecOutputReturnValue | ChildProcess) => {
      expect(error).to.contain(optionsWithIncorrectPath.pathsToCheck[0]);
      expect(error).to.contain(correctJson);
      expect(result).to.deep.equal({ ...shellResponseStub, stdout: correctJson });

      done();
    });
  });
});
