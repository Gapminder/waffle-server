var express = require('express');
var _ = require('lodash');
var json2csv = require('json2csv');
var cors = require('cors');


var async = require('async');

var geoController = require('../geo/geo-properties.controller');
var mongoose = require('mongoose');

var Geo = mongoose.model('Geo');
var Translations = mongoose.model('Translations');
var IndexTree = mongoose.model('IndexTree');
var IndexDb = mongoose.model('IndexDb');

var cache = require('express-redis-cache')();
var compression = require('compression');

var u = require('../utils');

var gapminderRelatedItems = require('./static-data/gapminder-related-items.json');
var gapminderMenuItems = require('./static-data/gapminder-menu-items.json');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  /*eslint new-cap:0*/
  var router = express.Router();
  var config = app.get('config');

  var metadataFile = require('../../csv_data_mapping_cli/vizabi/metadata.json');

  var mcPrecomputedShapes = require('../../csv_data_mapping_cli/fixtures/mc_precomputed_shapes.json');
  var world50m = require('../../csv_data_mapping_cli/fixtures/world-50m.json');

  //TODO: uncomment caching as soon as this new-import-ddf-gapminder-world-#176 branch is stable
  router.get('/api/vizabi/translation/:lang.json', cors(), compression(), /*u.getCacheConfig('translations'), cache.route(),*/ getTranslations);

  router.get('/api/vizabi/mc_precomputed_shapes.json', cors(), compression(), u.getCacheConfig('mc-precomputed-shapes'), cache.route(), function (req, res) {
    return res.json(mcPrecomputedShapes);
  });

  router.get('/api/vizabi/world-50m.json', cors(), compression(), u.getCacheConfig('world-50m'), cache.route(), function (req, res) {
    return res.json(world50m);
  });

  //TODO: uncomment caching as soon as this new-import-ddf-gapminder-world-#176 branch is stable 
  router.get('/api/vizabi/metadata.json', cors(), compression(), /*u.getCacheConfig('metadata'), cache.route(),*/ getMetadata);

  router.get('/api/vizabi/geo_properties.csv', compression(), u.getCacheConfig('geo-properties'), cache.route(), adoptGeoProperties);

  //TODO: uncomment caching as soon as this new-import-ddf-gapminder-world-#176 branch is stable
  router.get('/api/vizabi/gapminder_tools/related_items/', cors(), compression(), /*u.getCacheConfig('related-items'), cache.route(),*/ getRelatedItems);

  //TODO: uncomment caching as soon as this new-import-ddf-gapminder-world-#176 branch is stable
  router.get('/api/vizabi/gapminder_tools/menu_items/', cors(), compression(), /*u.getCacheConfig('menu-items'), cache.route(),*/ (req, res) => res.json(gapminderMenuItems));

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
        return Geo.find({}, {_id: 0, gid: 1, name: 1})
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

  function getRelatedItems (req, res) {
    _.forEach(gapminderRelatedItems, item => {
      item.opts.data.path = `${config.HOST_URL}:${config.PORT}${item.opts.data.path}`;
    });
    return res.json(gapminderRelatedItems);
  }
};
