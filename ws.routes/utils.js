'use strict';

const _ = require('lodash');
const async = require('async');
const md5 = require('md5');
const url = require('url');
const passport = require('passport');
const URLON = require('URLON');
const config = require('../ws.config/config');
const logger = require('../ws.config/log');

const datasetsRepository = require('../ws.repository/ddf/datasets/datasets.repository');

const parseUrlonAsync = async.asyncify(query => URLON.parse(query));
const parseJsonAsync = async.asyncify(query => JSON.parse(decodeURIComponent(query)));

module.exports = {
  getCacheConfig,
  ensureAuthenticatedViaToken,
  respondWithRawDdf,
  checkDatasetAccessibility,
  bodyFromUrlQuery
};

function bodyFromUrlQuery(req, res, next) {
  const query = _.get(req.query, 'query', null);
  const parser = query
    ? {parse: parseJsonAsync, query}
    : {parse: parseUrlonAsync, query: url.parse(req.url).query};

  parser.parse(parser.query, (error, parsedQuery) => {
    logger.debug({obj: parsedQuery}, 'DDFQL: ddfql parsed from url query');

    if (error) {
      return res.json({success: false, error: 'Query was sent in incorrect format'});
    }
    req.body = parsedQuery;
    next();
  });
}

function getCacheConfig(prefix) {
  return function (req, res, next) {
    if (String(req.query.force) === 'true') {
      res.use_express_redis_cache = false;
      return next();
    }

    const reqBody = JSON.stringify(req.body);
    const parsedUrl = url.parse(req.url);

    res.express_redis_cache_name = `${prefix || 'PREFIX_NOT_SET'}-${req.method}-${parsedUrl.pathname}-${md5(parsedUrl.query + reqBody)}`;
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

function checkDatasetAccessibility(req, res, next) {
  const datasetName = _.get(req, 'body.dataset', null);
  if (!datasetName) {
    return next();
  }

  return datasetsRepository.findByName(datasetName, (error, dataset) => {
    if (error) {
      logger.error(error);
      return res.json({success: false, error});
    }

    if (!dataset) {
      return res.json({success: false, message: `Dataset with given name ${datasetName} was not found`});
    }

    if (!dataset.private) {
      return next();
    }

    const providedAccessToken = _.get(req, 'body.dataset_access_token', null);
    if (_validateDatasetAccessToken(dataset.accessToken, providedAccessToken)) {
      return next();
    }

    return res.json({success: false, error: 'You are not allowed to access data according to given query'});
  });
}

function _validateDatasetAccessToken(datasetAccessToken, providedAccessToken) {
  const tokensAreEqual = datasetAccessToken === providedAccessToken;
  const tokensAreNotEmpty = !_.isEmpty(datasetAccessToken) && !_.isEmpty(providedAccessToken);
  return tokensAreNotEmpty && tokensAreEqual;
}
