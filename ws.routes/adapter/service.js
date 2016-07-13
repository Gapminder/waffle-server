var express = require('express');
var _ = require('lodash');
var json2csv = require('json2csv');
var cors = require('cors');
var async = require('async');

var mongoose = require('mongoose');
var geoController = require('../geo/geo-properties.service');

var Geo = mongoose.model('Geo');
var Translations = mongoose.model('Translations');
var IndexTree = mongoose.model('IndexTree');
var IndexDb = mongoose.model('IndexDb');

var compression = require('compression');

var u = require('../utils');
const config = require('../../ws.config/config');
const cache = require('../../ws.utils/redis-cache');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  /*eslint new-cap:0*/
  var router = express.Router();

  var mcPrecomputedShapes = require('../../csv_data_mapping_cli/fixtures/mc_precomputed_shapes.json');
  var world50m = require('../../csv_data_mapping_cli/fixtures/world-50m.json');

  /**
   * @swagger
   * /api/vizabi/translation/{lang}.json:
   *   get:
   *    description: Translation file
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: "lang"
   *        in: "path"
   *        required: true
   *        description: specify the language
   *        type: string
   *    tags:
   *      - Translation
   *    responses:
   *      200:
   *        description: Translation file
   *      304:
   *        description: cache
   *      default:
   *        description: Unexpected error
   *        schema:
   *          $ref: '#/definitions/Error'
   *
   *
   */
  router.get('/api/vizabi/translation/:lang.json', cors(), compression(), u.getCacheConfig('translations'), cache.route(), getTranslations);


  /**
   * @swagger
   * /api/vizabi/mc_precomputed_shapes.json:
   *   get:
   *    description: mc_precomputed_shapes for mountain chart
   *    produces:
   *      - application/json
   *    tags:
   *      - McPecomputedShapes
   *    responses:
   *      200:
   *        description: McPecomputedShapes
   *      304:
   *        description: cache
   *      default:
   *        description: Unexpected error
   *        schema:
   *          $ref: '#/definitions/Error'
   *
   *
   */
  router.get('/api/vizabi/mc_precomputed_shapes.json', cors(), compression(), u.getCacheConfig('mc-precomputed-shapes'), cache.route(), function (req, res) {
    return res.json(mcPrecomputedShapes);
  });

  /**
   * @swagger
   * /api/vizabi/world-50m.json:
   *   get:
   *    description: world-50m.json for bubbleMap chart
   *    produces:
   *      - application/json
   *    tags:
   *      - World-50m
   *    responses:
   *      200:
   *        description: world-50m.json
   *      304:
   *        description: cache
   *      default:
   *        description: Unexpected error
   *        schema:
   *          $ref: '#/definitions/Error'
   *
   *
   */
  router.get('/api/vizabi/world-50m.json', cors(), compression(), u.getCacheConfig('world-50m'), cache.route(), function (req, res) {
    return res.json(world50m);
  });

  /**
   * @swagger
   * /api/vizabi/metadata.json:
   *   get:
   *    description: metadata.json for all charts
   *    produces:
   *      - application/json
   *    tags:
   *      - Metadata
   *    responses:
   *      200:
   *        description: metadata.json
   *      304:
   *        description: cache
   *      default:
   *        description: Unexpected error
   *        schema:
   *          $ref: '#/definitions/Error'
   *
   *
   */
  router.get('/api/vizabi/metadata.json', cors(), compression(), u.getCacheConfig('metadata'), cache.route(), getMetadata);

  /**
   * @swagger
   * /api/vizabi/geo_properties.csv:
   *   get:
   *    description: geo_properties.csv
   *    produces:
   *      - text/csv
   *    tags:
   *      - geo_properties
   *    responses:
   *      200:
   *        description: geo_properties.csv
   *      304:
   *        description: cache
   *      default:
   *        description: Unexpected error
   *        schema:
   *          $ref: '#/definitions/Error'
   *
   *
   */
  router.get('/api/vizabi/geo_properties.csv', cors(), compression(), u.getCacheConfig('geo-properties'), cache.route(), adoptGeoProperties);

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
      indicatorsDB: getIndicatorsDB,
      indicatorsTree: function getIndicatorsTree(cb) {
        IndexTree.findOne({}, {_id: 0, __v: 0}).lean().exec(cb);
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
