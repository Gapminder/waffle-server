'use strict';

const md5 = require('md5');
const passport = require('passport');
const queryCoder = require('../ws.utils/query-coder');
const loginPage = '/login';

module.exports = {
  getCacheConfig,
  ensureAuthenticated,
  ensureAuthenticatedViaToken,
  decodeQuery
};

function getCacheConfig(prefix) {
  return function (req, res, next) {
    /*eslint camelcase:0*/
    if (req.query.force === 'true') {
      res.use_express_redis_cache = false;
      return next();
    }

    var hash = prefix + '-' + req.method + req.url;
    res.express_redis_cache_name = hash;
    next();
  };
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  if (req.xhr) {
    return res.json({success: false, error: 'You need to be logged in'});
  }

  return res.redirect(loginPage);
}

function ensureAuthenticatedViaToken(env) {
  return (res, req, next) => {
    // FIXME: This solution with disabling auth for local env is a workaround in order to be able to test routes,
    // this will be fixed as soon as user registration is implemented
    if (env === 'local') {
      return next();
    }

    return passport.authenticate('token')(res, req, next);
  };
}

function decodeQuery(req, res, next) {
  req.decodedQuery = Object.keys(req.query).reduce((result, key) => {

    var normalizedParam = normalizeParam(req.query[key]);
    var decodedParam = queryCoder.decodeParam(normalizedParam);

    if (key === 'gapfilling') {
      result[key] = queryCoder.decodeParam(normalizedParam, queryCoder.toObject);
    } else if (key === 'select') {
      result[key] = decodedParam;
    } else if (key === 'sort') {
      let decodedAsObjectParam = queryCoder.decodeParam(normalizedParam, queryCoder.toObject);
      result[key] = sanitizeSortValues(decodedAsObjectParam);
    } else {
      result.where[key] = decodedParam;
    }

    return result;
  }, {where: {}});

  // for supporting previous and new api for geo: select && default response header
  req.decodedQuery.select = req.decodedQuery.select || [];

  return next();
}

function normalizeParam(param) {
  return Array.isArray(param) ? param.join() : param;
}

function sanitizeSortValues(sortParam) {
  function isSortValueValid(value) {
    return value === 'asc' || value === 'desc' || value === true;
  }

  return Object.keys(sortParam).reduce((result, key) => {
    let value = sortParam[key];
    if (isSortValueValid(value)) {
      result[key] = value === true ? 'asc' : value;
      return result;
    }
    return result;
  }, {});
}


