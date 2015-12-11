var express = require('express');
var bodyParser = require('body-parser');
//var request = require('request-json');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var url = require('url');
var json2csv = require('json2csv');

var async = require('async');

var geoController = require('./geo-properties.controller');
var mongoose = require('mongoose');

var Geo = require('../../../ws.repository/geo.model');
var Translations = require('../../../ws.repository/translations.model');
var Indicators = require('../../../ws.repository/indicators/indicators.model');
var IndexTree = require('../../../ws.repository/indexTree.model');
var IndexDb = require('../../../ws.repository/indexDb.model');

var cache = require('express-redis-cache')();
var compression = require('compression');

var u = require('../../utils');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  /*eslint new-cap:0*/
  var router = express.Router();

  var metadataFile = require('../../../csv_data_mapping_cli/vizabi/metadata.json');

  var mcPrecomputedShapes = require('../../../csv_data_mapping_cli/fixtures/mc_precomputed_shapes.json');
  var world50m = require('../../../csv_data_mapping_cli/fixtures/world-50m.json');

  router.get('/api/vizabi/translation/:lang.json', compression(), u.getCacheConfig('translations'), cache.route(), getTranslations);

  router.get('/api/vizabi/mc_precomputed_shapes.json', compression(), u.getCacheConfig('mc-precomputed-shapes'), cache.route(), function (req, res) {
    return res.json(mcPrecomputedShapes);
  });

  router.get('/api/vizabi/world-50m.json', compression(), u.getCacheConfig('world-50m'), cache.route(), function (req, res) {
    return res.json(world50m);
  });

  router.get('/api/vizabi/metadata.json', compression(), u.getCacheConfig('metadata'), cache.route(), getMetadata);

  router.get('/api/vizabi/geo_properties.csv', compression(), u.getCacheConfig('geo-properties'), cache.route(), adoptGeoProperties);

  return app.use(router);

  function getTranslations(req, res) {
    var lang = (req.params && req.params.lang) || 'en';

    Translations.find({language: lang}, function (err, items) {
      var result = _.reduce(items, function (result, item) {
        result[item.key] = item.value;
        return result;
      }, {});

      return res.json(result);
    });
  }

  function adoptGeoProperties(req, res) {
    geoController.listGeoProperties(function (err, result) {
      if (err) {
        res.status(404).send(err);
      }

      var fields = _.keys(result[0]);

      json2csv({data: result, fields: fields}, function (err, csv) {
        if (err) {
          return console.err(err);
        }

        res.set({
          'Content-Disposition': 'attachment; filename=dont-panic-poverty-geo-properties.csv',
          'Content-type': 'text/csv'
        });
        return res.send(csv);
      });

    });
  }

  function getMetadata(req, res) {
    async.parallel({
      color: function getColors(cb) {
        return cb(null, metadataFile.color);
      },
      indicatorsDB: getIndicatorsDB,
      indicatorsTree: function getIndicatorsTree(cb) {
        IndexTree.findOne({}, {_id: 0, __v: 0}).lean().exec(cb);
      },
      entities: (cb) => {
        return Geo.find({isTerritory: true}, {_id: 0, gid: 1, name: 1})
          .sort('gid')
          .lean()
          .exec((err, geoProps) => {
            if (err) {
              return cb(err);
            }

            var result = _.map(geoProps, prop => {
              return {
                geo: prop.gid,
                name: prop.name
              };
            });

            return cb(null, result);
          });
      }
    }, function (err, metadata) {
      if (err) {
        console.error(err);
      }

      return res.json(metadata);
    });
  }

  function getIndicatorsDB(done) {
    async.waterfall([
      function getIndexDb(cb) {
        IndexDb.find({}, {_id: 0}).lean().exec(function (err, indexDb) {
          var result = _.reduce(indexDb, function (result, item) {
            result[item.name] = item;
            delete item.name;
            return result;
          }, {});

          return cb(err, result);
        });
      }
    ], function (err, indexDb) {
      return done(err, indexDb);
    });
  }
};
