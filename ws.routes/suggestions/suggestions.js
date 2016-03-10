'use strict';

let cors = require('cors');
let cache = require('express-redis-cache')();
let express = require('express');
let compression = require('compression');

let u = require('../utils.js');
let suggestionsService = require('./suggestions.service');

module.exports = serviceLocator => {
  let app = serviceLocator.getApplication();
  let router = express.Router();

  router.post('/', (req, res) => {
    console.log(req);
    return suggestionsService.getSuggestionsBasedOn(req.body, (error, suggestions) => {
      if (error) {
        return res.json({success: !error, error: error});
      }

      return res.json({success: error, error: error, data: suggestions});
    });
  });

  let cacheConfig = u.getCacheConfig(req => `suggestions-${req.method}${req.url}${JSON.stringify(req.body)}`);
  app.use('/api/suggestions', cors(), cacheConfig, cache.route(), router);
};
