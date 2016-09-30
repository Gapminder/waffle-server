const _ = require('lodash');
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

const KeyValue = require('mongoose').model('KeyValue');

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
    return KeyValue.findOne({key: lang}).lean().exec((error, keyValue) => {
      return res.json(_.get(keyValue, 'value', enStrings));
    });
  }

  function updateTranslations(req, res) {
    const lang = (req.params && req.params.lang) || 'en';

    return KeyValue.update({key: lang}, {$set: {value: req.body}}, {upsert: true}, error => {
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
