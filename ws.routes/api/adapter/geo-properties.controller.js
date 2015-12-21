var _ = require('lodash');
var mongoose = require('mongoose');

var Geo = mongoose.model('Geo');

// TODO: fix mapping categories hardcode
var mappingCategories = {
  g_region: 'region',
  g_west_rest: 'g_west_rest',
  planet: 'planet',
  territory: 'country'
};

module.exports = {
  listGeoProperties: listGeoProperties,
  listCountriesProperties: listCountriesProperties,
  listRegionsProperties: listRegionsProperties
};

// list of all geo properties
function listGeoProperties(cb) {
  return Geo.find({})
    .sort('gid')
    .lean()
    .exec(function (err, geoProps) {
      if (err) {
        return cb(err);
      }

      var headers = ['geo', 'geo.name', 'geo.cat', 'geo.region', 'geo.lat', 'geo.lng'];
      var rows = _.map(geoProps, function (prop) {
        return [
          prop.gid,
          prop.name,
          mappingCategories[prop.subdim],
          prop.geoRegion4 || prop.gid,
          prop.lat,
          prop.lng
        ];
      });

      var data = {
        headers: headers,
        rows: rows
      };

      return cb(null, data);
    });
}

// list of countries in VT metadata.json format
function listCountriesProperties(cb) {
  return Geo.find({isTerritory: true})
    .sort('gid')
    .lean()
    .exec(function (err, geoProps) {
      if (err) {
        return cb(err);
      }

      var headers = ['geo', 'geo.name', 'geo.cat', 'geo.region', 'geo.lat', 'geo.lng'];
      var rows = _.map(geoProps, function (prop) {
        return [
          prop.gid,
          prop.name,
          mappingCategories[prop.subdim],
          prop.geoRegion4 || prop.gid,
          prop.lat,
          prop.lng
        ];
      });

      var data = {
        headers: headers,
        rows: rows
      };

      return cb(null, data);
    });
}

// list of all geo properties
function listRegionsProperties(cb) {
  Geo.find({subdim : {$in: ['g_region', 'planet', 'g_west_rest']}})
    .sort('gid')
    .lean()
    .exec(function (err, geoProps) {
      if (err) {
        return cb(err);
      }

      var headers = ['geo', 'geo.name', 'geo.cat', 'geo.region', 'geo.lat', 'geo.lng'];
      var rows = _.map(geoProps, function (prop) {
        return [
          prop.gid,
          prop.name,
          mappingCategories[prop.subdim],
          prop.geoRegion4 || prop.gid,
          prop.lat,
          prop.lng
        ];
      });

      var data = {
        headers: headers,
        rows: rows
      };

      return cb(null, data);
    });
}
