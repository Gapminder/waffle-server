const fs = require('fs');
const path = require('path');
const cors = require('cors');
const async = require('async');
const json2csv = require('json2csv');
const express = require('express');
const mongoose = require('mongoose');
const compression = require('compression');

const u = require('../utils');
const cache = require('../../ws.utils/redis-cache');
const config = require('../../ws.config/config');
const constants = require('../../ws.utils/constants');

const pathToVizabiData = '../../ws.import/vizabi/';

module.exports = function (serviceLocator) {
  const app = serviceLocator.getApplication();

  const router = express.Router();

  const mcPrecomputedShapes = require('../../ws.import/fixtures/mc_precomputed_shapes.json');
  const world50m = require('../../ws.import/fixtures/world-50m.json');

  router.get('/api/vizabi/translation/:lang.json',
    cors(),
    compression(),
    u.getCacheConfig(constants.DDF_REDIS_CACHE_NAME_TRANSLATIONS),
    cache.route(),
    getTranslations
  );

  router.post('/api/vizabi/hack/translation/:lang.json',
    cors(),
    updateTranslations
  );

  router.get('/api/vizabi/mc_precomputed_shapes.json',
    cors(),
    compression(),
    u.getCacheConfig('mc-precomputed-shapes'),
    cache.route(),
    (req, res) => res.json(mcPrecomputedShapes)
  );

  router.get('/api/vizabi/world-50m.json',
    cors(),
    compression(),
    u.getCacheConfig('world-50m'),
    cache.route(),
    (req, res) => res.json(world50m)
  );

  router.get('/api/vizabi/metadata.json',
    cors(),
    compression(),
    u.getCacheConfig(constants.DDF_REDIS_CACHE_NAME_META),
    cache.route(),
    getMetadata
  );

  router.post('/api/vizabi/hack/metadata.json',
    cors(),
    updateMetadata
  );

  return app.use(router);

  function getTranslations(req, res) {
    const lang = (req.params && req.params.lang) || 'en';
    const translationsPath = path.resolve(__dirname, pathToVizabiData, lang + '.json');

    return fs.readFile(translationsPath, 'utf8', (error, translations) => {
      if (error) {
        return res.json({success: !error, error});
      }

      return res.json(JSON.parse(translations));
    });
  }

  function updateTranslations(req, res) {
    const lang = (req.params && req.params.lang) || 'en';
    const translationsPath = path.resolve(__dirname, pathToVizabiData, lang + '.json');

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

  function getMetadata(req, res) {
    return fs.readFile(path.resolve(__dirname, pathToVizabiData, 'metadata.json'), 'utf8', (error, metadata) => {
      if (error) {
        return res.json({success: !error, error});
      }

      return res.json(JSON.parse(metadata));
    });
  }

  function updateMetadata(req, res) {
    return fs.writeFile(path.resolve(__dirname, pathToVizabiData, 'metadata.json'), JSON.stringify(req.body), error => {
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
