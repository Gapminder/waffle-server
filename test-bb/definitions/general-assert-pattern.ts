import * as chai from 'chai';
import { AbstractAssertPattern, TestSuite } from 'bb-tests-provider';

const expect = chai.expect;

export class GeneralAssertPattern extends AbstractAssertPattern {
  processAssert(err, data, dataSuiteSuffix: string, testSuite: TestSuite, testIndex: number) {
    if (err) {
      console.log(err, testSuite.title);
    }

    expect(!err).to.be.true;
    expect(data.length).to.equal(testSuite.recordsCount);
  }
}
