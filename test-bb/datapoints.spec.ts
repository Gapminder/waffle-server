import { printSummaryTable, runTests, TestSuite } from 'bb-tests-provider';
import {
  GeneralAssertPattern,
  getTestObjectGroups,
  sg,
  bubbles3,
  gmPopulation,
  sodertornsmodellen,
  sgTiny,
  gmPopulationBig,
  presentationSet,
  staticAssets,
  sgMixEntity
} from './definitions';
import { WsNewServerTestObject } from './test-objects';
import { TestSuitesComplete } from './test-suites-complete';

export const datapointsTestSuitesComplete: TestSuitesComplete = {
  title: 'Datapoints supporting',
  testSuites: [
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('plain query should be processed correctly')
      .withRecordsCount(54467)
      .withInputData({
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: ['geo', 'time'],
          value: ['life_expectancy_years', 'income_per_person_gdppercapita_ppp_inflation_adjusted', 'population_total']
        },
        where: {
          time: {$gt: 1800, $lt: 2016}
        },
        grouping: {},
        order_by: ['time', 'geo'],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('joins query should be processed correctly')
      .withRecordsCount(1155)
      .withInputData({
        select: {
          key: ['geo', 'time'],
          value: [
            'life_expectancy_years', 'population_total'
          ]
        },
        from: 'datapoints',
        where: {
          $and: [
            {geo: '$geo'},
            {time: '$time'},
            {
              $or: [
                {population_total: {$gt: 10000}},
                {life_expectancy_years: {$gt: 30, $lt: 70}}
              ]
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              $and: [
                {'is--country': true},
                {latitude: {$lte: 0}}
              ]
            }
          },
          $time: {
            key: 'time',
            where: {$and: [{time: {$gt: '1990', $lte: '2015'}}]}
          }
        },
        force: true,
        dataset: sg.getDataset()
      })
      .postponeFor('it should be serious refactoring for query processing: filter results after merging', WsNewServerTestObject)
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('joins query by one year should be processed correctly')
      .withRecordsCount(232)
      .withInputData({
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: ['geo', 'time'],
          value: ['life_expectancy_years', 'income_per_person_gdppercapita_ppp_inflation_adjusted', 'population_total']
        },
        where: {$and: [{geo: '$geo'}, {time: '$time'}]},
        join: {
          $geo: {key: 'geo', where: {'is--country': true}},
          $time: {key: 'time', where: {time: '2015'}}
        },
        order_by: ['time'],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('joins query by all period should be processed correctly')
      .withRecordsCount(87677)
      .withInputData({
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: ['geo', 'time'],
          value: ['life_expectancy_years', 'income_per_person_gdppercapita_ppp_inflation_adjusted', 'population_total']
        },
        where: {$and: [{geo: '$geo'}]},
        join: {
          $geo: {
            key: 'geo',
            where: {'is--country': true}
          }
        },
        order_by: ['time', 'geo'],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sgTiny)
      .withTitle('query by "ago" country should be processed correctly')
      .withRecordsCount(216)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: ['geo', 'time'],
          value: ['sg_population', 'sg_gdp_p_cap_const_ppp2011_dollar', 'sg_gini']
        },
        where: {
          $and: [{geo: '$geo'}, {time: '$time'}]
        },
        join: {
          $geo: {key: 'geo', where: {'is--country': true, geo: {$in: ['ago']}}},
          $time: {key: 'time', where: {time: {$gte: '1800', $lte: '2015'}}}
        },
        order_by: ['time', 'geo'],
        force: true,
        dataset: sgTiny.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(gmPopulation)
      .withTitle('query by gender, age, and country with code 900 should be processed correctly')
      .withRecordsCount(28902)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: ['country_code', 'year', 'gender', 'age'],
          value: ['population']
        },
        where: {
          $and: [{country_code: '$country_code'}]
        },
        join: {
          $country_code: {key: 'country_code', where: {country_code: {$in: ['900']}}}
        },
        order_by: ['country_code', 'year', 'gender', 'age'],
        force: true,
        dataset: gmPopulation.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sgTiny)
      .withTitle('query by "americas" and "asia" regions should be processed correctly')
      .withRecordsCount(42849)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: ['geo', 'time'],
          value: ['population_total']
        },
        where: {
          $and: [{geo: '$geo'}]
        },
        join: {
          $geo: {key: 'geo', where: {world_4region: {$in: ['americas', 'asia']}}}
        },
        order_by: ['geo', 'time'],
        force: true,
        dataset: sgTiny.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(bubbles3)
      .withTitle('should consume files with many indicators in different columns')
      .withRecordsCount(54787)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: ['country', 'time'],
          value: ['gdp_per_capita', 'life_expectancy', 'population']
        },
        where: {},
        join: {},
        order_by: ['country', 'time'],
        force: true,
        dataset: bubbles3.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(gmPopulationBig)
      .withTitle('multidimentional dataSource reading should return expected result')
      .withRecordsCount(100)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: ['geo', 'year', 'age'],
          value: ['population']
        },
        where: {
          $and: [{geo: '$geo'}, {year: '$year'}, {age: '$age'}]
        },
        join: {
          $geo: {key: 'geo', where: {geo: {$in: ['world']}}},
          $year: {key: 'year', where: {year: '2017'}},
          $age: {key: 'age', where: {age: {$nin: ['80plus', '100plus']}}}
        },
        order_by: ['geo', 'year', 'age'],
        force: true,
        dataset: gmPopulationBig.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(presentationSet)
      .withTitle('query with boolean condition should be processed correctly')
      .withRecordsCount(42120)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: ['geo', 'time'],
          value: ['income_per_person_gdppercapita_ppp_inflation_adjusted', 'life_expectancy_years', 'population_total']
        },
        where: {
          $and: [{geo: '$geo'}, {time: '$time'}]
        },
        join: {
          $geo: {key: 'geo', where: {un_state: true}},
          $time: {key: 'time', where: {time: {$gte: '1800', $lte: '2015'}}}
        },
        order_by: ['geo', 'time'],
        force: true,
        dataset: presentationSet.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(staticAssets)
      .withTitle('query with static assets should be processed correctly')
      .withRecordsCount(1)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: ['geo', 'time'],
          value: ['income_mountains']
        },
        where: {
          $and: [{geo: '$geo'}, {time: '$time'}]
        },
        join: {
          $geo: {key: 'geo', where: {geo: {$in: ['world']}}},
          $time: {key: 'time', where: {time: '2015'}}
        },
        order_by: ['geo', 'time'],
        force: true,
        dataset: staticAssets.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(gmPopulationBig)
      .withTitle('query with join and world4region should be processed correctly')
      .withRecordsCount(14300)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: ['geo', 'year', 'age'],
          value: ['population']
        },
        where: {
          $and: [{geo: '$geo'}, {age: '$age'}]
        },
        join: {
          $geo: {key: 'geo', where: {geo: {$in: ['world']}}},
          $age: {key: 'age', where: {age: {$nin: ['80plus', '100plus']}}}
        },
        order_by: ['geo', 'year', 'age'],
        force: true,
        dataset: gmPopulationBig.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sgMixEntity)
      .withTitle('query on dataSource that contains mixed kinds of entities in the same file should be processed correctly')
      .withRecordsCount(1)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'global',
            'time'
          ],
          value: [
            'population_total'
          ]
        },
        where: {},
        join: {},
        order_by: [
          'global',
          'time'
        ],
        force: true,
        dataset: sgMixEntity.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('query on dataSource when datapoint record contains domain but request contains entity set should be processed correctly')
      .withRecordsCount(5691)
      .withInputData({
        select: {
          key: ['country', 'time'],
          value: ['population_total', 'life_expectancy_years']
        },
        from: 'datapoints',
        where: {
          $and: [
            {time: '$time'}
          ]
        },
        join: {
          $time: {
            key: 'time',
            where: {
              time: {
                $gte: '1993',
                $lte: '2015'
              }
            }
          }
        },
        order_by: ['country', 'time'],
        language: 'en',
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sodertornsmodellen)
      .withTitle('filter datapoints by entity properties should be processed correctly')
      .withRecordsCount(178)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'basomrade',
            'year'
          ],
          value: [
            'mean_income_aged_gt_20',
            'post_secondary_education_min_3_years_aged_25_64',
            'population_aged_gt_20'
          ]
        },
        where: {
          $and: [
            {
              basomrade: '$basomrade'
            },
            {
              year: '$year'
            }
          ]
        },
        join: {
          $basomrade: {
            key: 'basomrade',
            where: {
              municipality: {
                $in: [
                  '0192_nynashamn',
                  '0127_botkyrka',
                  '0136_haninge',
                  '0126_huddinge',
                  '0128_salem',
                  '0138_tyreso'
                ]
              }
            }
          },
          $year: {
            key: 'year',
            where: {
              year: '2000'
            }
          }
        },
        order_by: [
          'basomrade',
          'year'
        ],
        force: true,
        dataset: sodertornsmodellen.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 1')
      .withRecordsCount(232)
      .withInputData({
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'life_expectancy_years',
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'population_total'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              'is--country': true
            }
          },
          $time: {
            key: 'time',
            where: {
              time: '2015'
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 2')
      .withRecordsCount(87677)
      .withInputData({
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'life_expectancy_years',
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'population_total'
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
              'is--country': true
            }
          }
        },
        order_by: [
          'time',
          'geo'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 3')
      .withRecordsCount(54467)
      .withInputData({
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'life_expectancy_years',
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'population_total'
          ]
        },
        where: {
          time: {
            $gt: 1800,
            $lt: 2016
          }
        },
        grouping: {},
        order_by: [
          'time',
          'geo'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(bubbles3)
      .withTitle('recent 4')
      .withRecordsCount(54787)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'country',
            'time'
          ],
          value: [
            'gdp_per_capita',
            'life_expectancy',
            'population'
          ]
        },
        where: {},
        join: {},
        order_by: [
          'country',
          'time'
        ],
        force: true,
        dataset: bubbles3.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 5')
      .withRecordsCount(39528)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'children_per_woman_total_fertility'
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
              un_state: true
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 6')
      .withRecordsCount(249)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'ifpri_underweight_children'
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
              un_state: true
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(staticAssets)
      .withTitle('recent 7')
      .withRecordsCount(1)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'income_mountains'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              geo: {
                $in: [
                  'world'
                ]
              }
            }
          },
          $time: {
            key: 'time',
            where: {
              time: '2015'
            }
          }
        },
        order_by: [
          'geo',
          'time'
        ],
        force: true,
        dataset: staticAssets.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 8')
      .withRecordsCount(54)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'life_expectancy_years',
            'population_total'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              $and: [
                {
                  un_state: true
                },
                {
                  world_4region: {
                    $in: [
                      'africa'
                    ]
                  }
                }
              ]
            }
          },
          $time: {
            key: 'time',
            where: {
              time: '2018'
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 9')
      .withRecordsCount(232)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'life_expectancy_years',
            'population_total'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              'is--country': true
            }
          },
          $time: {
            key: 'time',
            where: {
              time: '2015'
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 10')
      .withRecordsCount(54721)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'life_expectancy_years',
            'population_total'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              'is--country': true
            }
          },
          $time: {
            key: 'time',
            where: {
              time: {
                $gte: '1800',
                $lte: '2015'
              }
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 11')
      .withRecordsCount(195)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'life_expectancy_years',
            'population_total'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              un_state: true
            }
          },
          $time: {
            key: 'time',
            where: {
              time: '2018'
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(presentationSet)
      .withTitle('recent 12')
      .withRecordsCount(42120)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'life_expectancy_years',
            'population_total'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              un_state: true
            }
          },
          $time: {
            key: 'time',
            where: {
              time: {
                $gte: '1800',
                $lte: '2015'
              }
            }
          }
        },
        order_by: [
          'geo',
          'time'
        ],
        force: true,
        dataset: presentationSet.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 13')
      .withRecordsCount(18487)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'life_expectancy_years',
            'population_total'
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
              $and: [
                {
                  un_state: true
                },
                {
                  world_4region: {
                    $in: [
                      'africa'
                    ]
                  }
                }
              ]
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 14')
      // ???
      .withRecordsCount(0)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'life_expectancy_years',
            'population_total'
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
              $and: [
                {
                  un_state: true
                },
                {
                  world_4region: {
                    $in: [
                      'world'
                    ]
                  }
                }
              ]
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 15')
      .withRecordsCount(69565)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'life_expectancy_years',
            'population_total'
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
              un_state: true
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 16')
      .withRecordsCount(232)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'life_expectancy_years',
            'population_total'
          ]
        },
        where: {
          $and: [
            {
              time: '$time'
            }
          ]
        },
        join: {
          $time: {
            key: 'time',
            where: {
              time: '2018'
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 17')
      .withRecordsCount(87677)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'life_expectancy_years',
            'population_total'
          ]
        },
        where: {},
        join: {},
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 18')
      .withRecordsCount(54)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'population_total'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              $and: [
                {
                  un_state: true
                },
                {
                  world_4region: {
                    $in: [
                      'africa'
                    ]
                  }
                }
              ]
            }
          },
          $time: {
            key: 'time',
            where: {
              time: '2018'
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 19')
      .withRecordsCount(18487)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'population_total'
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
              $and: [
                {
                  un_state: true
                },
                {
                  world_4region: {
                    $in: [
                      'africa'
                    ]
                  }
                }
              ]
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 20')
      .withRecordsCount(964)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'income_per_person_gdppercapita_ppp_inflation_adjusted'
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
              $and: [
                {
                  un_state: true
                },
                {
                  geo: {
                    $in: [
                      'usa',
                      'rus',
                      'chn',
                      'nga'
                    ]
                  }
                }
              ]
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 21')
      .withRecordsCount(26751)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'income_per_person_gdppercapita_ppp_inflation_adjusted'
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
              $and: [
                {
                  un_state: true
                },
                {
                  world_4region: {
                    $in: [
                      'africa',
                      'asia'
                    ]
                  }
                }
              ]
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 22')
      .withRecordsCount(13014)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'income_per_person_gdppercapita_ppp_inflation_adjusted'
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
              $and: [
                {
                  un_state: true
                },
                {
                  world_4region: {
                    $in: [
                      'africa',
                      'world'
                    ]
                  }
                }
              ]
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 23')
      .withRecordsCount(195)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'life_expectancy_years',
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'population_total'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              un_state: true
            }
          },
          $time: {
            key: 'time',
            where: {
              time: '2018'
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 24')
      .withRecordsCount(69565)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'life_expectancy_years',
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'population_total'
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
              un_state: true
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 25')
      .withRecordsCount(69565)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'life_expectancy_years',
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'population_total'
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
              un_state: true
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 26')
      .withRecordsCount(561)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'literacy_rate_adult_total_percent_of_people_ages_15_and_above'
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
              un_state: true
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 27')
      .withRecordsCount(518)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'males_aged_55plus_unemployment_rate_percent'
          ]
        },
        where: {},
        join: {},
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 28')
      .withRecordsCount(178)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'pneumonia_deaths_in_newborn_per_1000_births'
          ]
        },
        where: {},
        join: {},
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 29')
      .withRecordsCount(195)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'population_total',
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'gapminder_gini'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              un_state: true
            }
          },
          $time: {
            key: 'time',
            where: {
              time: '2015'
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 30')
      .withRecordsCount(195)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'population_total',
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'gapminder_gini'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              un_state: true
            }
          },
          $time: {
            key: 'time',
            where: {
              time: '2018'
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 31')
      .withRecordsCount(69565)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'population_total',
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'gapminder_gini'
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
              un_state: true
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 32')
      .withRecordsCount(232)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'population_total',
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'gapminder_gini'
          ]
        },
        where: {
          $and: [
            {
              time: '$time'
            }
          ]
        },
        join: {
          $time: {
            key: 'time',
            where: {
              time: '2015'
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 33')
      .withRecordsCount(54721)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'population_total',
            'income_per_person_gdppercapita_ppp_inflation_adjusted',
            'gapminder_gini'
          ]
        },
        where: {
          $and: [
            {
              time: '$time'
            }
          ]
        },
        join: {
          $time: {
            key: 'time',
            where: {
              time: {
                $gte: '1800',
                $lte: '2015'
              }
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 34')
      .withRecordsCount(231)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'population_total'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              'is--country': true
            }
          },
          $time: {
            key: 'time',
            where: {
              time: '2015'
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 35')
      .withRecordsCount(54713)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'population_total'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              'is--country': true
            }
          },
          $time: {
            key: 'time',
            where: {
              time: {
                $gte: '1800',
                $lte: '2015'
              }
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 36')
      .withRecordsCount(195)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'population_total'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              un_state: true
            }
          },
          $time: {
            key: 'time',
            where: {
              time: '2010'
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 37')
      .withRecordsCount(195)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'population_total'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              un_state: true
            }
          },
          $time: {
            key: 'time',
            where: {
              time: '2013'
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 38')
      .withRecordsCount(195)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'population_total'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              un_state: true
            }
          },
          $time: {
            key: 'time',
            where: {
              time: '2013'
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 39')
      .withRecordsCount(195)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'population_total'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              un_state: true
            }
          },
          $time: {
            key: 'time',
            where: {
              time: '2018'
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 40')
      .withRecordsCount(69565)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'population_total'
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
              un_state: true
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sgTiny)
      .withTitle('recent 41')
      .withRecordsCount(42849)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'population_total'
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
              world_4region: {
                $in: [
                  'americas',
                  'asia'
                ]
              }
            }
          }
        },
        order_by: [
          'geo',
          'time'
        ],
        force: true,
        dataset: sgTiny.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 42')
      .withRecordsCount(231)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'population_total'
          ]
        },
        where: {
          $and: [
            {
              time: '$time'
            }
          ]
        },
        join: {
          $time: {
            key: 'time',
            where: {
              time: '2015'
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 43')
      .withRecordsCount(54713)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'population_total'
          ]
        },
        where: {
          $and: [
            {
              time: '$time'
            }
          ]
        },
        join: {
          $time: {
            key: 'time',
            where: {
              time: {
                $gte: '1800',
                $lte: '2015'
              }
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 44')
      .withRecordsCount(184)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'residential_electricity_use_total',
            'cervical_cancer_number_of_female_deaths',
            'trade_balance_percent_of_gdp'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              un_state: true
            }
          },
          $time: {
            key: 'time',
            where: {
              time: '2002'
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 45')
      .withRecordsCount(8338)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'residential_electricity_use_total',
            'cervical_cancer_number_of_female_deaths',
            'trade_balance_percent_of_gdp'
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
              un_state: true
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 46')
      .withRecordsCount(8614)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'residential_electricity_use_total',
            'cervical_cancer_number_of_female_deaths',
            'trade_balance_percent_of_gdp'
          ]
        },
        where: {},
        join: {},
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 47')
      .withRecordsCount(4639)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'residential_electricity_use_total',
            'cervical_cancer_number_of_female_deaths'
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
              un_state: true
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 48')
      .withRecordsCount(5288)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'residential_energy_use_percent'
          ]
        },
        where: {},
        join: {},
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sgTiny)
      .withTitle('recent 49')
      .withRecordsCount(216)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'time',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'sg_population',
            'sg_gdp_p_cap_const_ppp2011_dollar',
            'sg_gini'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              'is--country': true,
              geo: {
                $in: [
                  'ago'
                ]
              }
            }
          },
          $time: {
            key: 'time',
            where: {
              time: {
                $gte: '1800',
                $lte: '2015'
              }
            }
          }
        },
        order_by: [
          'time',
          'geo'
        ],
        force: true,
        dataset: sgTiny.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sodertornsmodellen)
      .withTitle('recent 50')
      .withRecordsCount(2172)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'basomrade',
            'year',
            'gender'
          ],
          value: [
            'mean_income_aged_gt_20',
            'post_secondary_education_min_3_years_aged_25_64'
          ]
        },
        where: {
          $and: [
            {
              year: '$year'
            }
          ]
        },
        join: {
          $year: {
            key: 'year',
            where: {
              year: '2014'
            }
          }
        },
        order_by: [
          'year'
        ],
        force: true,
        dataset: sodertornsmodellen.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sodertornsmodellen)
      .withTitle('recent 51')
      .withRecordsCount(32446)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'basomrade',
            'year',
            'gender'
          ],
          value: [
            'mean_income_aged_gt_20',
            'post_secondary_education_min_3_years_aged_25_64'
          ]
        },
        where: {
          $and: [
            {
              year: '$year'
            }
          ]
        },
        join: {
          $year: {
            key: 'year',
            where: {
              year: {
                $gte: '2000',
                $lte: '2014'
              }
            }
          }
        },
        order_by: [
          'year'
        ],
        force: true,
        dataset: sodertornsmodellen.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sodertornsmodellen)
      .withTitle('recent 52')
      .withRecordsCount(178)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'basomrade',
            'year'
          ],
          value: [
            'mean_income_aged_gt_20',
            'post_secondary_education_min_3_years_aged_25_64',
            'population_aged_gt_20'
          ]
        },
        where: {
          $and: [
            {
              basomrade: '$basomrade'
            },
            {
              year: '$year'
            }
          ]
        },
        join: {
          $basomrade: {
            key: 'basomrade',
            where: {
              municipality: {
                $in: [
                  '0192_nynashamn',
                  '0127_botkyrka',
                  '0136_haninge',
                  '0126_huddinge',
                  '0128_salem',
                  '0138_tyreso'
                ]
              }
            }
          },
          $year: {
            key: 'year',
            where: {
              year: '2000'
            }
          }
        },
        order_by: [
          'basomrade',
          'year'
        ],
        force: true,
        dataset: sodertornsmodellen.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sodertornsmodellen)
      .withTitle('recent 53')
      .withRecordsCount(1086)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'basomrade',
            'year'
          ],
          value: [
            'post_secondary_education_min_3_years_aged_25_64'
          ]
        },
        where: {
          $and: [
            {
              year: '$year'
            }
          ]
        },
        join: {
          $year: {
            key: 'year',
            where: {
              year: '2014'
            }
          }
        },
        order_by: [
          'year'
        ],
        force: true,
        dataset: sodertornsmodellen.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sodertornsmodellen)
      .withTitle('recent 54')
      .withRecordsCount(16223)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'basomrade',
            'year'
          ],
          value: [
            'post_secondary_education_min_3_years_aged_25_64'
          ]
        },
        where: {
          $and: [
            {
              year: '$year'
            }
          ]
        },
        join: {
          $year: {
            key: 'year',
            where: {
              year: {
                $gte: '2000',
                $lte: '2014'
              }
            }
          }
        },
        order_by: [
          'year'
        ],
        force: true,
        dataset: sodertornsmodellen.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(gmPopulation)
      .withTitle('recent 55')
      .withRecordsCount(28902)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'country_code',
            'year',
            'gender',
            'age'
          ],
          value: [
            'population'
          ]
        },
        where: {
          $and: [
            {
              country_code: '$country_code'
            }
          ]
        },
        join: {
          $country_code: {
            key: 'country_code',
            where: {
              country_code: {
                $in: [
                  '900'
                ]
              }
            }
          }
        },
        order_by: [
          'country_code',
          'year',
          'gender',
          'age'
        ],
        force: true,
        dataset: gmPopulation.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(gmPopulationBig)
      .withTitle('recent 56')
      .withRecordsCount(14300)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'geo',
            'year',
            'age'
          ],
          value: [
            'population'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              age: '$age'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              $and: [
                {
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
                },
                {
                  geo: {
                    $in: [
                      'world'
                    ]
                  }
                }
              ]
            }
          },
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
          'year'
        ],
        force: true,
        dataset: gmPopulationBig.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(gmPopulationBig)
      .withTitle('recent 57')
      .withRecordsCount(14300)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'geo',
            'year',
            'age'
          ],
          value: [
            'population'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              age: '$age'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              geo: {
                $in: [
                  'world'
                ]
              }
            }
          },
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
          'geo',
          'year',
          'age'
        ],
        force: true,
        dataset: gmPopulationBig.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(gmPopulationBig)
      .withTitle('recent 58')
      .withRecordsCount(14300)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'geo',
            'year',
            'age'
          ],
          value: [
            'population'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              age: '$age'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              geo: {
                $in: [
                  'world'
                ]
              }
            }
          },
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
          'year'
        ],
        force: true,
        dataset: gmPopulationBig.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(gmPopulationBig)
      .withTitle('recent 59')
      .withRecordsCount(100)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'geo',
            'year',
            'age'
          ],
          value: [
            'population'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              year: '$year'
            },
            {
              age: '$age'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              $and: [
                {
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
                },
                {
                  geo: {
                    $in: [
                      'world'
                    ]
                  }
                }
              ]
            }
          },
          $year: {
            key: 'year',
            where: {
              year: '2018'
            }
          },
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
          'year'
        ],
        force: true,
        dataset: gmPopulationBig.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(gmPopulationBig)
      .withTitle('recent 60')
      .withRecordsCount(100)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'geo',
            'year',
            'age'
          ],
          value: [
            'population'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              year: '$year'
            },
            {
              age: '$age'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              geo: {
                $in: [
                  'world'
                ]
              }
            }
          },
          $year: {
            key: 'year',
            where: {
              year: '2017'
            }
          },
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
          'geo',
          'year',
          'age'
        ],
        force: true,
        dataset: gmPopulationBig.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(gmPopulationBig)
      .withTitle('recent 61')
      .withRecordsCount(28600)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'geo',
            'year',
            'gender',
            'age'
          ],
          value: [
            'population'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              age: '$age'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              $and: [
                {
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
                },
                {
                  geo: {
                    $in: [
                      'world'
                    ]
                  }
                }
              ]
            }
          },
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
          'year'
        ],
        force: true,
        dataset: gmPopulationBig.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(gmPopulationBig)
      .withTitle('recent 62')
      .withRecordsCount(14300)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'geo',
            'year',
            'gender',
            'age'
          ],
          value: [
            'population'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              gender: '$gender'
            },
            {
              age: '$age'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              $and: [
                {
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
                },
                {
                  geo: {
                    $in: [
                      'world'
                    ]
                  }
                }
              ]
            }
          },
          $gender: {
            key: 'gender',
            where: {
              gender: {
                $in: [
                  'female'
                ]
              }
            }
          },
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
          'year'
        ],
        force: true,
        dataset: gmPopulationBig.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(gmPopulationBig)
      .withTitle('recent 63')
      .withRecordsCount(200)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'geo',
            'year',
            'gender',
            'age'
          ],
          value: [
            'population'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              year: '$year'
            },
            {
              age: '$age'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              $and: [
                {
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
                },
                {
                  geo: {
                    $in: [
                      'world'
                    ]
                  }
                }
              ]
            }
          },
          $year: {
            key: 'year',
            where: {
              year: '2018'
            }
          },
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
          'year'
        ],
        force: true,
        dataset: gmPopulationBig.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(gmPopulationBig)
      .withTitle('recent 64')
      .withRecordsCount(100)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'geo',
            'year',
            'gender',
            'age'
          ],
          value: [
            'population'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              year: '$year'
            },
            {
              gender: '$gender'
            },
            {
              age: '$age'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              $and: [
                {
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
                },
                {
                  geo: {
                    $in: [
                      'world'
                    ]
                  }
                }
              ]
            }
          },
          $year: {
            key: 'year',
            where: {
              year: '2018'
            }
          },
          $gender: {
            key: 'gender',
            where: {
              gender: {
                $in: [
                  'female'
                ]
              }
            }
          },
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
          'year'
        ],
        force: true,
        dataset: gmPopulationBig.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sgMixEntity)
      .withTitle('recent 65')
      .withRecordsCount(1)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'global',
            'time'
          ],
          value: [
            'population_total'
          ]
        },
        where: {},
        join: {},
        order_by: [
          'global',
          'time'
        ],
        force: true,
        dataset: sgMixEntity.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sodertornsmodellen)
      .withTitle('recent 66')
      .withRecordsCount(26)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'municipality',
            'year'
          ],
          value: [
            'population_20xx_12_31',
            'cumulative_immigration_surplus_employed_aged_20_64'
          ]
        },
        where: {
          $and: [
            {
              year: '$year'
            }
          ]
        },
        join: {
          $year: {
            key: 'year',
            where: {
              year: '2014'
            }
          }
        },
        order_by: [
          'year'
        ],
        force: true,
        dataset: sodertornsmodellen.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sodertornsmodellen)
      .withTitle('recent 67')
      .withRecordsCount(390)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'municipality',
            'year'
          ],
          value: [
            'population_20xx_12_31',
            'cumulative_immigration_surplus_employed_aged_20_64'
          ]
        },
        where: {
          $and: [
            {
              year: '$year'
            }
          ]
        },
        join: {
          $year: {
            key: 'year',
            where: {
              year: {
                $gte: '1993',
                $lte: '2015'
              }
            }
          }
        },
        order_by: [
          'year'
        ],
        force: true,
        dataset: sodertornsmodellen.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sodertornsmodellen)
      .withTitle('recent 68')
      .withRecordsCount(26)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'municipality',
            'year'
          ],
          value: [
            'population_20xx_12_31'
          ]
        },
        where: {
          $and: [
            {
              year: '$year'
            }
          ]
        },
        join: {
          $year: {
            key: 'year',
            where: {
              year: '2014'
            }
          }
        },
        order_by: [
          'year'
        ],
        force: true,
        dataset: sodertornsmodellen.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sodertornsmodellen)
      .withTitle('recent 69')
      .withRecordsCount(390)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        animatable: 'year',
        select: {
          key: [
            'municipality',
            'year'
          ],
          value: [
            'population_20xx_12_31'
          ]
        },
        where: {
          $and: [
            {
              year: '$year'
            }
          ]
        },
        join: {
          $year: {
            key: 'year',
            where: {
              year: {
                $gte: '1993',
                $lte: '2015'
              }
            }
          }
        },
        order_by: [
          'year'
        ],
        force: true,
        dataset: sodertornsmodellen.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 70')
      .withRecordsCount(1)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'income_mountains'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              geo: {
                $in: [
                  'world'
                ]
              }
            }
          },
          $time: {
            key: 'time',
            where: {
              time: '2015'
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern),
    new TestSuite()
      .forDataSuite(sg)
      .withTitle('recent 71')
      .withRecordsCount(1)
      .withInputData({
        language: 'en',
        from: 'datapoints',
        select: {
          key: [
            'geo',
            'time'
          ],
          value: [
            'income_mountains'
          ]
        },
        where: {
          $and: [
            {
              geo: '$geo'
            },
            {
              time: '$time'
            }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              geo: {
                $in: [
                  'world'
                ]
              }
            }
          },
          $time: {
            key: 'time',
            where: {
              time: '2018'
            }
          }
        },
        order_by: [
          'time'
        ],
        force: true,
        dataset: sg.getDataset()
      })
      .withAssertPattern(GeneralAssertPattern)
  ]
};

describe(datapointsTestSuitesComplete.title, () => {
  const aggregatedData = {};

  after(() => {
    printSummaryTable(datapointsTestSuitesComplete.testSuites, aggregatedData);
  });

  runTests(getTestObjectGroups, datapointsTestSuitesComplete.testSuites, aggregatedData);
});
