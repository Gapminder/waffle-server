const express = require('express');
const _ = require('lodash');
const json2csv = require('json2csv');
const cors = require('cors');
const async = require('async');
const path = require('path');
const fs = require('fs');

const mongoose = require('mongoose');
const geoController = require('../geo/geo-properties.service');

const Geo = mongoose.model('Geo');
const Translations = mongoose.model('Translations');
const IndexTree = mongoose.model('IndexTree');
const IndexDb = mongoose.model('IndexDb');

const compression = require('compression');

const u = require('../utils');
const config = require('../../ws.config/config');
const cache = require('../../ws.utils/redis-cache');
const constants = require('../../ws.utils/constants');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  /*eslint new-cap:0*/
  var router = express.Router();

  var mcPrecomputedShapes = require('../../csv_data_mapping_cli/fixtures/mc_precomputed_shapes.json');
  var world50m = require('../../csv_data_mapping_cli/fixtures/world-50m.json');

  router.get('/api/vizabi/translation/:lang.json', cors(), compression(), u.getCacheConfig(constants.DDF_REDIS_CACHE_NAME_TRANSLATIONS), cache.route(), getTranslations);
  router.post('/api/vizabi/hack/translation/:lang.json', cors(), updateTranslations);

  router.get('/api/vizabi/mc_precomputed_shapes.json', cors(), compression(), u.getCacheConfig('mc-precomputed-shapes'), cache.route(), function (req, res) {
    return res.json(mcPrecomputedShapes);
  });

  router.get('/api/vizabi/world-50m.json', cors(), compression(), u.getCacheConfig('world-50m'), cache.route(), function (req, res) {
    return res.json(world50m);
  });

  router.get('/api/vizabi/metadata.json', cors(), compression(), u.getCacheConfig(constants.DDF_REDIS_CACHE_NAME_META), cache.route(), getMetadata);
  router.post('/api/vizabi/hack/metadata.json', cors(), updateMetadata);

  router.get('/api/vizabi/geo_properties.csv', cors(), compression(), u.getCacheConfig('geo-properties'), cache.route(), adoptGeoProperties);

  return app.use(router);

  function getTranslations(req, res) {
    const lang = (req.params && req.params.lang) || 'en';
    const translationsPath = path.resolve(__dirname, '../../csv_data_mapping_cli/vizabi/', lang + '.json');

    return fs.readFile(translationsPath, 'utf8', (error, translations) => {
      if (error) {
        return res.json({success: !error, error});
      }

      return res.json(JSON.parse(translations));
    });
  }

  function updateTranslations(req, res) {
    const lang = (req.params && req.params.lang) || 'en';
    const translationsPath = path.resolve(__dirname, '../../csv_data_mapping_cli/vizabi/', lang + '.json');

    return fs.writeFile(translationsPath, JSON.stringify(req.body), error => {
      if (error) {
        return res.json({success: !error, error});
      }

      return cache.del(`${constants.DDF_REDIS_CACHE_NAME_TRANSLATIONS}*`, (cacheError, numEntriesDeleted) => {
        if (cacheError) {
          return res.json({success: !cacheError, error: cacheError});
        }

        return res.json(`Translations were updated and ${numEntriesDeleted} cache entries were deleted`);
      });
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
    return fs.readFile(path.resolve(__dirname, '../../csv_data_mapping_cli/vizabi/metadata.json'), 'utf8', (error, metadata) => {
      if (error) {
        return res.json({success: !error, error});
      }

      return res.json(JSON.parse(metadata));
    });
  }

  function updateMetadata(req, res) {
    return fs.writeFile(path.resolve(__dirname, '../../csv_data_mapping_cli/vizabi/metadata.json'), JSON.stringify(req.body), error => {
      if (error) {
        return res.json({success: !error, error});
      }

      return cache.del(`${constants.DDF_REDIS_CACHE_NAME_META}*`, (cacheError, numEntriesDeleted) => {
        if (cacheError) {
          return res.json({success: !cacheError, error: cacheError});
        }

        return res.json(`Meta was updated and ${numEntriesDeleted} cache entries were deleted`);
      });
    });
  }
};
