'use strict';

const mongoose = require('mongoose');
require('../../ws.repository/geo.model');

const geoController = require('./geo-properties.controller');

const sinon = require('sinon');
const assert = require('assert');
const _ = require('lodash');

const defaultSelect = ['geo', 'geo.name', 'geo.cat', 'geo.region'];
const defaultWhere = {'geo.cat': ['geo']};
const defaultRows = [];
const defaultProjection = {
  _id: 0,
  isGlobal: 1,
  isRegion4: 1,
  isCountry: 1,
  isUnState: 1
};

describe('Geo properties controller', () => {
  describe('#select', () => {

    context('when comes empty select in query', () => {
      it('should return object  with expected headers `geo, geo.name, geo.cat, geo.region` by default', () => {
        let expectedProjection = _.assign({
          gid: 1,
          name: 1,
          region4: 1,
          'geo.cat': 1
        }, defaultProjection);
        let expectedQuery = {};
        let expectedWsJson = {
          headers: defaultSelect,
          rows: defaultRows
        };

        checkResult(expectedQuery, expectedProjection, expectedWsJson);
      });
    });

    context('when comes select with only one known value `geo` in query', () => {
      it('should return object with expected `geo` header', () => {
        let expectedProjection = _.assign({ gid: 1 }, defaultProjection);
        let select = ['geo'];
        let expectedQuery = {};
        let expectedWsJson = {
          headers: select,
          rows: defaultRows
        };

        checkResult(expectedQuery, expectedProjection, expectedWsJson, select);
      });
    });

    context('when comes select with all known values `geo, geo.name, geo.cat, geo.region, geo.latitude, geo.longitude` in query', () => {
      it('should return object with expected all selected headers', () => {
        let expectedProjection = _.assign({
          gid: 1,
          name: 1,
          region4: 1,
          'geo.cat': 1,
          latitude: 1,
          longitude: 1
        }, defaultProjection);
        let select = ['geo', 'geo.name', 'geo.cat', 'geo.region', 'geo.latitude', 'geo.longitude'];
        let expectedQuery = {};
        let expectedWsJson = {
          headers: select,
          rows: defaultRows
        };

        checkResult(expectedQuery, expectedProjection, expectedWsJson, select);
      });
    });

    context('when comes select with some unknown values `geo, geo.unknown, unknown, time, population` in query', () => {
      it('should return object with expected headers `geo, geo.unknown, unknown, time, population`', () => {
        let expectedProjection = _.assign({
          gid: 1,
          'geo.unknown': 1,
          unknown: 1,
          time: 1,
          population: 1
        }, defaultProjection);
        let select = ['geo', 'geo.unknown', 'unknown', 'time', 'population'];
        let expectedQuery = {};
        let expectedWsJson = {
          headers: select,
          rows: defaultRows
        };

        checkResult(expectedQuery, expectedProjection, expectedWsJson, select);
      });
    });

    context('when comes select with values in random order `unknown, geo.latitude, geo.name, geo.unknown, geo.longitude` in query', () => {
      it('should return object with headers in expected random order `unknown, geo.latitude, geo.name, geo.unknown, geo.longitude`', () => {
        let expectedProjection = _.assign({
          unknown: 1,
          'latitude': 1,
          'name': 1,
          'geo.unknown': 1,
          'longitude': 1
        }, defaultProjection);
        let select = ['unknown', 'geo.latitude', 'geo.name', 'geo.unknown', 'geo.longitude'];
        let expectedQuery = {};
        let expectedWsJson = {
          headers: select,
          rows: defaultRows
        };

        checkResult(expectedQuery, expectedProjection, expectedWsJson, select);
      });
    });
  });

  describe('#where', () => {
    let expectedProjection = _.assign({
      gid: 1,
      name: 1,
      region4: 1,
      'geo.cat': 1
    }, defaultProjection);

    let expectedWsJson = {
      headers: defaultSelect,
      rows: defaultRows
    };

    context('when comes geo with list of gid\'s in query', () => {
      it('should return object with expected default headers', () => {
        let where = _.assign({
          geo: ['chn', 'asia', 'world', 'NaN', '']
        }, defaultWhere);
        let expectedQuery = {
          gid: {
            $in: where['geo']
          }
        };

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.region with list of regions gid in query', () => {
      it('should return object with expected default headers', () => {
        let where = _.assign({
          'geo.region': ['asia', 'europe', 'NaN', '']
        }, defaultWhere);
        let expectedQuery = {
          region4: {
            $in: where['geo.region']
          }
        };

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.cat with geo category in query', () => {
      it('should return object with expected default headers', () => {
        let where = _.assign({
          'geo.cat': ['geo']
        });
        let expectedQuery = {};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.cat with global category in query', () => {
      it('should return object with expected default headers', () => {
        let where = _.assign({
          'geo.cat': ['global']
        });
        let expectedQuery = {isGlobal: true};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.cat with region category in query', () => {
      it('should return object with expected default headers', () => {
        let where = _.assign({
          'geo.cat': ['region']
        });
        let expectedQuery = {isRegion4: true};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.cat with country category in query', () => {
      it('should return object with expected default headers', () => {
        let where = _.assign({
          'geo.cat': ['country']
        });
        let expectedQuery = {isCountry: true};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.cat with unstate category in query', () => {
      it('should return object with expected default headers', () => {
        let where = _.assign({
          'geo.cat': ['unstate']
        });
        let expectedQuery = {isUnState: true};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.cat with world_4region category in query', () => {
      it('should return object with expected default headers', () => {
        let where = _.assign({
          'geo.cat': ['world_4region']
        });
        let expectedQuery = {isRegion4: true};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.cat with list of categories in query', () => {
      it('should return object with expected default headers', () => {
        let where = _.assign({
          'geo.cat': ['global', 'region', 'country', 'unstate', 'world_4region', 'geo']
        });
        let actualCountOfQueries = {
          '{}': 0,
          '{"isGlobal":true}': 0,
          '{"isRegion4":true}': 0,
          '{"isCountry":true}': 0,
          '{"isUnState":true}': 0
        };
        let expectedCountOfQueries = {
          '{}': 1,
          '{"isGlobal":true}': 1,
          '{"isRegion4":true}': 2,
          '{"isCountry":true}': 1,
          '{"isUnState":true}': 1
        };

        let listGeoPropertiesStub = sinon.stub(geoController, 'listGeoProperties', (query, projection, cb) => {
          actualCountOfQueries[JSON.stringify(query)]++;
          assert.deepEqual(projection, expectedProjection);
          cb(null, defaultRows);
        });

        geoController.projectGeoProperties(defaultSelect, where, (err, wsJson) => {
          assert.deepEqual(wsJson, expectedWsJson);
          assert.deepEqual(actualCountOfQueries, expectedCountOfQueries);
          listGeoPropertiesStub.restore();
        });
      });
    });
  });

  describe('#select & where', () => {
    context('when comes world_4region category, list of gid\'s and list of regions in query', () => {
      it('should return object with expected selected headers `geo.latitude, geo, geo.longitude, geo.name, geo.region`', () => {
        let select= ['geo.latitude', 'geo', 'geo.longitude', 'geo.name', 'geo.region'];
        let where = _.assign({
          'geo.cat': ['world_4region'],
          'geo.region': ['americas', 'africa'],
          'geo': ['dza', 'usa', 'chn', 'ago', 'cmr']
        });
        let expectedQuery = {
          gid: {
            $in: where.geo
          },
          region4: {
            $in: where['geo.region']
          },
          isRegion4: true
        };

        let expectedProjection = _.assign({
          gid: 1,
          name: 1,
          region4: 1,
          latitude: 1,
          longitude: 1
        }, defaultProjection);

        let expectedWsJson = {
          headers: select,
          rows: defaultRows
        };

        checkResult(expectedQuery, expectedProjection, expectedWsJson, select, where);
      });
    });
  });

  function checkResult(expectedQuery, expectedProjection, expectedWsJson, _select, _where, _rows) {
    let select = _select || defaultSelect;
    let where = _where || defaultWhere;
    let rows = _rows || defaultRows;

    let listGeoPropertiesStub = sinon.stub(geoController, 'listGeoProperties', (query, projection, cb) => {
      assert.deepEqual(query, expectedQuery);
      assert.deepEqual(projection, expectedProjection);
      cb(null, rows);
    });

    geoController.projectGeoProperties(select, where, (err, wsJson) => {
      assert.deepEqual(wsJson, expectedWsJson);
      listGeoPropertiesStub.restore();
    });
  }
});
