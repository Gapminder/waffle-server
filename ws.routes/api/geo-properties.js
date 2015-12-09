var _ = require('lodash');
var async = require('async');
var express = require('express');
var mongoose = require('mongoose');
var cache = require('express-redis-cache')();
var compression = require('compression');

var u = require('../utils');

// TODO: fix mapping categories hardcode
var mappingCategories = {
  g_region: 'region',
  g_west_rest: 'g_west_rest',
  planet: 'planet',
  territory: 'country'
};

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  /*eslint new-cap:0*/
  var router = express.Router();

  var Geo = mongoose.model('Geo');

  // list
  router.get('/api/geo/', compression(), u.getCacheConfig('geo'), cache.route(), listGeoProperties);
  router.get('/api/geo/regions', compression(), u.getCacheConfig('regions'), cache.route(), listRegionsProperties);
  router.get('/api/geo/countries', compression(), u.getCacheConfig('countries'), cache.route(), listCountriesProperties);

  return app.use(router);

  // list of all geo properties
  function listGeoProperties(req, res, next) {
    Geo.find()
      .sort('gid')
      .lean()
      .exec(function (err, geoProps) {
        if (err) {
          return next(err);
        }

        var result = _.map(geoProps, function (prop) {
          return {
            geo: prop.gid,
            'geo.name': prop.name,
            'geo.cat': mappingCategories[prop.subdim],
            'geo.region': prop.geoRegion4 || prop.gid
          };
        });

        return res.json({success: true, data: result});
    });
  }

  // list of countries in VT metadata.json format
  function listCountriesProperties(req, res, next) {
    Geo.find({isTerritory: true})
      .sort('gid')
      .lean()
      .exec(function (err, geoProps) {
      if (err) {
        return next(err);
      }

        var result = _.map(geoProps, function (prop) {
          return {
            geo: prop.gid,
            'geo.name': prop.name,
            'geo.cat': mappingCategories[prop.subdim],
            'geo.region': prop.geoRegion4 || prop.gid,
            lat: prop.lat,
            lng: prop.lng
          };
        });

      return res.json({success: true, data: result});
    });
  }

  // list of all geo properties
  function listRegionsProperties(req, res, next) {
    Geo.find({subdim : {$in: ['g_region', 'planet', 'g_west_rest']}})
      .sort('gid')
      .lean()
      .exec(function (err, geoProps) {
        if (err) {
          return next(err);
        }

        var result = _.map(geoProps, function (prop) {
          return {
            geo: prop.gid,
            'geo.name': prop.name,
            'geo.cat': mappingCategories[prop.subdim],
            'geo.region': prop.geoRegion4 || prop.gid
          };
        });

        return res.json({success: true, data: result});
      });
  }
};
