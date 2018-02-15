import { expect } from 'chai';
import * as sinon from 'sinon';
import { SinonMatcher } from 'sinon';

/**
 * Wrappers for sinon.match
 * EXAMPLE: sinon.assert.calledWith(Spy, expectNoEmptyParamsInCommand.and(hasFlag('someflag')));
 */
export const expectNoEmptyParamsInCommand: SinonMatcher = sinon.match((value: any) => {
  expect(value).not.to.contain('undefined');
  expect(value).not.to.contain('null');
  expect(value).not.to.match(/=('\s+'|"\s+"|\s+|''|"")(\s+|$)/g, 'empty values found in the command');

  return true;
});

export function hasFlag(flag: string): SinonMatcher {
  return sinon.match((value: any) => {
    expect(value).to.include(`--${flag}`, `${flag} wasn't met`);

    return true;
  });
}
