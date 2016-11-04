const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const async = require('async');
const json2csv = require('json2csv');
const express = require('express');
const compression = require('compression');

const u = require('../utils');
const cache = require('../../ws.utils/redis-cache');
const config = require('../../ws.config/config');
const constants = require('../../ws.utils/constants');

const keyValueRepository = require('../../ws.repository/ddf/key-value/key-value.repository');

module.exports = function (serviceLocator) {
  const app = serviceLocator.getApplication();

  const router = express.Router();

  const mcPrecomputedShapes = require('./fixtures/mc_precomputed_shapes.json');
  const world50m = require('./fixtures/world-50m.json');
  const enStrings = require('./fixtures/en.json');

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

  return app.use(router);

  function getTranslations(req, res) {
    const lang = (req.params && req.params.lang) || 'en';
    return keyValueRepository.get(lang, enStrings, (error, value) => res.json(value));
  }

  function updateTranslations(req, res) {
    const lang = (req.params && req.params.lang) || 'en';

    return keyValueRepository.set(lang, req.body, error => {
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
};
