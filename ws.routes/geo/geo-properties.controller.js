'use strict';
let _ = require('lodash');
let async = require('async');
let mongoose = require('mongoose');

let Geo = mongoose.model('Geo');

// TODO: fix mapping categories hardcode
let mappingCategories = {
  isRegion4: 'region',
  isGlobal: 'global',
  isCountry: 'country',
  isUnState: 'unstate'
};

let mappingHeaders = {
  geo: 'gid',
  'geo.name': 'name',
  'geo.region.country': 'region4',
  'geo.region': 'region4',
  'geo.latitude': 'latitude',
  'geo.longitude': 'longitude'
};

let mappingQueries = {
  global: {isGlobal: true},
  world_4region: {isRegion4: true},
  region: {isRegion4: true},
  country: {isCountry: true},
  unstate: {isUnState: true},
  geo: {}
};

module.exports = {
  listGeoProperties: listGeoProperties,
  projectGeoProperties: projectGeoProperties
};

function projectGeoProperties(select, where, cb) {
  let fns = _.map(where['geo.cat'], cat => {
    let projection = _.reduce(select, (result, item) => {
      let key = mappingHeaders[item] || item;
      result[key] = 1;
      return result;
    }, {_id: 0, isGlobal: 1, isRegion4: 1, isCountry: 1, isUnState: 1});

    return cb => {
      let query = _.clone(mappingQueries[cat]) || {};
      if (where && where.geo) {
        query.gid = {$in: where.geo};
      }

      if (where && where['geo.region']) {
        query.region4 = {$in: where['geo.region']};
      }
      this.listGeoProperties(query, projection, cb);
    };
  });

  async.parallel(fns, mapGeoData(select, where['geo.cat'], cb));
}

// list of all geo properties
function listGeoProperties(query, projection, cb) {
  return Geo.find(query, projection)
    .sort('gid')
    .lean()
    .exec(cb);
}

function mapGeoData(headers, category, cb) {
  return (err, geoProps) => {
    if (err) {
      console.error(err);
    }

    let flattedGeo = _.reduce(geoProps, (result, geo) => {
      return result.concat(geo);
    }, []);

    let rows = _.map(flattedGeo, function (prop) {
      return _.map(headers, header => {
        let key = mappingHeaders[header];

        // fixme: hardcode for geo.cat
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
      rows: headers.indexOf('geo') > -1 ? _.uniq(rows, '' + headers.indexOf('geo')) : rows
    };

    return cb(null, data);
  }
}
