'use strict';

const _ = require('lodash');
const async = require('async');
const fs = require('fs');
const path = require('path');
const parse = require('csv-parse');
const transform = require('stream-transform');
const expect = require('chai').expect;

const appStub = {
  get: function (moduleName) {
    return this[moduleName];
  },
  set: function (moduleName, module) {
    return this[moduleName] = module;
  }
};

const config = require('../ws.config/config')(appStub);

const mongoose = require('mongoose');

// import models
let Geo = require('../ws.repository/geo.model');
let Dimensions = require('../ws.repository/dimensions/dimensions.model');
require('../ws.repository/dimension-values/dimension-values.model');
require('../ws.repository/translations.model');
require('../ws.repository/indicators/indicators.model');
require('../ws.repository/indicator-values/indicator-values.model');
require('../ws.repository/indexTree.model');
require('../ws.repository/indexDb.model');

const collections = ['Geo', 'Dimensions', 'DimensionValues', 'Indicators',
  'IndicatorValues', 'Translations', 'IndexTree', 'IndexDb'];
const testLinesFilter = 15;

let getCallback = (modelName, query, projection, propsMapping, done) => {
  let _projection = projection || {__v: 0, _id: 0};
  return (sourceData) => {
    mongoose.model(modelName).find(query, _projection).lean().exec((err, actualData) => {
      let expectedFileds = _.chain(propsMapping).values().value();
      let actualFields = _.chain(actualData)
        .reduce((result, n) => result.concat(_.keys(n)), [])
        .uniq()
        .value();

      let expectedData = _.chain(sourceData)
        .map((data) => {
          return _.chain(data)
            .mapKeys((value, key) => propsMapping[key] || key)
            .pick(expectedFileds)
            .value();
        })
        .value();

      expect(_.differenceWith(expectedFileds, actualFields, _.isEqual)).to.have.lengthOf(0);
      expect(_.differenceWith(expectedData, actualData, _.isEqual)).to.have.lengthOf(0);

      return done();
    });
  }
};

describe('Import ddf', () => {
  before(() => mongoose.connect(config.MONGODB_URL));

  after(() => mongoose.disconnect());

  context('#all collections', () => {
    it('shouln\'t be empty', (done) => {
      let fns = _.reduce(collections, (result, collectionName) => {
        result[collectionName] = (cb) => {
          return mongoose.model(collectionName).count(cb);
        };
        return result;
      }, {});

      async.parallel(fns, (err, result) => {
        let allCollectionsHaveData = _.chain(result).values().every(Boolean).value();

        expect(result).to.have.all.keys(collections);
        expect(allCollectionsHaveData).to.be.true;

        return done();
      });
    });
  });

  context('#geo collection', () => {
    let _mappingSourceValuesFn = (value) => {
      switch (value) {
        case 'TRUE':
          return true;
        case 'FALSE':
          return false;
        case '':
          return null;
        default:
          let _value = parseFloat(value);
          return isNaN(_value) ? _.trim(value) : _value;
      }
    };
    let modelName = 'Geo';
    let projection = null;

    it('should contain all gids of countries from ddf files' , (done) => {
      let source = 'ddf--list--geo--country.csv';
      let geoPropsMapping = {
        'geo': 'gid',
        'name': 'name',
        'is.country': 'isCountry',
        'is.un_state': 'isUnState',
        'world_4region': 'region4',
        'latitude': 'latitude',
        'longitude': 'longitude'
      };
      let query = {isCountry: true};
      let callback = getCallback(modelName, query, projection, geoPropsMapping, done);

      getSourceData(source, _mappingSourceValuesFn, callback);
    });

    it('should contain gid of global from ddf files' , (done) => {
      let source = 'ddf--list--geo--global.csv';
      let geoPropsMapping = {
        'geo': 'gid',
        'is.global': 'isGlobal',
        'name': 'name',
        'latitude': 'latitude',
        'longitude': 'longitude'
      };
      let query = {isGlobal: true};
      let callback = getCallback(modelName, query, projection, geoPropsMapping, done);

      getSourceData(source, _mappingSourceValuesFn, callback);
    });

    it('should contain gid of regions from ddf files' , (done) => {
      let source = 'ddf--list--geo--world_4region.csv';
      let geoPropsMapping = {
        'geo': 'gid',
        'is.world_4region': 'isRegion4',
        'name': 'name',
        'name_short': 'nameShort',
        'name_long': 'nameLong',
        'description': 'description',
        'latitude': 'latitude',
        'longitude': 'longitude',
        'color': 'color'
      };
      let query = {isRegion4: true};
      let callback = getCallback(modelName, query, projection, geoPropsMapping, done);

      getSourceData(source, _mappingSourceValuesFn, callback);
    });

  });

  context('#dimensions collection', () => {
    let _mappingSourceValuesFn = (value, key) => {
      switch (true) {
        case (key === 'default_entities'):
          return value && value.length ? value.split(',') : [];
        case (key === 'aliases'):
          return value && value.length ? value.split('","').map(v => v.replace(/"/g, '')) : [];
        case (key === 'measure'):
          return (value === 'FALSE' || !value) ? null : value;
        //case (customKeys.indexOf(key) > -1):
        //  return _.trim(value, '\n');
        case (value === 'TRUE'):
          return true;
        case (value === 'FALSE'):
          return false;
        case (value === ''):
          return null;
        default:
          let _value = parseFloat(value);
          return isNaN(_value) ? _.trim(value) : _value;
      }
    };
    let modelName = 'Dimensions';

    it('should contain all dimensions and subdimensions from ddf file' , (done) => {
      let source = 'ddf--dimensions.csv';
      let geoPropsMapping = {
        'concept': 'gid',
        'type': 'type',
        'subdim_of': 'subdimOf',
        'name': 'name',
        'name_short': 'nameShort',
        'name_long': 'nameLong',
        'link': 'link',
        'description': 'description',
        'usability': 'usability',
        'total_entity': 'totalEntity',
        'total_name': 'totalName',
        'default_entities': 'defaultEntities',
        'drilldowns': 'drilldowns',
        'drillups': 'drillups',
        'incomplete_drillups': 'incompleteDrillups',
        'ordinal': 'ordinal',
        'measure': 'measure',
        'interval': 'interval',
        'cardinality': 'cardinality',
        'aliases': 'aliases',
        'pattern': 'pattern',
        'ddf_inheritance': 'ddfInheritance'
      };
      let query = {};
      let projection = {__v: 0, _id: 0, dataSources: 0, catalogVersions: 0};
      let callback = getCallback(modelName, query, projection, geoPropsMapping, done);

      getSourceData(source, _mappingSourceValuesFn, callback);
    });

  });

  function getSourceData(source, mappingSourceValuesFn, callback) {
    let result = [];
    let parser = parse({delimiter: ',', columns: true, skip_empty_lines: true, trim: true});

    // Use the writable stream api
    parser.on('readable', function(){
      let record = parser.read();
      if (!_.isEmpty(record)
        && ((parser.count < testLinesFilter) || (parser.count % testLinesFilter === 0))) {
        let _record = _.mapValues(record, mappingSourceValuesFn);
        result.push(_record);
      }
    });
    // Catch any error
    parser.on('error', function(err){
      expect(err).to.be.null;
    });
    // When we are done, test that the parsed sourceGeos matched what expected
    parser.on('finish', function () {
      callback(result);
    });

    let input = fs.createReadStream(path.resolve(config.PATH_TO_DDF_FOLDER, source));

    input.pipe(parser);
  }
});
