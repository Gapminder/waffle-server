'use strict';

var md5 = require('md5');
var queryCoder = require('../ws.utils/query-coder');
var loginPage = '/login';

exports.getCacheConfig = function getCacheConfig(prefix) {
  return function (req, res, next) {
    /*eslint camelcase:0*/
    if (req.query.force === true) {
      res.use_express_redis_cache = false;
      return next();
    }

    var hash = md5(prefix + '-' + req.method + req.url);
    res.express_redis_cache_name = hash;
    next();
  };
};

exports.ensureAuthenticated = function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    if (req.xhr) {
      return res.json({success: false, error: 'You need to be logged in'});
    }

    return res.redirect(loginPage);
  };

exports.decodeQuery = function(req, res, next) {
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
      result.where[key] = decodedParam
    }

    return result;
  }, {where: {}});

  // TODO: refactor it, when geo will be got from neo4j

  // for supporting previous and new api for geo: select && default response header
  req.decodedQuery.select = req.decodedQuery.select || ['geo','geo.name','geo.cat','geo.region'];

  // for supporting previous and new api for geo: geo.cat && :category
  req.decodedQuery.where['geo.cat'] = req.decodedQuery.where['geo.cat'] || ['geo'];

  return next();
};

function normalizeParam(param) {
  return Array.isArray(param) ? param.join() : param;
}

function sanitizeSortValues(sortParam) {
  function isSortValueValid(value) {
    return value === 'asc' || value === 'desc' || value === true
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


