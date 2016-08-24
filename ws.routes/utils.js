'use strict';

const md5 = require('md5');
const passport = require('passport');
const queryCoder = require('../ws.utils/query-coder');
const loginPage = '/login';
const config = require('../ws.config/config');

module.exports = {
  getCacheConfig,
  ensureAuthenticated,
  ensureAuthenticatedViaToken,
  decodeQuery
};

function getCacheConfig(prefix) {
  return function (req, res, next) {
    /*eslint camelcase:0*/
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

    var hash = prefix + '-' + req.method + '-' + req.url + '-' + reqBody;
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

function ensureAuthenticatedViaToken(res, req, next) {
  return passport.authenticate('token')(res, req, next);
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
    } else if (key === 'version') {
      // FIXME: version should not be treated as a Number
      // FIXME: should be covered by test
      result.where[key] = [normalizedParam];
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


