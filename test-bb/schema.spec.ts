import { printSummaryTable, runTests, TestSuite } from 'bb-tests-provider/dist';
import { GeneralAssertPattern, getTestObjectGroups, sg, sankey } from './definitions';
import { DdfCsvReaderTestObject, WsProdServerTestObject } from './test-objects';
import { TestSuitesComplete } from "./test-suites-complete";

export const schemaConceptsTestSuitesComplete: TestSuitesComplete = {
  title: 'Schema supporting for concepts',
  testSuites: [
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('simple test')
      .withRecordsCount(12)
      .withInputData({
        select: {
          key: ['key', 'value'],
          value: []
        },
        from: 'concepts.schema',
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern)

  ]
};

export const schemaEntitiesTestSuitesComplete: TestSuitesComplete = {
  title: 'Schema supporting for entities',
  testSuites: [
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('simple test')
      .withRecordsCount(122)
      .withInputData({
        select: {
          key: ['key', 'value'],
          value: []
        },
        from: 'entities.schema',
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern)
  ]
};

export const schemaDatapointsTestSuitesComplete: TestSuitesComplete = {
  title: 'Schema supporting for datapoints',
  testSuites: [
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('should response be expected for simple request')
      .withRecordsCount(1082)
      .withInputData({
        select: {
          key: ['key', 'value'],
          value: []
        },
        from: 'datapoints.schema',
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .postponeFor('performance and functionality should be considered', DdfCsvReaderTestObject, WsProdServerTestObject)
      .withTitle('should max-min response be expected')
      .withRecordsCount(0)
      .withInputData({
        select: {
          key: ['key', 'value'],
          value: ['min(value)', 'max(value)']
        },
        from: 'datapoints.schema',
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sankey)
      .postponeFor('performance and functionality should be considered', DdfCsvReaderTestObject, WsProdServerTestObject)
      .withTitle('simple max-min test')
      .withRecordsCount(0)
      .withInputData({
        select: {
          key: ['key', 'value'],
          value: ['min(value)', 'max(value)']
        },
        from: 'datapoints.schema',
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern)
  ]
};

export const schemaGeneralTestSuitesComplete: TestSuitesComplete = {
  title: 'Schema supporting for general query',
  testSuites: [
    new TestSuite()
      .forDataSuite(sg)
      .postponeFor('this is an issue, should be resolved later', DdfCsvReaderTestObject, WsProdServerTestObject)
      .withTitle('simple test')
      .withRecordsCount(0)
      .withInputData({
        select: {
          key: ['key', 'value'],
          value: []
        },
        from: '*.schema'
      })
      .withAssertPattern(GeneralAssertPattern)
  ]
};

describe('Schema supporting', () => {
  describe(schemaConceptsTestSuitesComplete.title, () => {
    const aggregatedData = {};

    after(() => {
      printSummaryTable(schemaConceptsTestSuitesComplete.testSuites, aggregatedData);
    });

    runTests(getTestObjectGroups, schemaConceptsTestSuitesComplete.testSuites, aggregatedData);
  });

  describe(schemaEntitiesTestSuitesComplete.title, () => {
    const aggregatedData = {};

    after(() => {
      printSummaryTable(schemaEntitiesTestSuitesComplete.testSuites, aggregatedData);
    });

    runTests(getTestObjectGroups, schemaEntitiesTestSuitesComplete.testSuites, aggregatedData);
  });

  describe(schemaDatapointsTestSuitesComplete.title, () => {
    const aggregatedData = {};

    after(() => {
      printSummaryTable(schemaDatapointsTestSuitesComplete.testSuites, aggregatedData);
    });

    runTests(getTestObjectGroups, schemaDatapointsTestSuitesComplete.testSuites, aggregatedData);
  });

  describe(schemaGeneralTestSuitesComplete.title, () => {
    const aggregatedData = {};

    after(() => {
      printSummaryTable(schemaGeneralTestSuitesComplete.testSuites, aggregatedData);
    });

    runTests(getTestObjectGroups, schemaGeneralTestSuitesComplete.testSuites, aggregatedData);
  });
});
