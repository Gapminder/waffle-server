'use strict';

const _ = require('lodash');
const md5 = require('md5');
const passport = require('passport');
const config = require('../ws.config/config');
const logger = require('../ws.config/log');

const datasetsRepository = require('../ws.repository/ddf/datasets/datasets.repository');

module.exports = {
  getCacheConfig,
  ensureAuthenticatedViaToken,
  respondWithRawDdf,
  checkDatasetAccessibility
};

function getCacheConfig(prefix) {
  return function (req, res, next) {
    if (String(req.query.force) === 'true') {
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
