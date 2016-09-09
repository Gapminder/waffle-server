import _ from 'lodash';
import pack from './pack.processor.js';
import test from 'ava';
import constants from '../../../ws.utils/constants';

// var jsonfile = require('jsonfile');
// var file = '/home/korel/Projects/ws-vizabi/waffle-server/ws.routes/data-post-processors/fixtures/entities.json';
// jsonfile.writeFileSync(file, pipe.entities);
// file = '/home/korel/Projects/ws-vizabi/waffle-server/ws.routes/data-post-processors/fixtures/concepts.json';
// jsonfile.writeFileSync(file, pipe.concepts);
// file = '/home/korel/Projects/ws-vizabi/waffle-server/ws.routes/data-post-processors/fixtures/datapoints.json';
// jsonfile.writeFileSync(file, pipe.datapoints);

test.skip.cb('should pack input concepts data to ddfJson', assert => {
  const headers = ['sg_population', 'energy_use_total'];

  const concepts = require('./../fixtures/concepts.json');
  const expectedConceptGids = ['energy_use_total', 'geo', 'new_concept', 'sg_population', 'time'];
  const expectedConceptProperties = ["concept", "concept_type", "description", "description_long", "domain", "drill_up", "indicator_url", "interpolation", "name", "scales", "unit"];
  const expectedConceptPropertyValues = [
    '',
    'Energy use',
    'Energy use refers to use of primary energy before transformation to other end-use fuels, which is equal to indigenous production plus imports and stock changes, minus exports and fuels supplied to ships and aircraft engaged in international transport, counted in tonnes of oil equivalent (toe).',
    'Geographic location',
    'Time',
    '["linear","log"]',
    '["ordinal"]',
    '["time"]',
    'energy_use_total',
    'entity_domain',
    'geo',
    'geo long',
    'http://www.gapminder.org/news/data-sources-dont-panic-end-poverty',
    'https://docs.google.com/spreadsheet/pub?key=0AkBd6lyS3EmpdHd2Nld0NEVFOGRiSTc0V3ZoekNuS1E',
    'https://github.com/open-numbers/ddf--gapminder--dim_geo_countries_and_groups/blob/master/ddf--list--geo--country.csv',
    'measure',
    'new concept',
    'new_concept',
    null,
    'sg_population',
    'string',
    'time',
    'tons in oil eqv'
  ];

  const expectedConceptRows = [
    [8,  15, 2,  0,  18, 18, 13, 18, 1,  5,  22],
    [10, 9,  18, 11, 18, 18, 14, 18, 3,  6,  18],
    [17, 20, 0,  0,  0,  18, 0,  0,  16, 18, 0],
    [19, 15, 18, 0,  18, 18, 12, 18, 19, 5,  18],
    [21, 9,  18, 0,  18, 18, 18, 18, 4,  7,  18]
  ];

  const actualConcepts = _.filter(concepts, (concept) => _.includes(expectedConceptGids, concept[constants.GID]));
  const input = {
    concepts: actualConcepts,
    entities: {},
    datapoints: {},
    headers: headers
  };

  pack(input, 'ddfJson', (err, json) => {
    // var jsonfile = require('jsonfile');
    // var file =
    //   '/home/korel/Projects/ws-vizabi/waffle-server/ws.routes/data-post-processors/fixtures/ddf-json-concepts.json';
    // jsonfile.writeFileSync(file, json);

    assert.true(_.isObject(json.concepts));
    assert.true(_.isNil(json.entities));
    assert.true(_.isNil(json.datapoints));

    assert.deepEqual(json.concepts.values, expectedConceptGids);
    assert.deepEqual(json.concepts.properties, expectedConceptProperties);
    assert.deepEqual(json.concepts.propertyValues, expectedConceptPropertyValues);
    assert.deepEqual(json.concepts.rows, expectedConceptRows);

    assert.end();
  });
});

// FIXME: not work
test.skip.cb('should pack input entities data with domain geo to ddfJson', assert => {
  const concepts = require('./../fixtures/concepts.json');
  const expectedConceptGids = ['geo'];
  const expectedConceptProperties = ["concept", "concept_type", "description", "description_long", "domain", "drill_up", "indicator_url", "interpolation", "name", "scales", "unit"];

  const expectedConceptPropertyValues = ["", "Geographic location", "Time", "Value", "[\"ordinal\"]", "[\"time\"]", "entity_domain", "geo", "geo long", "https://github.com/open-numbers/ddf--gapminder--dim_geo_countries_and_groups/blob/master/ddf--list--geo--country.csv", "lng_value", null, "string", "time"];
  const expectedConceptRows = [
    [7,  6,  11, 8, 11, 11, 9,  11, 1, 4,  11]
  ];

  const entities = require('./../fixtures/entities.json');
  const expectedEntityGids = ['2000', '1800', '1900', 'ukraine', 'usa'];
  const expectedEntityProperties = ["year", "geo", "energy_use_total", "sg_population", "country", "gwid", "name", "geographic_regions", "income_groups", "landlocked", "geographic_regions_in_4_colors", "main_religion_2008", "gapminder_list", "alternative_1", "alternative_2", "alternative_3", "alternative_4_cdiac", "pandg", "god_id", "alt_5", "upper_case_name", "code", "number", "arb1", "arb2", "arb3", "arb4", "arb5", "arb6", "is--country", "world_4region", "latitude", "longitude", "description", "originId"];
  const expectedEntityProperiesValues = [
    "2000", "1900", "1800", 2000, "alb", 1780000, 19286, 1800, "abw", 29311, 1900,
    "ukraine", "i237", "Ukraine", "europe_central_asia", "lower_middle_income", "coastline", "europe", "christian",
    "", "UKRAINE", "UA", "UKR", 804, true, 49, 32, "576949f1383edf7c1e1cf446",
    "usa", "i240", "United States", "america", "high_income", "United States of America",
    "USA", "U.S.A.", "United States Of America", "UNITED STATES",
    "US", "U.S.", 840, "americas", 39.76, -98.5, "576949f1383edf7c1e1cf44a"
  ];
  const expectedEntitiesRows = [
    [0, '10', -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 3, 6, 2, 7, 8, 9, 10, 11, 12, 13, 11, 8, 14, 15, 15, 15, 15, 15, 15, 16, 17, 18, 19, 2, 20],
    [0, '10', -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 3, 6, 2, 7, 8, 9, 10, 11, 12, 13, 11, 8, 14, 15, 15, 15, 15, 15, 15, 16, 17, 18, 19, 2, 20],
    [1, '10', -1, -1, -1, -1, 21, 22, 23, 24, 25, 5, 26, 6, 23, 15, 15, 15, 23, 27, 28, 15, 27, 29, 30, 15, 15, 15, 15, 15, 15, 16, 26, 31, 32, 23, 33],
    [2, '01', 34, 35, 36, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [3, '01', 37, 38, 36, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [4, '01', 41, 39, 40, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
  ];

  const headers = expectedEntityProperties;

  const actualConcepts = _.filter(concepts, (concept) => _.includes(expectedConceptGids, concept[constants.GID]));
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
    headers: headers,
    domainGid: 'geo'
  };

  pack(input, 'ddfJson', (err, json) => {
    // var jsonfile = require('jsonfile');
    // var file =
    //   '/home/korel/Projects/ws-vizabi/waffle-server/ws.routes/data-post-processors/fixtures/ddf-json-entities.json';
    // jsonfile.writeFileSync(file, json);

    assert.true(_.isObject(json.entities));
    assert.true(_.isObject(json.concepts));
    assert.true(_.isNil(json.datapoints));

    assert.deepEqual(json.concepts.values.sort(), expectedConceptGids.sort());
    assert.deepEqual(json.concepts.properties.sort(), expectedConceptProperties.sort());
    assert.deepEqual(json.concepts.propertyValues.sort(), expectedConceptPropertyValues.sort());
    assert.deepEqual(json.concepts.rows, expectedConceptRows);

    assert.deepEqual(json.entities.values.sort(), expectedEntityGids.sort());
    assert.deepEqual(json.entities.properties.sort(), expectedEntityProperties.sort());
    assert.deepEqual(json.entities.propertyValues.sort(), expectedEntityProperiesValues.sort());
    assert.deepEqual(json.entities.rows, expectedEntitiesRows);

    assert.end();
  });
});

test.skip.cb('should pack input entities data with domain time to ddfJson', assert => {
  const concepts = require('./../fixtures/concepts.json');
  const expectedConceptGids = ['geo', 'lng_value', 'time'];
  const expectedConceptProperties = ["concept", "concept_type", "description", "description_long", "domain", "drill_up", "indicator_url", "interpolation", "name", "scales", "unit"];

  const expectedConceptPropertyValues = ["", "Geographic location", "Time", "Value", "[\"ordinal\"]", "[\"time\"]", "entity_domain", "geo", "geo long", "https://github.com/open-numbers/ddf--gapminder--dim_geo_countries_and_groups/blob/master/ddf--list--geo--country.csv", "lng_value", null, "string", "time"];
  const expectedConceptRows = [
    [7,  6,  11, 8, 11, 11, 9,  11, 1, 4,  11],
    [10, 12, 11, 0, 11, 11, 11, 11, 3, 11, 11],
    [13, 6,  11, 0, 11, 11, 11, 11, 2, 5,  11]
  ];

  const entities = require('./../fixtures/entities.json');
  const expectedEntityGids = ['2000', '1800', '1900', 'ukraine', 'usa'];
  const expectedEntityProperties = ["year", "geo", "energy_use_total", "sg_population", "country", "gwid", "name", "geographic_regions", "income_groups", "landlocked", "geographic_regions_in_4_colors", "main_religion_2008", "gapminder_list", "alternative_1", "alternative_2", "alternative_3", "alternative_4_cdiac", "pandg", "god_id", "alt_5", "upper_case_name", "code", "number", "arb1", "arb2", "arb3", "arb4", "arb5", "arb6", "is--country", "world_4region", "latitude", "longitude", "description", "originId"];
  const expectedEntityProperiesValues = [
    "2000", "1900", "1800", 2000, "alb", 1780000, 19286, 1800, "abw", 29311, 1900,
    "ukraine", "i237", "Ukraine", "europe_central_asia", "lower_middle_income", "coastline", "europe", "christian",
    "", "UKRAINE", "UA", "UKR", 804, true, 49, 32, "576949f1383edf7c1e1cf446",
    "usa", "i240", "United States", "america", "high_income", "United States of America",
    "USA", "U.S.A.", "United States Of America", "UNITED STATES",
    "US", "U.S.", 840, "americas", 39.76, -98.5, "576949f1383edf7c1e1cf44a"
  ];
  const expectedEntitiesRows = [
    [0, '10', -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 3, 6, 2, 7, 8, 9, 10, 11, 12, 13, 11, 8, 14, 15, 15, 15, 15, 15, 15, 16, 17, 18, 19, 2, 20],
    [0, '10', -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 3, 6, 2, 7, 8, 9, 10, 11, 12, 13, 11, 8, 14, 15, 15, 15, 15, 15, 15, 16, 17, 18, 19, 2, 20],
    [1, '10', -1, -1, -1, -1, 21, 22, 23, 24, 25, 5, 26, 6, 23, 15, 15, 15, 23, 27, 28, 15, 27, 29, 30, 15, 15, 15, 15, 15, 15, 16, 26, 31, 32, 23, 33],
    [2, '01', 34, 35, 36, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [3, '01', 37, 38, 36, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [4, '01', 41, 39, 40, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
  ];

  const headers = expectedEntityProperties;

  const actualConcepts = _.filter(concepts, (concept) => _.includes(expectedConceptGids, concept[constants.GID]));
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
    headers: headers,
    domainGid: 'geo'
  };

  pack(input, 'ddfJson', (err, json) => {
    // var jsonfile = require('jsonfile');
    // var file =
    //   '/home/korel/Projects/ws-vizabi/waffle-server/ws.routes/data-post-processors/fixtures/ddf-json-entities.json';
    // jsonfile.writeFileSync(file, json);

    assert.true(_.isObject(json.entities));
    assert.true(_.isObject(json.concepts));
    assert.true(_.isNil(json.datapoints));

    assert.deepEqual(json.concepts.values.sort(), expectedConceptGids.sort());
    assert.deepEqual(json.concepts.properties.sort(), expectedConceptProperties.sort());
    assert.deepEqual(json.concepts.propertyValues.sort(), expectedConceptPropertyValues.sort());
    assert.deepEqual(json.concepts.rows, expectedConceptRows);

    assert.deepEqual(json.entities.values.sort(), expectedEntityGids.sort());
    assert.deepEqual(json.entities.properties.sort(), expectedEntityProperties.sort());
    assert.deepEqual(json.entities.propertyValues.sort(), expectedEntityProperiesValues.sort());
    assert.deepEqual(json.entities.rows, expectedEntitiesRows);

    assert.end();
  });
});

test.skip.cb('should pack input datapoints data to ddfJson', assert => {
  const headers = ['sg_population', 'energy_use_total'];
  const concepts = require('./../fixtures/concepts.json');
  const expectedConceptGids = ['energy_use_total', 'geo', 'sg_population', 'time'];
  const actualConcepts = _.filter(concepts, (concept) => _.includes(expectedConceptGids, concept[constants.GID]));

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
  const expectedValues = ['2273000000', '6801854', '77415610', '282895741', '133800000', '11215490', '23471939', '48746269'];
  const expectedIndicators = ['0', '2'];
  const expectedDimensions = ['1', '3'];
  const expectedDatapointsRows = [
    ['001101', 0,  3],
    ['001100', -1, 1],
    ['001011', -1, 2],
    ['010101', 4,  7],
    ['010100', -1, 5],
    ['010011', -1, 6]
  ];

  const input = {
    concepts: actualConcepts,
    entities: actualEntities,
    datapoints: actualDatapoints,
    headers: headers
  };

  pack(input, 'ddfJson', (err, json) => {
    assert.true(_.isObject(json.entities));
    assert.true(_.isObject(json.concepts));
    assert.true(_.isObject(json.datapoints));
    assert.true(!_.isEmpty(json.entities));
    assert.true(!_.isEmpty(json.concepts));
    assert.true(json.concepts.rows.length === expectedConceptGids.length);
    assert.true(json.entities.rows.length === expectedEntityGids.length + 1);

    assert.deepEqual(json.concepts.values.sort(), expectedConceptGids.sort());
    assert.deepEqual(json.entities.values.sort(), expectedEntityGids.sort());

    assert.deepEqual(json.datapoints.values.sort(), expectedValues.sort());
    assert.deepEqual(json.datapoints.indicators.sort(), expectedIndicators.sort());
    assert.deepEqual(json.datapoints.dimensions.sort(), expectedDimensions.sort());
    assert.deepEqual(json.datapoints.rows, expectedDatapointsRows);

    assert.end();
  });
});
