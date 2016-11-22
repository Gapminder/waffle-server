'use strict';

const md5 = require('md5');
const passport = require('passport');
const config = require('../ws.config/config');
const logger = require('../ws.config/log');

module.exports = {
  getCacheConfig,
  ensureAuthenticatedViaToken,
  respondWithRawDdf
};

function getCacheConfig(prefix) {
  return function (req, res, next) {
    if (req.query.force === 'true' || req.body.force === true) {
      res.use_express_redis_cache = false;
      return next();
    }

    let reqBody;

    try {
      reqBody = JSON.stringify(req.body);
    } catch (error) {
      return res.json({success: false, error: error});
    }

    res.express_redis_cache_name = `${prefix || 'PREFIX_NOT_SET'}-${req.method}-${req.url}-${md5(reqBody)}`;
    next();
  };
}

function ensureAuthenticatedViaToken(res, req, next) {
  return passport.authenticate('token')(res, req, next);
}

function respondWithRawDdf(req, res, next) {
  return (error, result) => {
    if (error) {
      logger.error(error);
      res.use_express_redis_cache = false;
      return res.json({success: false, error: error});
    }

    req.rawData = {rawDdf: result};

    return next();
  };
}


