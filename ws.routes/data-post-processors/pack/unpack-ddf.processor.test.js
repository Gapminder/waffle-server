'use strict';

const _ = require('lodash');
const chai = require('chai');
const unpackProcessor = require('./unpack-ddf.processor');

const expect = chai.expect;

it('should ddfJson concept data into json format', () => {
  const packedJson = require('./../fixtures/ddf-json-concepts.json');
  const expectedHeaders = ["description_long","concept","name","concept_type","domain","indicator_url","scales","drill_up","unit","interpolation","description"];
  const expectedRows = [
    {
      "description_long": "",
      "concept": "energy_use_total",
      "name": "Energy use",
      "concept_type": "measure",
      "domain": null,
      "indicator_url": "https://docs.google.com/spreadsheet/pub?key=0AkBd6lyS3EmpdHd2Nld0NEVFOGRiSTc0V3ZoekNuS1E",
      "scales": "[\"linear\",\"log\"]",
      "drill_up": null,
      "unit": "tons in oil eqv",
      "interpolation": null,
      "description": "Energy use refers to use of primary energy before transformation to other end-use fuels, which is equal to indigenous production plus imports and stock changes, minus exports and fuels supplied to ships and aircraft engaged in international transport, counted in tonnes of oil equivalent (toe)."
    }, {
      "description_long": "geo long",
      "concept": "geo",
      "name": "Geographic location",
      "concept_type": "entity_domain",
      "domain": null,
      "indicator_url": "https://github.com/open-numbers/ddf--gapminder--dim_geo_countries_and_groups/blob/master/ddf--list--geo--country.csv",
      "scales": "[\"ordinal\"]",
      "drill_up": null,
      "unit": null,
      "interpolation": null,
      "description": null
    }, {
      "description_long": "",
      "description": "",
      "interpolation": "",
      "unit": "",
      "drill_up": null,
      "scales": null,
      "indicator_url": "",
      "domain": "",
      "concept_type": "string",
      "name": "new concept",
      "concept": "new_concept"
    }, {
      "description_long": "",
      "concept": "sg_population",
      "name": "sg_population",
      "concept_type": "measure",
      "domain": null,
      "indicator_url": "http://www.gapminder.org/news/data-sources-dont-panic-end-poverty",
      "scales": "[\"linear\",\"log\"]",
      "drill_up": null,
      "unit": null,
      "interpolation": null,
      "description": null
    }, {
      "description_long": "",
      "concept": "time",
      "name": "Time",
      "concept_type": "entity_domain",
      "domain": null,
      "indicator_url": null,
      "scales": "[\"time\"]",
      "drill_up": null,
      "unit": null,
      "interpolation": null,
      "description": null
    }];

  unpackProcessor.unpackDdfConcepts(packedJson, (err, unpackedJson) => {
    const actualHeaders = _.chain(unpackedJson).flatMap((concept) => _.keys(concept)).uniq().value();

    expect(_.isArray(unpackedJson)).to.equal(true);
    expect(actualHeaders.sort()).to.deep.equal(expectedHeaders.sort());
    expect(_.sortBy(unpackedJson, 'concept')).to.deep.equal(expectedRows);
  });
});

it('should unpack ddfJson entities data into json format', () => {
  const packedJson = require('./../fixtures/ddf-json-entities.json');
  const expectedHeaders = [
    "country", "gwid", "name", "geographic_regions", "income_groups", "landlocked", "geographic_regions_in_4_colors",
    "main_religion_2008", "gapminder_list", "alternative_1", "alternative_2", "alternative_3", "alternative_4_cdiac",
    "pandg", "god_id", "alt_5", "upper_case_name", "code", "number", "arb1", "arb2", "arb3", "arb4", "arb5", "arb6",
    "is--country", "world_4region", "latitude", "longitude", "description", "originId", "sg_population", "year",
    "geo", "energy_use_total"
  ];
  const expectedRows = [
    { country: 'ukraine',
      gwid: 'i237',
      name: 'Ukraine',
      geographic_regions: 'europe_central_asia',
      income_groups: 'lower_middle_income',
      landlocked: 'coastline',
      geographic_regions_in_4_colors: 'europe',
      main_religion_2008: 'christian',
      gapminder_list: 'Ukraine',
      alternative_1: '',
      alternative_2: '',
      alternative_3: '',
      alternative_4_cdiac: 'Ukraine',
      pandg: 'UKRAINE',
      god_id: 'UA',
      alt_5: '',
      upper_case_name: 'UKRAINE',
      code: 'UKR',
      number: 804,
      arb1: '',
      arb2: '',
      arb3: '',
      arb4: '',
      arb5: '',
      arb6: '',
      'is--country': true,
      world_4region: 'europe',
      latitude: 49,
      longitude: 32,
      description: 'Ukraine',
      originId: '576949f1383edf7c1e1cf446',
      sg_population: null,
      year: null,
      geo: null,
      energy_use_total: null },
    { country: 'usa',
      gwid: 'i240',
      name: 'United States',
      geographic_regions: 'america',
      income_groups: 'high_income',
      landlocked: 'coastline',
      geographic_regions_in_4_colors: 'america',
      main_religion_2008: 'christian',
      gapminder_list: 'United States',
      alternative_1: 'United States of America',
      alternative_2: 'USA',
      alternative_3: 'U.S.A.',
      alternative_4_cdiac: 'United States Of America',
      pandg: 'UNITED STATES',
      god_id: 'US',
      alt_5: 'U.S.',
      upper_case_name: 'UNITED STATES',
      code: 'USA',
      number: 840,
      arb1: '',
      arb2: '',
      arb3: '',
      arb4: '',
      arb5: '',
      arb6: '',
      'is--country': true,
      world_4region: 'americas',
      latitude: 39.76,
      longitude: -98.5,
      description: 'United States',
      originId: '576949f1383edf7c1e1cf44a',
      sg_population: null,
      year: null,
      geo: null,
      energy_use_total: null },
    { country: 'usa',
      gwid: 'i240',
      name: 'United States',
      geographic_regions: 'america',
      income_groups: 'high_income',
      landlocked: 'coastline',
      geographic_regions_in_4_colors: 'america',
      main_religion_2008: 'christian',
      gapminder_list: 'United States',
      alternative_1: 'United States of America',
      alternative_2: 'USA',
      alternative_3: 'U.S.A.',
      alternative_4_cdiac: 'United States Of America',
      pandg: 'UNITED STATES',
      god_id: 'US',
      alt_5: 'U.S.',
      upper_case_name: 'UNITED STATES',
      code: 'USA',
      number: 840,
      arb1: '',
      arb2: '',
      arb3: '',
      arb4: '',
      arb5: '',
      arb6: '',
      'is--country': true,
      world_4region: 'americas',
      latitude: 39.76,
      longitude: -98.5,
      description: 'United States',
      originId: '576949f1383edf7c1e1cf44a',
      sg_population: null,
      year: null,
      geo: null,
      energy_use_total: null },
    { country: null,
      gwid: null,
      name: null,
      geographic_regions: null,
      income_groups: null,
      landlocked: null,
      geographic_regions_in_4_colors: null,
      main_religion_2008: null,
      gapminder_list: null,
      alternative_1: null,
      alternative_2: null,
      alternative_3: null,
      alternative_4_cdiac: null,
      pandg: null,
      god_id: null,
      alt_5: null,
      upper_case_name: null,
      code: null,
      number: null,
      arb1: null,
      arb2: null,
      arb3: null,
      arb4: null,
      arb5: null,
      arb6: null,
      'is--country': null,
      world_4region: null,
      latitude: null,
      longitude: null,
      description: null,
      originId: null,
      sg_population: 19286,
      year: 1800,
      geo: 'abw',
      energy_use_total: null },
    { country: null,
      gwid: null,
      name: null,
      geographic_regions: null,
      income_groups: null,
      landlocked: null,
      geographic_regions_in_4_colors: null,
      main_religion_2008: null,
      gapminder_list: null,
      alternative_1: null,
      alternative_2: null,
      alternative_3: null,
      alternative_4_cdiac: null,
      pandg: null,
      god_id: null,
      alt_5: null,
      upper_case_name: null,
      code: null,
      number: null,
      arb1: null,
      arb2: null,
      arb3: null,
      arb4: null,
      arb5: null,
      arb6: null,
      'is--country': null,
      world_4region: null,
      latitude: null,
      longitude: null,
      description: null,
      originId: null,
      sg_population: 29311,
      year: 1900,
      geo: 'abw',
      energy_use_total: null },
    { country: null,
      gwid: null,
      name: null,
      geographic_regions: null,
      income_groups: null,
      landlocked: null,
      geographic_regions_in_4_colors: null,
      main_religion_2008: null,
      gapminder_list: null,
      alternative_1: null,
      alternative_2: null,
      alternative_3: null,
      alternative_4_cdiac: null,
      pandg: null,
      god_id: null,
      alt_5: null,
      upper_case_name: null,
      code: null,
      number: null,
      arb1: null,
      arb2: null,
      arb3: null,
      arb4: null,
      arb5: null,
      arb6: null,
      'is--country': null,
      world_4region: null,
      latitude: null,
      longitude: null,
      description: null,
      originId: null,
      sg_population: null,
      year: 2000,
      geo: 'alb',
      energy_use_total: 1780000 } ];

  unpackProcessor.unpackDdfEntities(packedJson, (err, unpackedJson) => {
    const actualHeaders = _.chain(unpackedJson).flatMap((entity) => _.keys(entity)).uniq().value();

    expect(_.isArray(unpackedJson)).to.equal(true);
    expect(actualHeaders.sort()).to.deep.equal(expectedHeaders.sort());
    expect(_.sortBy(unpackedJson, ['name', 'year'])).to.deep.equal(expectedRows);
  });
});

it('should unpack ddfJson datapoints data into json format', () => {
  const packedJson = require('./../fixtures/ddf-json-datapoints.json');
  const expectedHeaders = ["energy_use_total","geo","sg_population","time"];
  const expectedRows = [
    {geo: 'usa', time: "2000", sg_population: "282895741", energy_use_total: "2273000000"},
    {geo: 'usa', time: "1800", sg_population: "6801854", energy_use_total: null},
    {geo: 'usa', time: "1900", sg_population: "77415610", energy_use_total: null},
    {geo: 'ukraine', time: "2000", sg_population: "48746269", energy_use_total: "133800000"},
    {geo: 'ukraine', time: "1800", sg_population: "11215490", energy_use_total: null},
    {geo: 'ukraine', time: "1900", sg_population: "23471939", energy_use_total: null}
  ];

  unpackProcessor.unpackDdfDatapoints(packedJson, (err, unpackedJson) => {
    const actualHeaders = _.chain(unpackedJson).flatMap((entity) => _.keys(entity)).uniq().value();

    expect(_.isArray(unpackedJson)).to.equal(true);
    expect(actualHeaders.sort()).to.deep.equal(expectedHeaders.sort());
    expect(unpackedJson).to.deep.equal(expectedRows);
  });
});

