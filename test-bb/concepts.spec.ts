import { printSummaryTable, runTests, TestSuite } from 'bb-tests-provider/dist';
import { GeneralAssertPattern, getTestObjectGroups, sg, gmPopulation, sodertornsmodellen } from './definitions';
import { WsProdServerTestObject } from './test-objects';
import { TestSuitesComplete } from './test-suites-complete';

export const conceptsTestSuitesComplete: TestSuitesComplete = {
  title: 'Concepts supporting',
  testSuites: [
    new TestSuite().forDataSuite(sg).withTitle('4 fields selects should be expected')
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
    new TestSuite().forDataSuite(sg).withTitle('3 fields selects should be expected')
      .withRecordsCount(8)
      .withInputData({
        select: {
          key: ['concept'],
          value: [
            'concept_type', 'name'
          ]
        },
        from: 'concepts',
        where: {
          $and: [
            {concept_type: {$eq: 'entity_set'}}
          ]
        },
        order_by: ['concept']
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite().forDataSuite(sg).withTitle('ar-SA base data selects should be expected')
      .withRecordsCount(8)
      .withInputData({
        select: {
          key: ['concept'],
          value: [
            'concept_type', 'name'
          ]
        },
        from: 'concepts',
        where: {
          $and: [
            {concept_type: {$eq: 'entity_set'}}
          ]
        },
        order_by: ['concept']
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite().forDataSuite(sodertornsmodellen).withTitle('recent 1')
      .withRecordsCount(595)
      .withInputData({
        select: {
          key: [
            'concept'
          ],
          value: []
        },
        from: 'concepts',
        where: {},
        language: 'en'
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sodertornsmodellen)
      .withTitle('recent 2')
      .postponeFor('WS has null instead empty strings and populated json instead json string', WsProdServerTestObject)
      .withRecordsCount(595)
      .withInputData({
        select: {
          key: [
            'concept'
          ],
          value: [
            'concept_type',
            'domain',
            'color',
            'scales',
            'tags',
            'name',
            'format'
          ]
        },
        from: 'concepts',
        where: {},
        language: 'en'
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(gmPopulation)
      .withTitle('recent 3')
      .withRecordsCount(6)
      .withInputData({
        select: {
          key: [
            'concept'
          ],
          value: [
            'concept_type',
            'domain',
            'indicator_url',
            'color',
            'scales',
            'tags',
            'name',
            'description'
          ]
        },
        from: 'concepts',
        where: {},
        language: 'en'
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 4')
      .postponeFor('WS has null instead empty strings and populated json instead json string', WsProdServerTestObject)
      .withRecordsCount(595)
      .withInputData({
        select: {
          key: [
            'concept'
          ],
          value: [
            'concept_type',
            'domain',
            'indicator_url',
            'color',
            'scales',
            'tags',
            'name',
            'name_short',
            'name_catalog',
            'description'
          ]
        },
        from: 'concepts',
        where: {},
        language: 'en'
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 5')
      .withRecordsCount(8)
      .withInputData({
        select: {
          key: [
            'concept'
          ],
          value: [
            'concept_type',
            'name',
            'domain'
          ]
        },
        from: 'concepts',
        where: {
          $and: [
            {
              concept_type: {
                $eq: 'entity_set'
              }
            }
          ]
        }
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 6')
      .withRecordsCount(8)
      .withInputData({
        select: {
          key: [
            'concept'
          ],
          value: [
            'concept_type',
            'name'
          ]
        },
        from: 'concepts',
        where: {
          $and: [
            {
              concept_type: {
                $eq: 'entity_set'
              }
            }
          ]
        },
        order_by: [
          'concept'
        ]
      })
      .withAssertPattern(GeneralAssertPattern)
  ]
};

describe(conceptsTestSuitesComplete.title, () => {
  const aggregatedData = {};

  after(() => {
    printSummaryTable(conceptsTestSuitesComplete.testSuites, aggregatedData);
  });

  runTests(getTestObjectGroups, conceptsTestSuitesComplete.testSuites, aggregatedData);
});
