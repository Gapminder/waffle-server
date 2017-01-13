import * as _ from 'lodash';
import * as async from 'async';
import * as crypto from 'crypto';
import * as url from 'url';
import * as passport from 'passport';
import * as URLON from 'URLON';
import { config } from '../ws.config/config';
import { logger } from '../ws.config/log';

import { DatasetsRepository } from '../ws.repository/ddf/datasets/datasets.repository';
import { RecentDdfqlQueriesRepository } from '../ws.repository/ddf/recent-ddfql-queries/recent-ddfql-queries.repository';

const parseUrlonAsync = async.asyncify(query => URLON.parse(query));
const parseJsonAsync = async.asyncify(query => JSON.parse(decodeURIComponent(query)));

export {
  getCacheConfig,
  ensureAuthenticatedViaToken,
  respondWithRawDdf,
  checkDatasetAccessibility,
  bodyFromUrlQuery,
  toDataResponse,
  toErrorResponse,
  toMessageResponse
};

function bodyFromUrlQuery(req, res, next) {
  const query = _.get(req.query, 'query', null);
  const parser = query
    ? {parse: parseJsonAsync, query, queryType: 'JSON'}
    : {parse: parseUrlonAsync, query: url.parse(req.url).query, queryType: 'URLON'};

  parser.parse(parser.query, (error, parsedQuery) => {
    logger.info({ddfqlRaw: parser.query});
    if (error) {
      return res.json({success: false, error: 'Query was sent in incorrect format'});
    }

    req.body = _.extend(parsedQuery, {rawDdfQuery: {queryRaw: parser.query, type: parser.queryType}});
    next();
  });
}

function getCacheConfig(prefix) {
  return function (req, res, next) {
    if (String(req.query.force) === 'true' && !config.IS_PRODUCTION) {
      res.use_express_redis_cache = false;
      return next();
    }

    const reqBody = JSON.stringify(req.body);
    const parsedUrl = url.parse(req.url);
    const parsedUrlPathname = _.trimEnd(parsedUrl.pathname, '/');

    const md5 = crypto.createHash('md5').update(parsedUrl.query + reqBody).digest('hex');
    res.express_redis_cache_name = `${prefix || 'PREFIX_NOT_SET'}-${req.method}-${parsedUrlPathname}-${md5}`;
    next();
  };
}

function ensureAuthenticatedViaToken(req, res, next) {
  return passport.authenticate('token')(req, res, next);
}

function respondWithRawDdf(query, req, res, next) {
  return (error, result) => {
    if (error) {
      logger.error(error);
      res.use_express_redis_cache = false;
      return res.json(toErrorResponse(error));
    }

    _storeWarmUpQueryForDefaultDataset(query);

    req.rawData = {rawDdf: result};

    return next();
  };
}

function _storeWarmUpQueryForDefaultDataset(query) {
  const rawDdfQuery = _.get(query, 'rawDdfQuery', null);

  if (!rawDdfQuery) {
    return;
  }

  if (_.has(query, 'dataset') || _.has(query, 'version') || _.has(query, 'format')) {
    return;
  }

  RecentDdfqlQueriesRepository.create(rawDdfQuery, error => {
    if (error) {
      logger.debug(error);
    } else {
      logger.debug('Writing query to cache warm up storage', rawDdfQuery.queryRaw);
    }
  });
}

function checkDatasetAccessibility(req, res, next) {
  const datasetName = _.get(req, 'body.dataset', null);
  if (!datasetName) {
    return next();
  }

  return DatasetsRepository.findByName(datasetName, (error, dataset) => {
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

function toErrorResponse(error) {
  logger.error(error);
  return {success: false, error: error.message || error};
}

function toMessageResponse(message) {
  return {success: true, message};
}

function toDataResponse(data) {
  return {success: true, data};
}
