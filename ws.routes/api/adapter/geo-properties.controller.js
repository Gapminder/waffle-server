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

      var result = _.map(geoProps, function (prop) {
        return {
          geo: prop.gid,
          'geo.name': prop.name,
          'geo.cat': mappingCategories[prop.subdim],
          'geo.region': prop.geoRegion4 || prop.gid
        };
      });

      return cb(null, result);
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

      var result = _.map(geoProps, function (prop) {
        return {
          geo: prop.gid,
          'geo.name': prop.name,
          'geo.cat': mappingCategories[prop.subdim],
          'geo.region': prop.geoRegion4 || prop.gid,
          'geo.lat': prop.lat,
          'geo.lng': prop.lng
        };
      });

      return cb(null, result);
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

      var result = _.map(geoProps, function (prop) {
        return {
          geo: prop.gid,
          'geo.name': prop.name,
          'geo.cat': mappingCategories[prop.subdim],
          'geo.region': prop.geoRegion4 || prop.gid
        };
      });

      return cb(null, result);
    });
}
