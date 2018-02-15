import 'mocha';
import { expect } from 'chai';
import * as commonHelpers from '../../deployment/gcp_scripts/common.helpers';

describe('Common.helpers Tests', () => {

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

});
