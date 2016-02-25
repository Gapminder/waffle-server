'use strict';
let _ = require('lodash');
let async = require('async');
let mongoose = require('mongoose');

let Geo = mongoose.model('Geo');

// TODO: fix mapping categories hardcode
let mappingCategories = {
  isRegion4: 'world_4region',
  isGlobal: 'global',
  isCountry: 'country',
  isUnState: 'un_state'
};

// TODO: hardcode mapping geo for ddf (fix it when we will have more formats)
let geoMapping = require('./geo-mapping').ddf;
let defaultSelect = ['geo','geo.name','geo.cat','geo.region'];

module.exports = {
  listGeoProperties: listGeoProperties,
  projectGeoProperties: projectGeoProperties
};

function _isGeoCatFilter(where, category) {
  return where && !_.isEmpty(where['geo.cat']) && _.includes(where['geo.cat'], category);
}

function _isCategoryFilter(where, category) {
  return !_.isNil(where[category]) && category.match(/^geo\.is/);
}
function projectGeoProperties(_select, where, cb) {
  let select = _.isEmpty(_select) ? defaultSelect : _select;
  let selectedCategories = _.chain(geoMapping)
    .reduce((result, queryKey, category) => {
      // TODO hardcode for compatibility (remove _isGeoCatFilter when `geo.cat` will be depricated on Vizabi)
      if (_isGeoCatFilter(where, category) || _isCategoryFilter(where, category)) {
        let queryField = {};
        queryField[queryKey] = true;
        result.push(queryField);
      }

      return result;
    }, [])
    .uniqWith(_.isEqual)
    .value();

  let query = {};
  if (where) {
    if (!_.isEmpty(selectedCategories)) {
      query = { $or: selectedCategories };
    }
    if (!_.isEmpty(where.geo)) {
      query.gid = {$in: where.geo};
    }
    if (!_.isEmpty(where['geo.region'])) {
      query.region4 = {$in: where['geo.region']};
    }
  }

  let projection = _.reduce(select, (result, item) => {
    // TODO hardcode for compatibility (remove when `geo.cat` will be depricated on Vizabi)
    if (item === 'geo.cat') {
      let defaultCategoryProjections = {isGlobal: 1, isRegion4: 1, isUnState: 1, isCountry: 1};
      result = _.assign(result, defaultCategoryProjections);
      return result;
    }

    let key = geoMapping[item] || item;
    result[key] = 1;
    return result;
  }, {_id: 0});


  this.listGeoProperties(query, projection, mapGeoData(select, cb));
}

// list of all geo properties
function listGeoProperties(query, projection, cb) {
  return Geo.find(query, projection)
    .sort('gid')
    .lean()
    .exec(cb);
}

function mapGeoData(headers, cb) {
  return (err, geoProps) => {
    if (err) {
      console.error(err);
    }

    let rows = _.map(geoProps, function (prop) {
      return _.map(headers, header => {
        let key = geoMapping[header];

        // TODO hardcode for compatibility (remove when `geo.cat` will be depricated on Vizabi)
        if (header === 'geo.cat') {
          switch (true) {
            case prop.isGlobal:
              return mappingCategories.isGlobal;
              break;
            case prop.isRegion4:
              return mappingCategories.isRegion4;
              break;
            case prop.isUnState:
              return mappingCategories.isUnState;
              break;
            case prop.isCountry:
            default:
              return mappingCategories.isCountry;
              break;
          }
        }

        return prop[key] || null;
      });
    });

    var data = {
      headers: headers,
      rows: rows
    };

    return cb(null, data);
  }
}
