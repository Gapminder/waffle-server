import * as chai from 'chai';
import { AbstractAssertPattern } from 'bb-tests-provider';

const expect = chai.expect;

export class JustAnErrorAssertPattern extends AbstractAssertPattern {
  processAssert(err) {
    expect(!!err).to.be.true;
  }
}
