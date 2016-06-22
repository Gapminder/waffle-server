'use strict';

const assert = require('assert');
const format = require('./format.processor');
const _ = require('lodash');

describe('format data post processor', () => {
  context('default formatters (csv, json)', () => {
    it('should format input data as CSV', (done) => {
      let input = {
        headers: ['geo', 'year', 'gini'],
        rows: [
          ["usa", 2004, 42],
          ["usa", 2005, 42],
          ["usa", 2006, 42],
          ["usa", 2007, 42],
          ["usa", 2008, 42],
          ["usa", 2009, 42],
          ["usa", 2010, 42]
        ]
      };

      let expected = [
        '"geo","year","gini"',
        '"usa",2004,42',
        '"usa",2005,42',
        '"usa",2006,42',
        '"usa",2007,42',
        '"usa",2008,42',
        '"usa",2009,42',
        '"usa",2010,42'
      ].join('\n');

      format(input, 'csv', (err, csv) => {
        assert.deepEqual(csv, expected);
        done();
      });
    });

    it('should format input data as JSON', (done) => {
      let input = {
        headers: ['geo', 'year', 'gini'],
        rows: [
          ["usa", 2004, 42],
          ["usa", 2005, 42],
          ["usa", 2006, 42],
          ["usa", 2007, 42],
          ["usa", 2008, 42],
          ["usa", 2009, 42],
          ["usa", 2010, 42]
        ]
      };

      let expected = [
        {
          "geo": "usa",
          "year": 2004,
          "gini": 42
        },
        {
          "geo": "usa",
          "year": 2005,
          "gini": 42
        },
        {
          "geo": "usa",
          "year": 2006,
          "gini": 42
        },
        {
          "geo": "usa",
          "year": 2007,
          "gini": 42
        },
        {
          "geo": "usa",
          "year": 2008,
          "gini": 42
        },
        {
          "geo": "usa",
          "year": 2009,
          "gini": 42
        },
        {
          "geo": "usa",
          "year": 2010,
          "gini": 42
        }
      ];

      format(input, 'json', (err, json) => {
        assert.deepEqual(json, expected);
        done();
      });
    });

    it('should respond with WsJson by default', (done) => {
      let input = {
        headers: ['geo', 'year', 'gini'],
        rows: [
          ["usa", 2004, 42],
          ["usa", 2005, 42],
          ["usa", 2006, 42],
          ["usa", 2007, 42],
          ["usa", 2008, 42],
          ["usa", 2009, 42],
          ["usa", 2010, 42]
        ]
      };

      format(input, 'bla-bla', (err, wsJson) => {
        assert.deepEqual(wsJson, input);
        done();
      });
    });
  });

  context('custom formatters (ddf)', () => {
    // var jsonfile = require('jsonfile');
    // var file = '/home/korel/Projects/ws-vizabi/waffle-server/ws.routes/data-post-processors/entities.json';
    // jsonfile.writeFileSync(file, pipe.entities);
    // file = '/home/korel/Projects/ws-vizabi/waffle-server/ws.routes/data-post-processors/concepts.json';
    // jsonfile.writeFileSync(file, pipe.concepts);
    // file = '/home/korel/Projects/ws-vizabi/waffle-server/ws.routes/data-post-processors/datapoints.json';
    // jsonfile.writeFileSync(file, pipe.datapoints);

    it('should format input concept data as DDF JSON', (done) => {
      let headers = ['sg_population', 'energy_use_total'];

      let concepts = require('./fixtures/concepts.json');
      let expectedConceptGids = ['geo', 'time', 'new_concept', 'sg_population', 'energy_use_total'];
      let expectedConceptProperties = ["description_long", "concept", "name", "concept_type", "domain", "indicator_url", "scales", "drill_up", "unit", "interpolation", "description"];
      let expectedConceptPropertyValues = ["geo long", "geo", "Geographic location",
        "entity_domain", null,
        "https://github.com/open-numbers/ddf--gapminder--dim_geo_countries_and_groups/blob/master/ddf--list--geo--country.csv",
        "[\"ordinal\"]", "", "time", "Time", "[\"time\"]",
        "string", "new concept", "new_concept", "sg_population", "measure",
        "http://www.gapminder.org/news/data-sources-dont-panic-end-poverty",
        "[\"linear\",\"log\"]", "energy_use_total", "Energy use",
        "https://docs.google.com/spreadsheet/pub?key=0AkBd6lyS3EmpdHd2Nld0NEVFOGRiSTc0V3ZoekNuS1E",
        "tons in oil eqv", "Energy use refers to use of primary energy before transformation to other end-use fuels, which is equal to indigenous production plus imports and stock changes, minus exports and fuels supplied to ships and aircraft engaged in international transport, counted in tonnes of oil equivalent (toe)."];
      let expectedConceptRows = [
        [0, 1, 2, 3, 4, 5, 6, 4, 4, 4, 4],
        [7, 8, 9, 3, 4, 4, 10, 4, 4, 4, 4],
        [7, 13, 12, 11, 7, 7, 4, 4, 7, 7, 7],
        [7, 14, 14, 15, 4, 16, 17, 4, 4, 4, 4],
        [7, 18, 19, 15, 4, 20, 17, 4, 21, 4, 22]
      ];

      let input = {
        concepts: _.pick(concepts, expectedConceptGids),
        entities: {},
        datapoints: {},
        headers: headers
      };

      format(input, 'ddf', (err, json) => {
        assert.ok(_.isObject(json.concepts));
        assert.ok(_.isObject(json.entities));
        assert.ok(_.isObject(json.datapoints));

        let areEntriesEmpty = (entries) => {
          return _.chain(entries)
            .omit('concepts')
            .values()
            .every(_.isEmpty)
            .value();
        };
        assert.ok(areEntriesEmpty(json.entities));
        assert.ok(areEntriesEmpty(json.datapoints));
        assert.deepEqual(json.entities.concepts, _.map(['geo', 'time'], (concept) => expectedConceptGids.indexOf(concept)));
        assert.deepEqual(json.datapoints.concepts, _.map(headers, (header) => expectedConceptGids.indexOf(header)));

        assert.deepEqual(json.concepts.values, expectedConceptGids);
        assert.deepEqual(json.concepts.properties, expectedConceptProperties);
        assert.deepEqual(json.concepts.propertyValues, expectedConceptPropertyValues);
        assert.deepEqual(json.concepts.rows, expectedConceptRows);

        done();
      });
    });

    it('should format input entities data as DDF JSON', (done) => {
      let headers = ['sg_population', 'energy_use_total'];

      let concepts = require('./fixtures/concepts.json');
      let expectedConceptGids = ['geo', 'time', 'lng_value'];
      let expectedConceptProperties = ["description_long", "concept", "name", "concept_type", "domain", "indicator_url", "scales", "drill_up", "unit", "interpolation", "description"];;
      let expectedConceptPropertyValues = [
        "geo long", "geo", "Geographic location", "entity_domain", null,
        "https://github.com/open-numbers/ddf--gapminder--dim_geo_countries_and_groups/blob/master/ddf--list--geo--country.csv",
        "[\"ordinal\"]", "", "time", "Time", "[\"time\"]",
        "lng_value", "Value", "string"
      ];
      let expectedConceptRows = [
        [0, 1, 2, 3, 4, 5, 6, 4, 4, 4, 4],
        [7, 8, 9, 3, 4, 4, 10, 4, 4, 4, 4],
        [7, 11, 12, 13, 4, 4, 4, 4, 4, 4, 4]
      ];

      let entities = require('./fixtures/entities.json');
      let expectedEntityGids = ['2000', '1800', '1900', 'ukraine', 'usa'];
      let expectedEntityProperties = [ "year", "geo", "energy_use_total", "sg_population", "country", "gwid", "name", "geographic_regions", "income_groups", "landlocked", "geographic_regions_in_4_colors", "main_religion_2008", "gapminder_list", "alternative_1", "alternative_2", "alternative_3", "alternative_4_cdiac", "pandg", "god_id", "alt_5", "upper_case_name", "code", "number", "arb1", "arb2", "arb3", "arb4", "arb5", "arb6", "is--country", "world_4region", "latitude", "longitude", "description", "originId"];
      let expectedEntityProperiesValues = [
        2000, "alb", 1780000, 19286, 1800, "abw", 29311, 1900,
        "ukraine", "i237", "Ukraine", "europe_central_asia", "lower_middle_income", "coastline", "europe", "christian",
        "", "UKRAINE", "UA", "UKR", 804, true, 49, 32, "576949f1383edf7c1e1cf446",
        "usa", "i240", "United States", "america", "high_income", "United States of America",
        "USA", "U.S.A.", "United States Of America", "UNITED STATES",
        "US", "U.S.", 840, "americas", 39.76, -98.5, "576949f1383edf7c1e1cf44a"
      ];
      let expectedEntitiesRows = [
        [0, '10', 0, 1, 2, 3, 4, 5, 3, 6, 2, 7, 8, 9, 10, 11, 12, 13, 11, 8, 14, 15, 15, 15, 15, 15, 15, 16, 17, 18, 19, 2, 20, -1, -1, -1, -1],
        [0, '10', 0, 1, 2, 3, 4, 5, 3, 6, 2, 7, 8, 9, 10, 11, 12, 13, 11, 8, 14, 15, 15, 15, 15, 15, 15, 16, 17, 18, 19, 2, 20, -1, -1, -1, -1],
        [1, '10', 21, 22, 23, 24, 25, 5, 26, 6, 23, 15, 15, 15, 23, 27, 28, 15, 27, 29, 30, 15, 15, 15, 15, 15, 15, 16, 26, 31, 32, 23, 33, -1, -1, -1, -1],
        [2, '01', -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 34, 35, 36, -1 ],
        [3, '01', -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 37, 38, 36, -1 ],
        [4, '01', -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 39, 40, 41 ]
      ];

      let actualConcepts = _.pick(concepts, expectedConceptGids);
      let actualEntities = _.chain(entities)
        .pickBy((value) => _.includes(expectedEntityGids, value.gid))
        // create 2 entities `usa`
        .reduceRight((result, value) => {
          if (_.isEmpty(result)) {
            let _value = _.chain(value).clone().assign({sets: []}).value();
            result.push(_value);
          }

          result.push(value);

          return result;
        },[])
        .value();

      let input = {
        concepts: actualConcepts,
        entities: actualEntities,
        datapoints: {},
        headers: headers
      };

      format(input, 'ddf', (err, json) => {
        assert.ok(_.isObject(json.entities));
        assert.ok(_.isObject(json.concepts));
        assert.ok(_.isObject(json.datapoints));

        assert.ok(_.every(_.values(json.datapoints), _.isEmpty));

        assert.deepEqual(json.concepts.values.sort(), expectedConceptGids.sort());
        assert.deepEqual(json.concepts.properties.sort(), expectedConceptProperties.sort());
        assert.deepEqual(json.concepts.propertyValues.sort(), expectedConceptPropertyValues.sort());
        assert.deepEqual(json.concepts.rows, expectedConceptRows);

        assert.deepEqual(json.entities.values.sort(), expectedEntityGids.sort());
        assert.deepEqual(json.entities.properties.sort(), expectedEntityProperties.sort());
        assert.deepEqual(json.entities.propertyValues.sort(), expectedEntityProperiesValues.sort());
        assert.deepEqual(json.entities.rows, expectedEntitiesRows);

        done();
      });
    });

    it('should format input datapoints data as DDF JSON', (done) => {
      let headers = ['sg_population', 'energy_use_total'];
      let concepts = require('./fixtures/concepts.json');
      let expectedConceptGids = ['geo', 'time', 'sg_population', 'energy_use_total'];
      let actualConcepts = _.pick(concepts, expectedConceptGids);

      let entities = require('./fixtures/entities.json');
      let expectedEntityGids = ['2000', '1800', '1900', 'ukraine', 'usa'];
      let actualEntities = _.pickBy(entities, (value) => _.includes(expectedEntityGids, value.gid));
      let actualEntitiesByOriginId = _.keyBy(actualEntities, 'originId');

      let datapoints = require('./fixtures/datapoints.json');
      let areEntitiesExist = (dimensions) => {
        return _.every(dimensions, _.partial(_.includes, expectedEntityGids));
      };
      let actualDatapoints = _.filter(datapoints, (datapoint) => {
        let dimensionsByGids = _.map(datapoint.dimensions, (entityOriginId) => {
          return actualEntitiesByOriginId[entityOriginId] ? actualEntitiesByOriginId[entityOriginId].gid : '';
        });

        return areEntitiesExist(dimensionsByGids);
      });
      let expectedValues = [2273000000, 6801854, 77415610, 282895741, 133800000, 11215490, 23471939, 48746269];
      let expectedConcepts = [2, 3];
      let expectedConceptRows = [
        ['100000', 3, 0],
        ['100001', 1, -1],
        ['100010', 2, -1],
        ['011000', 7, 4],
        ['011001', 5, -1],
        ['011010', 6, -1]
      ];

      let input = {
        concepts: actualConcepts,
        entities: actualEntities,
        datapoints: actualDatapoints,
        headers: headers
      };

      format(input, 'ddf', (err, json) => {
        assert.ok(_.isObject(json.entities));
        assert.ok(_.isObject(json.concepts));
        assert.ok(_.isObject(json.datapoints));

        assert.deepEqual(json.datapoints.values.sort(), expectedValues.sort());
        assert.deepEqual(json.datapoints.concepts.sort(), expectedConcepts.sort());
        assert.deepEqual(json.datapoints.rows, expectedConceptRows);

        done();
      });
    });
  });
});
