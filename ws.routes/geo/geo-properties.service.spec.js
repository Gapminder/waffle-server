'use strict';

const mongoose = require('mongoose');
require('../../ws.repository/geo.model');

const geoService = require('./geo-properties.service');

const sinon = require('sinon');
const assert = require('assert');
const _ = require('lodash');

const defaultSelect = ['geo', 'geo.name', 'geo.cat', 'geo.region'];
const defaultWhere = {'geo.cat': []};
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
          region4: 1
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
        let expectedProjection = { _id: 0, gid: 1 };
        let select = ['geo'];
        let expectedQuery = {};
        let expectedWsJson = {
          headers: select,
          rows: defaultRows
        };

        checkResult(expectedQuery, expectedProjection, expectedWsJson, select);
      });
    });

    context('when comes select with duplicate of known value `geo` in query', () => {
      it('should return object with expected `geo, geo` header', () => {
        let expectedProjection = { _id: 0, gid: 1 };
        let select = ['geo', 'geo'];
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
        let select = ['geo', 'geo.name', 'geo.cat', 'geo.region', 'geo.latitude', 'geo.longitude'];
        let expectedProjection = _.assign({
          gid: 1,
          name: 1,
          region4: 1,
          latitude: 1,
          longitude: 1
        }, defaultProjection);
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
        let select = ['geo', 'geo.unknown', 'unknown', 'time', 'population'];
        let expectedProjection = {
          _id: 0,
          gid: 1,
          'geo.unknown': 1,
          unknown: 1,
          time: 1,
          population: 1
        };
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
        let expectedProjection = {
          _id: 0,
          unknown: 1,
          'latitude': 1,
          'name': 1,
          'geo.unknown': 1,
          'longitude': 1
        };
        let select = ['unknown', 'geo.latitude', 'geo.name', 'geo.unknown', 'geo.longitude'];
        let expectedQuery = {};
        let expectedWsJson = {
          headers: select,
          rows: defaultRows
        };

        checkResult(expectedQuery, expectedProjection, expectedWsJson, select);
      });
    });

    context('when comes select with new ddf properties `geo.geographic_regions_in_4_colors, geo.g77_and_oecd_countries, geo.geographic_regions, geo.income_groups, geo.landlocked, geo.main_religion_2008` in query', () => {
      it('should return object with headers in expected random order `geographic_regions_in_4_colors, g77_and_oecd_countries, geographic_regions, income_groups, landlocked, main_religion_2008`', () => {
        let expectedProjection = {
          _id: 0,
          'geographic_regions_in_4_colors': 1,
          'g77_and_oecd_countries': 1,
          'geographic_regions': 1,
          'income_groups': 1,
          'landlocked': 1,
          'main_religion_2008': 1
        };
        let select = [
          'geographic_regions_in_4_colors', 'geo.g77_and_oecd_countries',
          'geo.geographic_regions', 'geo.income_groups', 'geo.landlocked',
          'geo.main_religion_2008'
        ];
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
      region4: 1
    }, defaultProjection);

    let expectedWsJson = {
      headers: defaultSelect,
      rows: defaultRows
    };

    context('when comes geo with list of gid\'s in query', () => {
      it('should apply all received gid\'s to db query', () => {
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
      it('should apply all received regions to db query', () => {
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

    context('when comes geo.income_groups with list of values in query', () => {
      it('should apply all received regions to db query', () => {
        let where = _.assign({
          'geo.income_groups': ['low_income', 'upper_middle_income', 'NaN', '']
        }, defaultWhere);
        let expectedQuery = {
          income_groups: {
            $in: where['geo.income_groups']
          }
        };

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.cat with empty value in query', () => {
      it('shouldn\'t apply any filter to db query', () => {
        let where = {'geo.cat': []};
        let expectedQuery = {};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.cat with global category in query', () => {
      it('should apply only isGlobal filter to db query', () => {
        let where = {'geo.cat': ['global']};
        let expectedQuery = { $or: [{isGlobal: true}] };

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.cat with region category in query', () => {
      it('should apply only isRegion4 filter to db query', () => {
        let where = {'geo.cat': ['region']};
        let expectedQuery = { $or: [{isRegion4: true}] };

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.cat with country category in query', () => {
      it('should apply only isCountry filter to db query', () => {
        let where = {'geo.cat': ['country']};
        let expectedQuery = { $or: [{isCountry: true}] };

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.cat with unstate category in query', () => {
      it('should apply only isUnState filter to db query', () => {
        let where = {'geo.cat': ['unstate']};
        let expectedQuery = { $or: [{isUnState: true}] };

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.cat with world_4region category in query', () => {
      it('should apply only isRegion4 filter to db query', () => {
        let where = {'geo.cat': ['world_4region']};
        let expectedQuery = { $or: [{isRegion4: true}] };

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.cat with list of categories \'global, region, country, unstate, world_4region\' in query', () => {
      it('should apply `isGlobal, isRegion4, isCountry, isUnState` filters to db query', () => {
        let where = {
          'geo.cat': ['global', 'region', 'country', 'unstate', 'world_4region']
        };
        let expectedQuery = {
          $or:[
            {isGlobal:true},
            {isRegion4:true},
            {isCountry:true},
            {isUnState:true}
          ]};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.is--global in query', () => {
      it('should apply only isGlobal filter to db query', () => {
        let where = {'geo.is--global': ''};
        let expectedQuery = {$or: [{isGlobal:true}]};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.is--world_4region in query', () => {
      it('should apply only isRegion4 filter to db query', () => {
        let where = {'geo.is--world_4region': ''};
        let expectedQuery = {$or: [{isRegion4:true}]};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.is--country in query', () => {
      it('should apply only isCountry filter to db query', () => {
        let where = {'geo.is--country': ''};
        let expectedQuery = {$or: [{isCountry:true}]};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.is--un_state in query', () => {
      it('should apply only isUnState filter to db query', () => {
        let where = {'geo.is--un_state': ''};
        let expectedQuery = {$or: [{isUnState:true}]};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.is--abcd in query', () => {
      it('shouldn\'t apply any filter to db query', () => {
        let where = {'geo.is--abcd': ''};
        let expectedQuery = {};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes all known categories geo.is-- and 1 unknown geo.is-- in query', () => {
      it('should apply `isGlobal, isRegion4, isCountry, isUnState` filters to db query', () => {
        let where = {
          'geo.is--global': '',
          'geo.is--world_4region': '',
          'geo.is--country': '',
          'geo.is--un_state': '',
          'geo.is--abcd': ''
        };
        let expectedQuery = {
          $or:[
            {isGlobal:true},
            {isRegion4:true},
            {isCountry:true},
            {isUnState:true}
          ]};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.isGlobal in query', () => {
      it('should apply only isGlobal filter to db query', () => {
        let where = {'geo.isGlobal': ''};
        let expectedQuery = {$or: [{isGlobal:true}]};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.isRegion4 in query', () => {
      it('should apply only isRegion4 filter to db query', () => {
        let where = {'geo.isRegion4': ''};
        let expectedQuery = {$or: [{isRegion4:true}]};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.isCountry in query', () => {
      it('should apply only isCountry filter to db query', () => {
        let where = {'geo.isCountry': ''};
        let expectedQuery = {$or: [{isCountry:true}]};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.isUnState in query', () => {
      it('should apply only isUnState filter to db query', () => {
        let where = {'geo.isUnState': ''};
        let expectedQuery = {$or: [{isUnState:true}]};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes geo.isAbcd in query', () => {
      it('shouldn\'t apply any filter to db query', () => {
        let where = {'geo.isAbcd': ''};
        let expectedQuery = {};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes all known categories \'isGlobal, isRegion4, isCountry, isUnState\' and 1 unknown geo.isAbcd in query', () => {
      it('should apply `isGlobal, isRegion4, isCountry, isUnState` filters to db query', () => {
        let where = {
          'geo.isGlobal': '',
          'geo.isRegion4': '',
          'geo.isCountry': '',
          'geo.isUnState': '',
          'geo.isAbcd': ''
        };
        let expectedQuery = {
          $or:[
            {isGlobal:true},
            {isRegion4:true},
            {isCountry:true},
            {isUnState:true}
          ]};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

    context('when comes mixed syntaxes (geo.cat, .is--, camelCase) of categories in query', () => {
      it('should apply `isGlobal, isRegion4, isCountry, isUnState` filters in right order to db query', () => {
        let where = {
          'geo.cat': ['global', 'region', 'qwerty'],
          'geo.isGlobal': '',
          'geo.isCountry': '',
          'geo.isAbcd': '',
          'geo.is--un_state': '',
          'geo.is--world_4region': '',
          'geo.is--test': ''
        };
        let expectedQuery = {
          $or:[
            {isRegion4:true},
            {isUnState:true},
            {isGlobal:true},
            {isCountry:true}
          ]};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, defaultSelect, where);
      });
    });

  });

  describe('#select & where', () => {
    let select= ['geo.latitude', 'geo', 'geo.longitude', 'geo.name', 'geo.region'];
    let expectedProjection = {
      _id: 0, gid: 1, name: 1, region4: 1, latitude: 1, longitude: 1
    };
    let expectedWsJson = {
      headers: select,
      rows: defaultRows
    };

    context('when comes \'world_4region\' category, list of gid\'s and list of regions in query', () => {
      it('should return object with expected selected headers `geo.latitude, geo, geo.longitude, geo.name, geo.region`', () => {
        let where = {
          'geo.cat': ['world_4region'],
          'geo.region': ['americas', 'africa'],
          'geo.geographic_regions': ['america', 'middle_east_north_africa'],
          'geo': ['dza', 'usa', 'chn', 'ago', 'cmr']
        };
        let expectedQuery = {
          $or: [{ isRegion4: true }],
          gid: { $in: where.geo },
          region4: { $in: where['geo.region'] },
          geographic_regions: { $in: where['geo.geographic_regions'] }
        };

        checkResult(expectedQuery, expectedProjection, expectedWsJson, select, where);
      });
    });

    context('when comes \'geo.is--world_4region\' category, list of gid\'s and list of regions in query', () => {
      it('should return object with expected selected headers `geo.latitude, geo, geo.longitude, geo.name, geo.region`', () => {
        let where = {
          'geo.is--world_4region': '',
          'geo.region': ['americas', 'africa'],
          'geo.geographic_regions_in_4_colors': ['americas', 'africa'],
          'geo': ['dza', 'usa', 'chn', 'ago', 'cmr']
        };
        let expectedQuery = {
          $or: [{ isRegion4: true }],
          gid: { $in: where.geo },
          region4: { $in: where['geo.region'] },
          geographic_regions_in_4_colors: { $in: where['geo.geographic_regions_in_4_colors'] }
        };

        checkResult(expectedQuery, expectedProjection, expectedWsJson, select, where);
      });
    });

    context('when comes \'geo.isRegion4\' category, list of gid\'s and list of regions in query', () => {
      it('should return object with expected selected headers `geo.latitude, geo, geo.longitude, geo.name, geo.region`', () => {
        let where = {
          'geo.isRegion4': '',
          'geo.region': ['americas', 'africa'],
          'geo.main_religion_2008': ['muslim', 'eastern_religions'],
          'geo': ['dza', 'usa', 'chn', 'ago', 'cmr']
        };
        let expectedQuery = {
          $or: [{ isRegion4: true }],
          gid: { $in: where.geo },
          region4: { $in: where['geo.region'] },
          main_religion_2008: { $in: where['geo.main_religion_2008'] }
        };

        checkResult(expectedQuery, expectedProjection, expectedWsJson, select, where);
      });
    });
  });

  describe('#mapGeoData', () => {
    context('when comes headers without geo.cat', () => {
      it('should return geoProps as is', () => {
        let headers = ['geo', 'geo.name', 'geo.latitude', 'geo.longitude'];
        let rows = [
          {gid: 'aaa', name: 'Aaaa', latitude: 10, longitude: 50},
          {gid: 'bbb', name: 'Bbbb', latitude: 11, longitude: 50},
          {gid: 'ccc', name: 'Cccc', latitude: 10, longitude: 51},
          {gid: 'ddd', name: 'Dddd', latitude: 11, longitude: 51}
        ];
        let expectedRows = [
          ['aaa', 'Aaaa', 10, 50],
          ['bbb', 'Bbbb', 11, 50],
          ['ccc', 'Cccc', 10, 51],
          ['ddd', 'Dddd', 11, 51]
        ];
        let expectedWsJson = {
          headers: headers,
          rows: expectedRows
        };
        let expectedProjection = {
          _id: 0,
          gid: 1,
          name: 1,
          latitude: 1,
          longitude: 1
        };
        let expectedQuery = {};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, headers, {}, rows);
      });
    });

    context('when comes headers without geo.cat in the specific order', () => {
      it('should return geoProps values in rows in the specific order', () => {
        let headers = ['geo.latitude', 'geo.longitude', 'geo', 'geo.name'];
        let rows = [
          {gid: 'aaa', name: 'Aaaa', latitude: 10, longitude: 50},
          {gid: 'bbb', name: 'Bbbb', latitude: 11, longitude: 50},
          {gid: 'ccc', name: 'Cccc', latitude: 10, longitude: 51},
          {gid: 'ddd', name: 'Dddd', latitude: 11, longitude: 51}
        ];
        let expectedRows = [
          [10, 50, 'aaa', 'Aaaa'],
          [11, 50, 'bbb', 'Bbbb'],
          [10, 51, 'ccc', 'Cccc'],
          [11, 51, 'ddd', 'Dddd']
        ];
        let expectedWsJson = {
          headers: headers,
          rows: expectedRows
        };
        let expectedProjection = {
          _id: 0,
          gid: 1,
          name: 1,
          latitude: 1,
          longitude: 1
        };
        let expectedQuery = {};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, headers, {}, rows);
      });
    });

    context('when comes headers with geo.cat', () => {
      it('should return geoProps with geo.cat column (possible values: `country, world_4region, global, un_state`)', () => {
        let headers = ['geo.latitude', 'geo.longitude', 'geo.cat', 'geo', 'geo.name'];
        let rows = [
          {gid: 'aaa', name: 'Aaaa', latitude: 10, longitude: 50, isGlobal: true},
          {gid: 'bbb', name: 'Bbbb', latitude: 11, longitude: 50, isRegion4: true},
          {gid: 'ccc', name: 'Cccc', latitude: 10, longitude: 51, isCountry: true},
          {gid: 'ddd', name: 'Dddd', latitude: 11, longitude: 51, isUnState: true}
        ];
        let expectedRows = [
          [10, 50, 'global', 'aaa', 'Aaaa'],
          [11, 50, 'world_4region', 'bbb', 'Bbbb'],
          [10, 51, 'country', 'ccc', 'Cccc'],
          [11, 51, 'un_state', 'ddd', 'Dddd']
        ];
        let expectedWsJson = {
          headers: headers,
          rows: expectedRows
        };
        let expectedProjection = _.assign({
          gid: 1,
          name: 1,
          latitude: 1,
          longitude: 1
        }, defaultProjection);
        let expectedQuery = {};

        checkResult(expectedQuery, expectedProjection, expectedWsJson, headers, {}, rows);
      });
    });
  });

  function checkResult(expectedQuery, expectedProjection, expectedWsJson, _select, _where, _rows) {
    let select = _select || defaultSelect;
    let where = _where || defaultWhere;
    let rows = _rows || defaultRows;

    let listGeoPropertiesStub = sinon.stub(geoService, 'listGeoProperties', (query, projection, cb) => {
      assert.deepEqual(query, expectedQuery);
      assert.deepEqual(projection, expectedProjection);
      cb(null, rows);
    });

    geoService.projectGeoProperties(select, where, (err, wsJson) => {
      assert.deepEqual(wsJson, expectedWsJson);
      listGeoPropertiesStub.restore();
    });
  }
});
