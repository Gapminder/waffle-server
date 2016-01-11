'use strict';
let _ = require('lodash');
let async = require('async');
let mongoose = require('mongoose');

let Geo = mongoose.model('Geo');

// TODO: fix mapping categories hardcode
let mappingCategories = {
  g_region: 'region',
  g_west_rest: 'g_west_rest',
  planet: 'global',
  territory: 'country'
};

let mappingHeaders = {
  geo: 'gid',
  'geo.name': 'name',
  'geo.cat': 'subdim',
  'geo.region.country': 'geoRegion4',
  'geo.region': 'gid',
  'geo.lat': 'lat',
  'geo.lng': 'lng'
};

let mappingQueries = {
  global: {isGlobal: true},
  world_4region: {isRegion4 : true},
  region: {isRegion4 : true},
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
      let key = mappingHeaders[item + '.' + cat] || mappingHeaders[item] || item;
      result[key] = 1;
      return result;
    }, { '_id': 0 });

    return cb => {
      let query = mappingQueries[cat] || {};
      if (where && where.geo) {
        query.gid = {$in: where.geo};
      }

      listGeoProperties(query, projection, cb);
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
        let key = mappingHeaders[header + '.' + category] || mappingHeaders[header];

        return mappingCategories[prop[key]] || prop[key] || null;
      });
    });

    var data = {
      headers: headers,
      rows: headers.indexOf('geo') > -1 ? _.uniq(rows, '' + headers.indexOf('geo')) : rows
    };

    return cb(null, data);
  }
}
