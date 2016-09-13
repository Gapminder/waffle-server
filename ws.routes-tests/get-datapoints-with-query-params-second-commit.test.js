'use strict';

import test from 'ava';
import getDatapointsJson from './ws_ddf_test_fixtures_second_commit/datapoints-for-get-with-query-params-json.json';

const _ = require('lodash');
const shell = require('shelljs');
const express = require('express');
const git = require('simple-git');
const api = require('supertest')('http://localhost:3000');


function setDefaultFirstCommitByCLI(onSetDefaultByFirstCommitCLIDone) {
  const setDefaultcommand = `REPO=git@github.com:VS-work/ddf--gapminder--systema_globalis--light.git COMMIT=dc655e1 LOGIN=dev@gapminder.org PASS=123 npm run set-default`;
  shell.cd('../../waffle-server-import-cli');
  return shell.exec(setDefaultcommand, (error) => {
    console.log('** chose default set');

    return onSetDefaultByFirstCommitCLIDone(error);

  })
}

test.cb.before(t => {
  console.log('Set default first commit');

  return setDefaultFirstCommitByCLI(t.end);
});

test.cb('Check GET request: for datapoints with select=sg_population&key=geo,time, format=json when default dataset was set', t => {
  t.plan(1);
  api.get('/api/ddf/datapoints?format=json&select=sg_population&key=geo,time')
    .set('Accept', 'application/x-json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body.length, 20049);

      t.end();
    })
});

test.cb('Check GET request: for datapoints with select=sg_population&key=geo,time, format=wsJson when default dataset was set', t => {
  const headers = ['geo', 'time', 'sg_population'];

  api.get('/api/ddf/datapoints?format=wsJson&select=sg_population&key=geo,time')
    .set('Accept', 'application/x-ws+json')
    .expect(200)
    .end((err, res) => {
      let datapoints = res.body.rows;

      t.deepEqual(res.body.headers, headers);
      t.deepEqual(res.body.rows.length, 20049);
      datapoints.forEach(function (row) {
        for (let i = 0; i < row.length; i++) {
          t.true(typeof(row[0]) === 'string');
          t.true(typeof(row[1]) === 'number');
          t.true(typeof(row[2]) === 'number');
        }
      });

      t.end();
    })
});

test.cb('Check GET request: for datapoints with select=sg_population&key=geo,time, format=ddfJson when default dataset was set', t => {
  const conceptsValues = [
    "code",
    "color",
    "country",
    "description",
    "domain",
    "drill_up",
    "epidemic_affected_annual_number",
    "forest_products_removal_total_dollar",
    "gapminder_list",
    "geo",
    "geographic_regions",
    "global",
    "god_id",
    "gwid",
    "hourly_compensation_us",
    "income_per_person_gdppercapita_ppp_inflation_adjusted",
    "indicator_url",
    "landlocked",
    "latitude",
    "life_expectancy_years",
    "longitude",
    "main_religion_2008",
    "name",
    "name_long",
    "name_short",
    "number",
    "parent",
    "population_total",
    "scales",
    "sg_gdp_p_cap_const_ppp2011_dollar",
    "sg_gini",
    "sg_population",
    "shape_lores_svg",
    "tag",
    "tags",
    "time",
    "unit",
    "world_4region"
  ];

  let conceptsProperties = [
    "color",
    "concept",
    "concept_type",
    "description",
    "domain",
    "drill_up",
    "indicator_url",
    "name",
    "scales",
    "unit"
  ];

  let entitiesProperties = [
    "code",
    "color",
    "country",
    "description",
    "epidemic_affected_annual_number",
    "gapminder_list",
    "geo",
    "geographic_regions",
    "god_id",
    "gwid",
    "income_per_person_gdppercapita_ppp_inflation_adjusted",
    "is--country",
    "is--geographic_regions",
    "is--global",
    "is--landlocked",
    "is--main_religion_2008",
    "is--world_4region",
    "landlocked",
    "latitude",
    "longitude",
    "main_religion_2008",
    "name",
    "name_long",
    "name_short",
    "number",
    "originId",
    "population_total",
    "shape_lores_svg",
    "time",
    "undefined",
    "world_4region"
  ];

  let entitiesConcepts = [
    "2",
    "9",
    "10",
    "11",
    "17",
    "21",
    "33",
    "35",
    "37"
  ];



  api.get('/api/ddf/datapoints?format=ddfJson&select=sg_population&key=geo,time')
    .set('Accept', 'application/x-ddf+json')
    .expect(200)
    .end((err, res) => {
      t.deepEqual(res.body.concepts.values, conceptsValues);
      t.deepEqual(res.body.concepts.properties, conceptsProperties);
      t.deepEqual(res.body.concepts.propertyValues.length, 117);
      t.deepEqual(res.body.entities.properties, entitiesProperties);
      t.deepEqual(res.body.entities.concepts, entitiesConcepts);
      t.deepEqual(res.body.entities.values.length, 792);


      t.end();
    })
});
