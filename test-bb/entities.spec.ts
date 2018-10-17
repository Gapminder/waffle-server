import { printSummaryTable, runTests, TestSuite } from 'bb-tests-provider';
import { GeneralAssertPattern, getTestObjectGroups, sg, presentationSet, sankey, sodertornsmodellen, gmPopulationBig } from './definitions';
import { TestSuitesComplete } from './definitions/test-suites-complete';
import { testsOptions } from './answers-config';

export const entitiesTestSuitesComplete: TestSuitesComplete = {
  title: 'Entities supporting',
  testSuites: [
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('plain query should be processed correctly')
      .withRecordsCount(273)
      .withInputData({
        from: 'entities',
        animatable: 'time',
        select: {
          key: ['geo'],
          value: ['name', 'world_4region', 'latitude', 'longitude']
        },
        where: {'is--country': true},
        grouping: {},
        orderBy: null,
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('plain Arabic query should be processed correctly')
      .withRecordsCount(273)
      .withInputData({
        language: 'ar-SA',
        from: 'entities',
        animatable: 'time',
        select: {
          key: ['geo'],
          value: ['name', 'world_4region', 'latitude', 'longitude']
        },
        where: {'is--country': true},
        grouping: {},
        orderBy: null,
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('shapes query should be processed correctly')
      .withRecordsCount(4)
      .withInputData({
        from: 'entities',
        animatable: false,
        select: {key: ['geo'], value: ['name', 'shape_lores_svg']},
        where: {'is--world_4region': true},
        grouping: {},
        orderBy: null,
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('tags query should be processed correctly')
      .withRecordsCount(84)
      .withInputData({
        from: 'entities',
        animatable: false,
        select: {key: ['tag'], value: ['name', 'parent']},
        where: {},
        grouping: {},
        orderBy: null,
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('"world_4region" query should be processed correctly')
      .withRecordsCount(4)
      .withInputData({
        language: 'en',
        from: 'entities',
        animatable: false,
        select: {key: ['world_4region'], value: ['name', 'rank', 'shape_lores_svg']},
        where: {},
        join: {},
        order_by: ['rank'],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(presentationSet)
      .withTitle('query with boolean condition should be processed correctly')
      .withRecordsCount(195)
      .withInputData({
        language: 'en',
        from: 'entities',
        animatable: 'time',
        select: {
          key: [
            'geo'
          ],
          value: [
            'name',
            'world_4region'
          ]
        },
        where: {
          $and: [
            {
              un_state: true
            }
          ]
        },
        join: {},
        order_by: [
          'rank'
        ],
        force: true,
        dataset: presentationSet.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sankey)
      .withTitle('query with boolean condition should be processed correctly')
      .withRecordsCount(23)
      .withInputData({
        language: 'en',
        from: 'entities',
        animatable: false,
        select: {
          key: [
            'phase_from'
          ],
          value: [
            'name'
          ]
        },
        where: {},
        join: {},
        order_by: [
          'rank'
        ],
        force: true,
        dataset: sankey.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sodertornsmodellen)
      .withTitle('recent 1')
      .withRecordsCount(1086)
      .withInputData({
        language: 'en',
        from: 'entities',
        animatable: false,
        select: {
          key: [
            'basomrade'
          ],
          value: [
            'name'
          ]
        },
        where: {},
        join: {},
        order_by: [
          'rank'
        ],
        force: true,
        dataset: sodertornsmodellen.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sodertornsmodellen)
      .withTitle('recent 2')
      .withRecordsCount(2)
      .withInputData({
        language: 'en',
        from: 'entities',
        animatable: false,
        select: {
          key: [
            'gender'
          ],
          value: [
            'name'
          ]
        },
        where: {},
        join: {},
        order_by: [
          'rank'
        ],
        force: true,
        dataset: sodertornsmodellen.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sodertornsmodellen)
      .withTitle('recent 3')
      .withRecordsCount(1115)
      .withInputData({
        language: 'en',
        from: 'entities',
        animatable: false,
        select: {
          key: [
            'geo'
          ],
          value: [
            'name',
            'rank',
            'shape_lores_svg'
          ]
        },
        where: {},
        join: {},
        order_by: [
          'rank'
        ],
        force: true,
        dataset: sodertornsmodellen.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sankey)
      .withTitle('recent 4')
      .withRecordsCount(23)
      .withInputData({
        language: 'en',
        from: 'entities',
        animatable: false,
        select: {
          key: [
            'phase_from'
          ],
          value: [
            'name'
          ]
        },
        where: {},
        join: {},
        order_by: [
          'rank'
        ],
        force: true,
        dataset: sankey.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 5')
      .withRecordsCount(195)
      .withInputData({
        language: 'en',
        from: 'entities',
        animatable: 'time',
        select: {
          key: [
            'geo'
          ],
          value: [
            'name'
          ]
        },
        where: {
          $and: [
            {
              un_state: true
            }
          ]
        },
        join: {},
        order_by: [
          'rank'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(gmPopulationBig)
      .withTitle('recent 7')
      .withRecordsCount(100)
      .withInputData({
        language: 'en',
        from: 'entities',
        animatable: 'year',
        select: {
          key: [
            'age'
          ],
          value: []
        },
        where: {
          $and: [
            {
              age: '$age'
            }
          ]
        },
        join: {
          $age: {
            key: 'age',
            where: {
              age: {
                $nin: [
                  '80plus',
                  '100plus'
                ]
              }
            }
          }
        },
        order_by: [
          'rank'
        ],
        force: true,
        dataset: gmPopulationBig.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 8')
      .withRecordsCount(200)
      .withInputData({
        language: 'en',
        from: 'entities',
        animatable: 'year',
        select: {
          key: [
            'geo'
          ],
          value: [
            'name',
            'world_4region'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              $or: [
                {
                  un_state: true
                },
                {
                  'is--global': true
                },
                {
                  'is--world_4region': true
                }
              ]
            }
          }
        },
        order_by: [
          'rank'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sodertornsmodellen)
      .withTitle('recent 9')
      .withRecordsCount(26)
      .withInputData({
        language: 'en',
        from: 'entities',
        animatable: 'year',
        select: {
          key: [
            'municipality'
          ],
          value: [
            'name',
            'map_id',
            'rank',
            'shape_lores_svg'
          ]
        },
        where: {},
        join: {},
        order_by: [
          'rank'
        ],
        force: true,
        dataset: sodertornsmodellen.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern)
  ]
};

describe(entitiesTestSuitesComplete.title, () => {
  const aggregatedData = {};

  after(() => {
    printSummaryTable(entitiesTestSuitesComplete.testSuites, aggregatedData);
  });

  runTests(getTestObjectGroups, entitiesTestSuitesComplete.testSuites, aggregatedData, testsOptions);
});
