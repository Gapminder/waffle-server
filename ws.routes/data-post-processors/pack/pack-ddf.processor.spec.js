'use strict';

const _ = require('lodash');
const pack = require('./pack.processor.js');
const assert = require('assert');
const constants = require('../../../ws.utils/constants');

describe('pack data post processor to ddfJson', () => {
  // var jsonfile = require('jsonfile');
  // var file = '/home/korel/Projects/ws-vizabi/waffle-server/ws.routes/data-post-processors/fixtures/entities.json';
  // jsonfile.writeFileSync(file, pipe.entities);
  // file = '/home/korel/Projects/ws-vizabi/waffle-server/ws.routes/data-post-processors/fixtures/concepts.json';
  // jsonfile.writeFileSync(file, pipe.concepts);
  // file = '/home/korel/Projects/ws-vizabi/waffle-server/ws.routes/data-post-processors/fixtures/datapoints.json';
  // jsonfile.writeFileSync(file, pipe.datapoints);

  it('should pack input concepts data to ddfJson', (done) => {
    const headers = ['sg_population', 'energy_use_total'];

    const concepts = require('./../fixtures/concepts.json');
    const expectedConceptGids = ['geo', 'time', 'new_concept', 'sg_population', 'energy_use_total'];
    const expectedConceptProperties = ["description_long", "concept", "name", "concept_type", "domain", "indicator_url", "scales", "drill_up", "unit", "interpolation", "description"];
    const expectedConceptPropertyValues = ["geo long", "geo", "Geographic location",
      "entity_domain", null,
      "https://github.com/open-numbers/ddf--gapminder--dim_geo_countries_and_groups/blob/master/ddf--list--geo--country.csv",
      "[\"ordinal\"]", "", "time", "Time", "[\"time\"]",
      "string", "new concept", "new_concept", "sg_population", "measure",
      "http://www.gapminder.org/news/data-sources-dont-panic-end-poverty",
      "[\"linear\",\"log\"]", "energy_use_total", "Energy use",
      "https://docs.google.com/spreadsheet/pub?key=0AkBd6lyS3EmpdHd2Nld0NEVFOGRiSTc0V3ZoekNuS1E",
      "tons in oil eqv", "Energy use refers to use of primary energy before transformation to other end-use fuels, which is equal to indigenous production plus imports and stock changes, minus exports and fuels supplied to ships and aircraft engaged in international transport, counted in tonnes of oil equivalent (toe)."];
    const expectedConceptRows = [
      [0, 1, 2, 3, 4, 5, 6, 4, 4, 4, 4],
      [7, 8, 9, 3, 4, 4, 10, 4, 4, 4, 4],
      [7, 13, 12, 11, 7, 7, 4, 4, 7, 7, 7],
      [7, 14, 14, 15, 4, 16, 17, 4, 4, 4, 4],
      [7, 18, 19, 15, 4, 20, 17, 4, 21, 4, 22]
    ];

    const input = {
      concepts: _.pick(concepts, expectedConceptGids),
      entities: {},
      datapoints: {},
      headers: headers
    };

    pack(input, 'ddfJson', (err, json) => {
      // var jsonfile = require('jsonfile');
      // var file =
      //   '/home/korel/Projects/ws-vizabi/waffle-server/ws.routes/data-post-processors/fixtures/ddf-json-concepts.json';
      // jsonfile.writeFileSync(file, json);

      assert.ok(_.isObject(json.concepts));
      assert.ok(_.isNil(json.entities));
      assert.ok(_.isNil(json.datapoints));

      assert.deepEqual(json.concepts.values, expectedConceptGids);
      assert.deepEqual(json.concepts.properties, expectedConceptProperties);
      assert.deepEqual(json.concepts.propertyValues, expectedConceptPropertyValues);
      assert.deepEqual(json.concepts.rows, expectedConceptRows);

      done();
    });
  });

  it('should pack input entities data to ddfJson', (done) => {
    const headers = ['sg_population', 'energy_use_total'];

    const concepts = require('./../fixtures/concepts.json');
    const expectedConceptGids = ['geo', 'time', 'lng_value'];
    const expectedConceptProperties = ["description_long", "concept", "name", "concept_type", "domain", "indicator_url", "scales", "drill_up", "unit", "interpolation", "description"];

    const expectedConceptPropertyValues = [
      "geo long", "geo", "Geographic location", "entity_domain", null,
      "https://github.com/open-numbers/ddf--gapminder--dim_geo_countries_and_groups/blob/master/ddf--list--geo--country.csv",
      "[\"ordinal\"]", "", "time", "Time", "[\"time\"]",
      "lng_value", "Value", "string"
    ];
    const expectedConceptRows = [
      [0, 1, 2, 3, 4, 5, 6, 4, 4, 4, 4],
      [7, 8, 9, 3, 4, 4, 10, 4, 4, 4, 4],
      [7, 11, 12, 13, 4, 4, 4, 4, 4, 4, 4]
    ];

    const entities = require('./../fixtures/entities.json');
    const expectedEntityGids = ['2000', '1800', '1900', 'ukraine', 'usa'];
    const expectedEntityProperties = ["year", "geo", "energy_use_total", "sg_population", "country", "gwid", "name", "geographic_regions", "income_groups", "landlocked", "geographic_regions_in_4_colors", "main_religion_2008", "gapminder_list", "alternative_1", "alternative_2", "alternative_3", "alternative_4_cdiac", "pandg", "god_id", "alt_5", "upper_case_name", "code", "number", "arb1", "arb2", "arb3", "arb4", "arb5", "arb6", "is--country", "world_4region", "latitude", "longitude", "description", "originId"];
    const expectedEntityProperiesValues = [
      2000, "alb", 1780000, 19286, 1800, "abw", 29311, 1900,
      "ukraine", "i237", "Ukraine", "europe_central_asia", "lower_middle_income", "coastline", "europe", "christian",
      "", "UKRAINE", "UA", "UKR", 804, true, 49, 32, "576949f1383edf7c1e1cf446",
      "usa", "i240", "United States", "america", "high_income", "United States of America",
      "USA", "U.S.A.", "United States Of America", "UNITED STATES",
      "US", "U.S.", 840, "americas", 39.76, -98.5, "576949f1383edf7c1e1cf44a"
    ];
    const expectedEntitiesRows = [
      [0, '10', 0, 1, 2, 3, 4, 5, 3, 6, 2, 7, 8, 9, 10, 11, 12, 13, 11, 8, 14, 15, 15, 15, 15, 15, 15, 16, 17, 18, 19, 2, 20, -1, -1, -1, -1],
      [0, '10', 0, 1, 2, 3, 4, 5, 3, 6, 2, 7, 8, 9, 10, 11, 12, 13, 11, 8, 14, 15, 15, 15, 15, 15, 15, 16, 17, 18, 19, 2, 20, -1, -1, -1, -1],
      [1, '10', 21, 22, 23, 24, 25, 5, 26, 6, 23, 15, 15, 15, 23, 27, 28, 15, 27, 29, 30, 15, 15, 15, 15, 15, 15, 16, 26, 31, 32, 23, 33, -1, -1, -1, -1],
      [2, '01', -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 34, 35, 36, -1],
      [3, '01', -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 37, 38, 36, -1],
      [4, '01', -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 39, 40, 41]
    ];

    const actualConcepts = _.pick(concepts, expectedConceptGids);
    const actualEntities = [
      {
        "_id": "57694a77383edf7c1e1d596a",
        "gid": "usa",
        "title": "United States",
        "properties": {
          "country": "usa",
          "gwid": "i240",
          "name": "United States",
          "geographic_regions": "america",
          "income_groups": "high_income",
          "landlocked": "coastline",
          "geographic_regions_in_4_colors": "america",
          "main_religion_2008": "christian",
          "gapminder_list": "United States",
          "alternative_1": "United States of America",
          "alternative_2": "USA",
          "alternative_3": "U.S.A.",
          "alternative_4_cdiac": "United States Of America",
          "pandg": "UNITED STATES",
          "god_id": "US",
          "alt_5": "U.S.",
          "upper_case_name": "UNITED STATES",
          "code": "USA",
          "number": 840,
          "arb1": "",
          "arb2": "",
          "arb3": "",
          "arb4": "",
          "arb5": "",
          "arb6": "",
          "is--country": true,
          "world_4region": "americas",
          "latitude": 39.76,
          "longitude": -98.5,
          "description": "United States",
          "originId": "576949f1383edf7c1e1cf44a"
        },
        "originId": "abcd",
        "domain": "576949f1383edf7c1e1cf42a",
        "from": 1466518116003,
        "dataset": "576949f1383edf7c1e1cf429",
        "transaction": "57694a64383edf7c1e1d5941",
        "__v": 0,
        "to": 9007199254740991,
        "drillups": ["576949f1383edf7c1e1cf45b", "576949f1383edf7c1e1cf45a", "576949f1383edf7c1e1cf455", "576949f1383edf7c1e1cf452", "576949f1383edf7c1e1cf468"],
        "sets": [],
        "sources": ["ddf--entities--geo--country.csv"]
      }, {
        "_id": "57694a77383edf7c1e1d596a",
        "gid": "usa",
        "title": "United States",
        "properties": {
          "country": "usa",
          "gwid": "i240",
          "name": "United States",
          "geographic_regions": "america",
          "income_groups": "high_income",
          "landlocked": "coastline",
          "geographic_regions_in_4_colors": "america",
          "main_religion_2008": "christian",
          "gapminder_list": "United States",
          "alternative_1": "United States of America",
          "alternative_2": "USA",
          "alternative_3": "U.S.A.",
          "alternative_4_cdiac": "United States Of America",
          "pandg": "UNITED STATES",
          "god_id": "US",
          "alt_5": "U.S.",
          "upper_case_name": "UNITED STATES",
          "code": "USA",
          "number": 840,
          "arb1": "",
          "arb2": "",
          "arb3": "",
          "arb4": "",
          "arb5": "",
          "arb6": "",
          "is--country": true,
          "world_4region": "americas",
          "latitude": 39.76,
          "longitude": -98.5,
          "description": "United States",
          "originId": "576949f1383edf7c1e1cf44a"
        },
        "originId": "576949f1383edf7c1e1cf44a",
        "domain": "576949f1383edf7c1e1cf42a",
        "from": 1466518116003,
        "dataset": "576949f1383edf7c1e1cf429",
        "transaction": "57694a64383edf7c1e1d5941",
        "__v": 0,
        "to": 9007199254740991,
        "drillups": ["576949f1383edf7c1e1cf45b", "576949f1383edf7c1e1cf45a", "576949f1383edf7c1e1cf455", "576949f1383edf7c1e1cf452", "576949f1383edf7c1e1cf468"],
        "sets": ["576949f1383edf7c1e1cf434"],
        "sources": ["ddf--entities--geo--country.csv"]
      }, {
        "_id": "57694a77383edf7c1e1d5968",
        "gid": "ukraine",
        "title": "Ukraine",
        "properties": {
          "country": "ukraine",
          "gwid": "i237",
          "name": "Ukraine",
          "geographic_regions": "europe_central_asia",
          "income_groups": "lower_middle_income",
          "landlocked": "coastline",
          "geographic_regions_in_4_colors": "europe",
          "main_religion_2008": "christian",
          "gapminder_list": "Ukraine",
          "alternative_1": "",
          "alternative_2": "",
          "alternative_3": "",
          "alternative_4_cdiac": "Ukraine",
          "pandg": "UKRAINE",
          "god_id": "UA",
          "alt_5": "",
          "upper_case_name": "UKRAINE",
          "code": "UKR",
          "number": 804,
          "arb1": "",
          "arb2": "",
          "arb3": "",
          "arb4": "",
          "arb5": "",
          "arb6": "",
          "is--country": true,
          "world_4region": "europe",
          "latitude": 49,
          "longitude": 32,
          "description": "Ukraine",
          "originId": "576949f1383edf7c1e1cf446"
        },
        "originId": "576949f1383edf7c1e1cf446",
        "domain": "576949f1383edf7c1e1cf42a",
        "from": 1466518116003,
        "dataset": "576949f1383edf7c1e1cf429",
        "transaction": "57694a64383edf7c1e1d5941",
        "__v": 0,
        "to": 9007199254740991,
        "drillups": ["576949f1383edf7c1e1cf460", "576949f1383edf7c1e1cf457", "576949f1383edf7c1e1cf453", "576949f1383edf7c1e1cf452", "576949f1383edf7c1e1cf467"],
        "sets": ["576949f1383edf7c1e1cf434"],
        "sources": ["ddf--entities--geo--country.csv"]
      }, {
        "_id": "576949fe383edf7c1e1d0a4c",
        "gid": "1900",
        "properties": {"sg_population": 29311, "year": 1900, "geo": "abw"},
        "domain": "576949f1383edf7c1e1cf42c",
        "from": 1466518000978,
        "dataset": "576949f1383edf7c1e1cf429",
        "transaction": "576949f0383edf7c1e1cf428",
        "to": 9007199254740991,
        "drillups": [null],
        "sets": [],
        "sources": ["ddf--datapoints--sg_population--by--geo--year.csv"],
        "__v": 0,
        "originId": "576949fe383edf7c1e1d0a4c"
      }, {
        "_id": "576949fe383edf7c1e1d0a42",
        "gid": "1800",
        "properties": {"sg_population": 19286, "year": 1800, "geo": "abw"},
        "domain": "576949f1383edf7c1e1cf42c",
        "from": 1466518000978,
        "dataset": "576949f1383edf7c1e1cf429",
        "transaction": "576949f0383edf7c1e1cf428",
        "to": 9007199254740991,
        "drillups": [null],
        "sets": [],
        "sources": ["ddf--datapoints--sg_population--by--geo--year.csv"],
        "__v": 0,
        "originId": "576949fe383edf7c1e1d0a42"
      }, {
        "_id": "576949f2383edf7c1e1cf488",
        "gid": "2000",
        "properties": {"year": 2000, "geo": "alb", "energy_use_total": 1780000},
        "domain": "576949f1383edf7c1e1cf42c",
        "from": 1466518000978,
        "dataset": "576949f1383edf7c1e1cf429",
        "transaction": "576949f0383edf7c1e1cf428",
        "to": 9007199254740991,
        "drillups": [null],
        "sets": [],
        "sources": ["ddf--datapoints--energy_use_total--by--geo--year.csv"],
        "__v": 0,
        "originId": "576949f2383edf7c1e1cf488"
      }];

    const input = {
      concepts: actualConcepts,
      entities: actualEntities,
      datapoints: {},
      headers: headers
    };

    pack(input, 'ddfJson', (err, json) => {
      // var jsonfile = require('jsonfile');
      // var file =
      //   '/home/korel/Projects/ws-vizabi/waffle-server/ws.routes/data-post-processors/fixtures/ddf-json-entities.json';
      // jsonfile.writeFileSync(file, json);

      assert.ok(_.isObject(json.entities));
      assert.ok(_.isObject(json.concepts));
      assert.ok(_.isNil(json.datapoints));

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

  it('should pack input datapoints data to ddfJson', (done) => {
    const headers = ['sg_population', 'energy_use_total'];
    const concepts = require('./../fixtures/concepts.json');
    const expectedConceptGids = ['geo', 'time', 'sg_population', 'energy_use_total'];
    const actualConcepts = _.pick(concepts, expectedConceptGids);

    const entities = require('./../fixtures/entities.json');
    const expectedEntityGids = ['2000', '1800', '1900', 'ukraine', 'usa'];
    const actualEntities = [
      {
      "_id": "57694a77383edf7c1e1d596a",
      "gid": "usa",
      "title": "United States",
      "properties": {
        "country": "usa",
        "gwid": "i240",
        "name": "United States",
        "geographic_regions": "america",
        "income_groups": "high_income",
        "landlocked": "coastline",
        "geographic_regions_in_4_colors": "america",
        "main_religion_2008": "christian",
        "gapminder_list": "United States",
        "alternative_1": "United States of America",
        "alternative_2": "USA",
        "alternative_3": "U.S.A.",
        "alternative_4_cdiac": "United States Of America",
        "pandg": "UNITED STATES",
        "god_id": "US",
        "alt_5": "U.S.",
        "upper_case_name": "UNITED STATES",
        "code": "USA",
        "number": 840,
        "arb1": "",
        "arb2": "",
        "arb3": "",
        "arb4": "",
        "arb5": "",
        "arb6": "",
        "is--country": true,
        "world_4region": "americas",
        "latitude": 39.76,
        "longitude": -98.5,
        "description": "United States",
        "originId": "576949f1383edf7c1e1cf44a"
      },
      "originId": "abcd",
      "domain": "576949f1383edf7c1e1cf42a",
      "from": 1466518116003,
      "dataset": "576949f1383edf7c1e1cf429",
      "transaction": "57694a64383edf7c1e1d5941",
      "__v": 0,
      "to": 9007199254740991,
      "drillups": ["576949f1383edf7c1e1cf45b", "576949f1383edf7c1e1cf45a", "576949f1383edf7c1e1cf455", "576949f1383edf7c1e1cf452", "576949f1383edf7c1e1cf468"],
      "sets": [],
      "sources": ["ddf--entities--geo--country.csv"]
    }, {
      "_id": "57694a77383edf7c1e1d596a",
      "gid": "usa",
      "title": "United States",
      "properties": {
        "country": "usa",
        "gwid": "i240",
        "name": "United States",
        "geographic_regions": "america",
        "income_groups": "high_income",
        "landlocked": "coastline",
        "geographic_regions_in_4_colors": "america",
        "main_religion_2008": "christian",
        "gapminder_list": "United States",
        "alternative_1": "United States of America",
        "alternative_2": "USA",
        "alternative_3": "U.S.A.",
        "alternative_4_cdiac": "United States Of America",
        "pandg": "UNITED STATES",
        "god_id": "US",
        "alt_5": "U.S.",
        "upper_case_name": "UNITED STATES",
        "code": "USA",
        "number": 840,
        "arb1": "",
        "arb2": "",
        "arb3": "",
        "arb4": "",
        "arb5": "",
        "arb6": "",
        "is--country": true,
        "world_4region": "americas",
        "latitude": 39.76,
        "longitude": -98.5,
        "description": "United States",
        "originId": "576949f1383edf7c1e1cf44a"
      },
      "originId": "576949f1383edf7c1e1cf44a",
      "domain": "576949f1383edf7c1e1cf42a",
      "from": 1466518116003,
      "dataset": "576949f1383edf7c1e1cf429",
      "transaction": "57694a64383edf7c1e1d5941",
      "__v": 0,
      "to": 9007199254740991,
      "drillups": ["576949f1383edf7c1e1cf45b", "576949f1383edf7c1e1cf45a", "576949f1383edf7c1e1cf455", "576949f1383edf7c1e1cf452", "576949f1383edf7c1e1cf468"],
      "sets": ["576949f1383edf7c1e1cf434"],
      "sources": ["ddf--entities--geo--country.csv"]
    }, {
      "_id": "57694a77383edf7c1e1d5968",
      "gid": "ukraine",
      "title": "Ukraine",
      "properties": {
        "country": "ukraine",
        "gwid": "i237",
        "name": "Ukraine",
        "geographic_regions": "europe_central_asia",
        "income_groups": "lower_middle_income",
        "landlocked": "coastline",
        "geographic_regions_in_4_colors": "europe",
        "main_religion_2008": "christian",
        "gapminder_list": "Ukraine",
        "alternative_1": "",
        "alternative_2": "",
        "alternative_3": "",
        "alternative_4_cdiac": "Ukraine",
        "pandg": "UKRAINE",
        "god_id": "UA",
        "alt_5": "",
        "upper_case_name": "UKRAINE",
        "code": "UKR",
        "number": 804,
        "arb1": "",
        "arb2": "",
        "arb3": "",
        "arb4": "",
        "arb5": "",
        "arb6": "",
        "is--country": true,
        "world_4region": "europe",
        "latitude": 49,
        "longitude": 32,
        "description": "Ukraine",
        "originId": "576949f1383edf7c1e1cf446"
      },
      "originId": "576949f1383edf7c1e1cf446",
      "domain": "576949f1383edf7c1e1cf42a",
      "from": 1466518116003,
      "dataset": "576949f1383edf7c1e1cf429",
      "transaction": "57694a64383edf7c1e1d5941",
      "__v": 0,
      "to": 9007199254740991,
      "drillups": ["576949f1383edf7c1e1cf460", "576949f1383edf7c1e1cf457", "576949f1383edf7c1e1cf453", "576949f1383edf7c1e1cf452", "576949f1383edf7c1e1cf467"],
      "sets": ["576949f1383edf7c1e1cf434"],
      "sources": ["ddf--entities--geo--country.csv"]
    }, {
      "_id": "576949fe383edf7c1e1d0a4c",
      "gid": "1900",
      "properties": {"sg_population": 29311, "year": 1900, "geo": "abw"},
      "domain": "576949f1383edf7c1e1cf42c",
      "from": 1466518000978,
      "dataset": "576949f1383edf7c1e1cf429",
      "transaction": "576949f0383edf7c1e1cf428",
      "to": 9007199254740991,
      "drillups": [null],
      "sets": [],
      "sources": ["ddf--datapoints--sg_population--by--geo--year.csv"],
      "__v": 0,
      "originId": "576949fe383edf7c1e1d0a4c"
    }, {
      "_id": "576949fe383edf7c1e1d0a42",
      "gid": "1800",
      "properties": {"sg_population": 19286, "year": 1800, "geo": "abw"},
      "domain": "576949f1383edf7c1e1cf42c",
      "from": 1466518000978,
      "dataset": "576949f1383edf7c1e1cf429",
      "transaction": "576949f0383edf7c1e1cf428",
      "to": 9007199254740991,
      "drillups": [null],
      "sets": [],
      "sources": ["ddf--datapoints--sg_population--by--geo--year.csv"],
      "__v": 0,
      "originId": "576949fe383edf7c1e1d0a42"
    }, {
      "_id": "576949f2383edf7c1e1cf488",
      "gid": "2000",
      "properties": {"year": 2000, "geo": "alb", "energy_use_total": 1780000},
      "domain": "576949f1383edf7c1e1cf42c",
      "from": 1466518000978,
      "dataset": "576949f1383edf7c1e1cf429",
      "transaction": "576949f0383edf7c1e1cf428",
      "to": 9007199254740991,
      "drillups": [null],
      "sets": [],
      "sources": ["ddf--datapoints--energy_use_total--by--geo--year.csv"],
      "__v": 0,
      "originId": "576949f2383edf7c1e1cf488"
    }];
    const actualEntitiesByOriginId = _.keyBy(actualEntities, 'originId');

    const datapoints = require('./../fixtures/datapoints.json');
    const areEntitiesExist = (dimensions) => {
      return _.every(dimensions, _.partial(_.includes, expectedEntityGids));
    };
    const actualDatapoints = _.filter(datapoints, (datapoint) => {
      const dimensionsByGids = _.map(datapoint.dimensions, (entityOriginId) => {
        return actualEntitiesByOriginId[entityOriginId] ? actualEntitiesByOriginId[entityOriginId][constants.GID] : '';
      });

      return areEntitiesExist(dimensionsByGids);
    });
    const expectedValues = [2273000000, 6801854, 77415610, 282895741, 133800000, 11215490, 23471939, 48746269];
    const expectedIndicators = [2, 3];
    const expectedDimensions = [0, 1];
    const expectedDatapointsRows = [
      ['001101', 3, 0],
      ['001100', 1, -1],
      ['001011', 2, -1],
      ['010101', 7, 4],
      ['010100', 5, -1],
      ['010011', 6, -1]
    ];

    const input = {
      concepts: actualConcepts,
      entities: actualEntities,
      datapoints: actualDatapoints,
      headers: headers
    };

    pack(input, 'ddfJson', (err, json) => {
      assert.ok(_.isObject(json.entities));
      assert.ok(_.isObject(json.concepts));
      assert.ok(_.isObject(json.datapoints));
      assert.ok(!_.isEmpty(json.entities));
      assert.ok(!_.isEmpty(json.concepts));
      assert.ok(json.concepts.rows.length === expectedConceptGids.length);
      assert.ok(json.entities.rows.length === expectedEntityGids.length + 1);

      assert.deepEqual(json.concepts.values.sort(), expectedConceptGids.sort());
      assert.deepEqual(json.entities.values.sort(), expectedEntityGids.sort());

      assert.deepEqual(json.datapoints.values.sort(), expectedValues.sort());
      assert.deepEqual(json.datapoints.indicators.sort(), expectedIndicators.sort());
      assert.deepEqual(json.datapoints.dimensions.sort(), expectedDimensions.sort());
      assert.deepEqual(json.datapoints.rows, expectedDatapointsRows);

      done();
    });
  });
});
