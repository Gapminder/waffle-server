import { printSummaryTable, runTests, TestSuite } from 'bb-tests-provider/dist';
import { GeneralAssertPattern, JustAnErrorAssertPattern, sg, getTestObjectGroups } from './definitions';

xdescribe('Additional concepts supporting', () => {
  const aggregatedData = {};
  const testSuites = [
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('8 records with 4 fields selects should be expected')
      .withRecordsCount(8)
      .withInputData({
        select: {
          key: ['concept'],
          value: [
            'concept_type', 'name', 'domain'
          ]
        },
        from: 'concepts',
        where: {
          $and: [
            {concept_type: {$eq: 'entity_set'}}
          ]
        }
      })
      .withAssertPattern(GeneralAssertPattern),
      new TestSuite()
      .forDataSuite(sg)
      .withTitle('an error should be raised when key is incorrect')
      .withInputData({
        select: {
          key: ['conceptZ'],
          value: [
            'concept_type', 'name', 'domain'
          ]
        },
        from: 'concepts',
        where: {
          $and: [
            {concept_type: {$eq: 'entity_set'}}
          ]
        }
      })
      .withAssertPattern(JustAnErrorAssertPattern)
  ];

  after(() => {
    printSummaryTable(testSuites, aggregatedData);
  });

  runTests(getTestObjectGroups, testSuites, aggregatedData);
});
