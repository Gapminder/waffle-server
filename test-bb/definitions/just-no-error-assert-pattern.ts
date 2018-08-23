import * as chai from 'chai';
import { AbstractAssertPattern } from 'bb-tests-provider';

const expect = chai.expect;

export class JustNoErrorAssertPattern extends AbstractAssertPattern {
  processAssert(err) {
    if (err) {
      console.log(err);
    }

    expect(!!err).to.be.false;
  }
}
