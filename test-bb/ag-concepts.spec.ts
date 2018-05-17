import { keys } from 'lodash';
import { testsDescriptors } from 'vizabi-ddfcsv-reader/dist/test-cases-concepts';
import { printSummaryTable, runTests, TestSuite } from 'bb-tests-provider';
import { getTestObjectGroups, wsTesting } from './definitions';
import { TestSuitesComplete } from './definitions/test-suites-complete';
import { testsOptions } from './answers-config';
import { JustNoErrorAssertPattern } from './definitions/just-no-error-assert-pattern';

const descriptions = keys(testsDescriptors);

export const conceptsAgTestSuitesCompletes: TestSuitesComplete[] = [];

for (const description of descriptions) {
  const conceptsTestSuitesComplete = {
    title: description,
    testSuites: []
  };

  for (const testDescriptor of testsDescriptors[description]) {
    const query = testDescriptor.query;

    query.dataset = wsTesting.getDataset();
    query.force = true;

    const testSuite = new TestSuite().forDataSuite(wsTesting).withTitle(testDescriptor.itTitle)
      .withInputData(query).withAssertPattern(JustNoErrorAssertPattern);

    conceptsTestSuitesComplete.testSuites.push(testSuite);
  }

  conceptsAgTestSuitesCompletes.push(conceptsTestSuitesComplete);
}

for (const conceptsTestSuitesComplete of conceptsAgTestSuitesCompletes) {
  describe(conceptsTestSuitesComplete.title, () => {
    const aggregatedData = {};

    after(() => {
      printSummaryTable(conceptsTestSuitesComplete.testSuites, aggregatedData);
    });

    runTests(getTestObjectGroups, conceptsTestSuitesComplete.testSuites, aggregatedData, testsOptions);
  });
}
