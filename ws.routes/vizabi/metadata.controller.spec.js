'use strict';
const mongoose = require('mongoose');
require('../../ws.repository/metadata.model');

let metaController = require('./metadata.controller');

const sinon = require('sinon');
const assert = require('assert');
const _ = require('lodash');


describe('Metadata controller', () => {
  context('when comes empty select in query', () => {
    it('should return empty data', () => {
      let select = {};
      let expectedQuery = {};
      let dataDb = [];
      let expectedProjection = {_id: 0, __v: 0};
      let expectedWsJson = {
        success: true,
        error: null,
        data: dataDb
      };

      checkResult(expectedQuery, expectedProjection, expectedWsJson, dataDb, select)

    });
  });


  context('when comes select with only one value geo in query', () => {
    it('should return all geo data', () => {
      let select = ['geo'];
      let dataDb = [{
        "gid": "geo",
        "type": "dimension",
        "name": "Geography",
        "nameShort": "Geo",
        "description": "Geographical & political divisions of the world.",
        "totalEntity": "",
        "totalName": "",
        "defaultEntities": [
          "world",
          "asia",
          "europe",
          "africa",
          "america"
        ],
        "drilldowns": "",
        "drillups": "",
        "ddfInheritance": "[{dataset:'ddf--gapminder--dim_geo_countries_and_groups', timestamp:'1/10/2016 8:43:49 PM +00:00',note:''}]",
        "ddf_origin": []
      }];
      let expectedQuery = {gid: {'$in': ['geo']}};
      let expectedProjection = {_id: 0, __v: 0};
      let expectedWsJson = {
        success: true,
        error: null,
        data: {geo: dataDb[0]}
      };
      checkResult(expectedQuery, expectedProjection, expectedWsJson, dataDb, select)
    });
  });

  context('when comes select with only one value geo.name in query', () => {
    it('should return geo.name', () => {
      let select = ['geo.name'];
      let dataDb = [{
        gid: 'geo',
        "name": "Geography"
      }];
      let expectedQuery = {gid: {'$in': ['geo']}};
      let expectedProjection = {_id: 0, __v: 0};
      let expectedWsJson = {
        success: true,
        error: null,
        data: {geo: {name: dataDb[0].name}}
      };
      checkResult(expectedQuery, expectedProjection, expectedWsJson, dataDb, select)
    });
  });


  context('when comes select with value: population, geo.name, year.name - in query', () => {
    it('should return population, geo.name, year.name data', () => {
      let select = ['population', 'geo.name', 'year.name'];
      let dataDb = [
        {
          "gid": "population",
          "title": "Population",
          "name": "Population",
          "nameShort": "Population",
          "description": "Population counts include all inhabitants or citizesn of a territory. The populaiton size changes depending on births, deaths & migraiton.",
          "definitionSnippet": "Number of inhabitants",
          "link": "https://en.wikipedia.org/wiki/Population",
          "precisionMaximum": 6,
          "decimalsMaximum": 0
        },
        {
          gid: "geo",
          "name": "Geography"
        },
        {
          gid: "year",
          "name": "Year"
        }
      ];
      let expectedQuery = {gid: {'$in': ['population', 'geo', 'year']}};
      let expectedProjection = {_id: 0, __v: 0};
      let expectedWsJson = {
        success: true,
        error: null,
        data: {population: dataDb[0], geo: {name: dataDb[1].name}, year: {name: dataDb[2].name}}
      };
      checkResult(expectedQuery, expectedProjection, expectedWsJson, dataDb, select)
    });
  });


  context('when comes select with value: not valid in query', () => {
    it('should return not valid data', () => {
      let select = ['abcd'];
      let dataDb = [null];
      let expectedQuery = {gid: {'$in': ['abcd']}};
      let expectedProjection = {_id: 0, __v: 0};
      let expectedWsJson = {
        success: true,
        error: null,
        data: {abcd: dataDb[0]}
      };
      checkResult(expectedQuery, expectedProjection, expectedWsJson, dataDb, select)
    });
  });

  function checkResult(expectedQuery, expectedProjection, expectedWsJson, dataDb, select) {


    let listMetadataStub = sinon.stub(metaController, 'listMetadata', (query, projection, cb) => {
      assert.deepEqual(query, expectedQuery);
      assert.deepEqual(projection, expectedProjection);
      return cb(null, dataDb);
    });

    metaController.projectMetadata(select, (err, wsJson) => {
      assert.deepEqual(wsJson, expectedWsJson);
      listMetadataStub.restore();
    });
  }

});
