import * as chai from 'chai';
import { AbstractAssertPattern, TestSuite } from 'bb-tests-provider';
// import { writeUsefultTestInformation } from './utils';

const expect = chai.expect;

export class GeneralAssertPattern extends AbstractAssertPattern {
  processAssert(err, data, dataSuiteSuffix: string, testSuite: TestSuite, testIndex: number) {
    if (err) {
      console.log(err, testSuite.title);
    }
    // console.log(err, '``````````````````````````````');
    // console.log(JSON.stringify(data, null, 2));
    // console.log('``````````````````````````````');

    expect(!err).to.be.true;
    expect(data.length).to.equal(testSuite.recordsCount);
    /*const fixturePath = path.resolve(this.fixturePath, this.fixture.replace(/#datasource#/, dataSuiteSuffix));
    const fixtureData = require(fixturePath);
    const areEqual = this.equals(data, fixtureData);
    const fixtureDataStr = JSON.stringify(fixtureData, null, 2);
    const dataStr = JSON.stringify(data, null, 2);

    expect(!err).to.be.true;
    expect(data.length).to.equal(fixtureData.length);
    try {
      expect(areEqual).to.be.true;
    } catch (err) {
      writeUsefultTestInformation(testIndex, fixtureDataStr, dataStr);

      throw err;
    }*/
  }
}
