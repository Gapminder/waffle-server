import * as _ from 'lodash';
import * as async from 'async';
import * as crypto from 'crypto';
import * as url from 'url';
import * as passport from 'passport';
import * as URLON from 'urlon';
import { config } from '../ws.config/config';
import { logger } from '../ws.config/log';
import * as express from 'express';
import * as semver from 'semver';

import { DatasetsRepository } from '../ws.repository/ddf/datasets/datasets.repository';
import { RecentDdfqlQueriesRepository } from '../ws.repository/ddf/recent-ddfql-queries/recent-ddfql-queries.repository';

const parseUrlonAsync: Function = async.asyncify((query: string) => {
  const parsedQuery = URLON.parse(query);

  if (parsedQuery.dataset) {
    parsedQuery.dataset = decodeURIComponent(_.toString(parsedQuery.dataset));
  }

  return parsedQuery;
});

const parseJsonAsync: Function = async.asyncify((query: string) => JSON.parse(decodeURIComponent(query)));

export {
  getCacheConfig,
  ensureAuthenticatedViaToken,
  ensureCliVersion,
  respondWithRawDdf,
  checkDatasetAccessibility,
  bodyFromUrlQuery,
  toDataResponse,
  toErrorResponse,
  toMessageResponse
};

function bodyFromUrlQuery(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const query = _.get(req.query, 'query', null);
  const parser = query
    ? {parse: parseJsonAsync, query, queryType: 'JSON'}
    : {parse: parseUrlonAsync, query: url.parse(req.url).query, queryType: 'URLON'};

  parser.parse(parser.query, (error: any, parsedQuery: any) => {
    logger.info({ddfqlRaw: parser.query});
    if (error) {
      res.json(toErrorResponse('Query was sent in incorrect format'));
    } else {
      req.body = _.extend(parsedQuery, {rawDdfQuery: {queryRaw: parser.query, type: parser.queryType}});
      next();
    }
  });
}

function getCacheConfig(prefix: string): express.Handler {
  return function (req: express.Request, res: express.Response, next: express.NextFunction): void {
    if (String(req.query.force) === 'true' && !config.IS_PRODUCTION) {
      (res as any).use_express_redis_cache = false;
      return next();
    }

    const reqBody = JSON.stringify(req.body);
    const parsedUrl = url.parse(req.url);
    const parsedUrlPathname = _.trimEnd(parsedUrl.pathname, '/');

    const md5 = crypto.createHash('md5').update(parsedUrl.query + reqBody).digest('hex');
    (res as any).express_redis_cache_name = `${prefix || 'PREFIX_NOT_SET'}-${req.method}-${parsedUrlPathname}-${md5}`;
    next();
  };
}

function ensureAuthenticatedViaToken(req: express.Request, res: express.Response, next: express.NextFunction): express.Handler {
  return passport.authenticate('token')(req, res, next);
}

function respondWithRawDdf(query: any, req: express.Request, res: express.Response, next: express.NextFunction): Function {
  return (error: any, result: any) => {
    if (error) {
      logger.error(error);
      (res as any).use_express_redis_cache = false;
      return res.json(toErrorResponse(error));
    }

    _storeWarmUpQueryForDefaultDataset(query);

    (req as any).rawData = {rawDdf: result};

    return next();
  };
}

function _storeWarmUpQueryForDefaultDataset(query: any): void {
  const rawDdfQuery = _.get(query, 'rawDdfQuery', null);

  if (!rawDdfQuery) {
    return;
  }

  if (_.has(query, 'dataset') || _.has(query, 'version') || _.has(query, 'format')) {
    return;
  }

  RecentDdfqlQueriesRepository.create(rawDdfQuery, (error: any) => {
    if (error) {
      logger.debug(error);
    } else {
      logger.debug('Writing query to cache warm up storage', rawDdfQuery.queryRaw);
    }
  });
}

function ensureCliVersion(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const clientWsCliVersion = req.header('X-Gapminder-WSCLI-Version');

  if(!clientWsCliVersion) {
    res.json(toErrorResponse('This url can be accessed only from WS-CLI'));
    return;
  }

  const serverWsCliVersion = config.getWsCliVersionSupported();

  if (!ensureVersionsEquality(clientWsCliVersion, serverWsCliVersion)) {
    const changeCliVersionResponse = toErrorResponse(
      `Please, change your WS-CLI version from ${clientWsCliVersion} to ${serverWsCliVersion}`
    );

    res.json(changeCliVersionResponse);
    return;
  }

  return next();
}

function ensureVersionsEquality(clientVersion: string, serverVersion: string): boolean {
  try {
    return semver.eq(clientVersion, serverVersion);
  } catch (e) {
    return false;
  }
}

function checkDatasetAccessibility(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const datasetName = _.get(req, 'body.dataset', null);
  if (!datasetName) {
    return next();
  }

  return DatasetsRepository.findByName(datasetName, (error: any, dataset: any) => {
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

function _validateDatasetAccessToken(datasetAccessToken: string, providedAccessToken: string): boolean {
  const tokensAreEqual = datasetAccessToken === providedAccessToken;
  const tokensAreNotEmpty = !_.isEmpty(datasetAccessToken) && !_.isEmpty(providedAccessToken);
  return tokensAreNotEmpty && tokensAreEqual;
}

function toErrorResponse(error: any): ErrorResponse {
  logger.error(error);
  return {success: false, error: error.message || error};
}

function toMessageResponse(message: string): MessageResponse {
  return {success: true, message};
}

function toDataResponse(data: any): DataResponse {
  return {success: true, data};
}

interface ErrorResponse {
  success: boolean;
  error: any;
}

interface DataResponse {
  success: boolean;
  data: any;
}

interface MessageResponse {
  success: boolean;
  message: string;
}
