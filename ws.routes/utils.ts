import * as _ from 'lodash';
import * as async from 'async';
import * as crypto from 'crypto';
import * as url from 'url';
import * as URLON from 'urlon';
import { logger } from '../ws.config/log';
import * as express from 'express';
import { constants, responseMessages } from '../ws.utils/constants';
import * as path from 'path';

import * as commonService from '../ws.services/common.service';
import {
  DatasetsFileds,
  FailedResponse,
  RequestTags,
  ResponseTags,
  TelegrafService
} from '../ws.services/telegraf.service';

const {
  performance
} = require('perf_hooks');

const RELATIVE_PATH_REGEX = /\/\.+\/?/;

const UrlonParserAsync: Function = async.asyncify((query: string) => {
  const parsedQuery = URLON.parse(query);

  if (parsedQuery.dataset) {
    parsedQuery.dataset = decodeURIComponent(_.toString(parsedQuery.dataset));
  }

  if (parsedQuery.branch) {
    parsedQuery.branch = decodeURIComponent(_.toString(parsedQuery.branch));
  }

  return parsedQuery;
});

const JsonParserAsync: Function = async.asyncify((query: string) => JSON.parse(decodeURIComponent(query)));


const parser = {
  urlon: UrlonParserAsync,
  json: JsonParserAsync
};

export {
  getCacheConfig,
  respondWithRawDdf,
  trackingRequestTime,
  shareConfigWithRoute,
  bodyFromUrlQuery,
  parseQueryFromUrlQuery,
  bodyFromUrlAssets,
  toDataResponse,
  toErrorResponse,
  toMessageResponse
};

export interface WSRequest extends express.Request {
  requestStartTime: number;
  appConfig?: object;
  queryParser: {
    query: string;
    queryType: string;
    parse: Function;
  };
}

function trackingRequestTime(req: WSRequest, res: express.Response, next: express.NextFunction): void {
  req.requestStartTime = performance.now();
  return next();
}

function shareConfigWithRoute(config: object, req: WSRequest, res: express.Response, next: express.NextFunction): void {
  req.appConfig = config;
  return next();
}

function parseJsonFromUrlQuery(req: WSRequest, res: express.Response, next: express.NextFunction): void {
}

function parseQueryFromUrlQuery(req: WSRequest, res: express.Response, next: express.NextFunction): void {
  const parsedUrl = url.parse(req.url);
  const query: string = _.isString(parsedUrl) ? parsedUrl : _.get(parsedUrl, 'query');
  let queryType = 'json';

  try {
    JSON.parse(query);
  } catch (error) {
    queryType = 'urlon';
  }

  parser[queryType](query, (error: string, parsedQuery: any) => {
    logger.info({ ddfqlRaw: parsedUrl, queryType });

    if (error) {
      res.json(toErrorResponse(`${responseMessages.INCORRECT_QUERY_FORMAT}: ${error}`, req, 'bodyFromUrlQuery'));
    } else {
      req.body = parsedQuery;
      return next();
    }
  });
}

function bodyFromUrlQuery(req: WSRequest, res: express.Response, next: express.NextFunction): void {
  const query = _.get(req.query, 'query', null);
  const queryType = query ? 'JSON' : 'URLON';
  req.queryParser = query
    ? { parse: JsonParserAsync, query, queryType }
    : { parse: UrlonParserAsync, query: url.parse(req.url).query, queryType };

  req.queryParser.parse(req.queryParser.query, (error: string, parsedQuery: any) => {
    logger.info({ ddfqlRaw: req.queryParser.query });
    if (error) {
      res.json(toErrorResponse(responseMessages.INCORRECT_QUERY_FORMAT, req, 'bodyFromUrlQuery'));
    } else {
      req.body = parsedQuery;
      return next();
    }
  });
}

function bodyFromUrlAssets(req: WSRequest, res: express.Response, next: express.NextFunction): void {
  if (!_.startsWith(req.baseUrl, constants.ASSETS_ROUTE_BASE_PATH)) {
    return next();
  }

  const pathnameUrl = _.split(req.originalUrl, constants.ASSETS_ROUTE_BASE_PATH + '/').pop();
  const datasetAssetsPathFromUrl = safeDecodeUriComponent(pathnameUrl);

  if (datasetAssetsPathFromUrl === null) {
    res.status(200).json(toErrorResponse(responseMessages.MALFORMED_URL, req));
    return;
  }

  if (RELATIVE_PATH_REGEX.test(datasetAssetsPathFromUrl)) {
    res.status(200).json(toErrorResponse(responseMessages.RELATIVE_ASSET_PATH, req));
    return;
  }

  commonService.findDefaultDatasetAndTransaction({appConfig: req.appConfig}, (error: any, context: any) => {
    if (error) {
      res.status(200).json(toErrorResponse(responseMessages.DATASET_NOT_FOUND, req));
      return;
    }

    const { pathname } = url.parse(datasetAssetsPathFromUrl);
    const isRequestedDefaultAssets = _.startsWith(req.originalUrl, `${constants.ASSETS_ROUTE_BASE_PATH}/default`);
    const assetPathDescriptor = getAssetPathDescriptor(
      (req.appConfig as any).PATH_TO_DDF_REPOSITORIES,
      isRequestedDefaultAssets ? pathname.replace('default', context.dataset) : pathname,
      isRequestedDefaultAssets && _.get(context, 'dataset')
    );

    if (assetPathDescriptor.assetsDir !== constants.ASSETS_EXPECTED_DIR) {
      res.status(200).json(toErrorResponse(responseMessages.WRONG_ASSETS_DIR(constants.ASSETS_EXPECTED_DIR), req));
      return;
    }

    _.extend(req.body, {
      dataset: assetPathDescriptor.dataset,
      dataset_access_token: _.get(req.query, 'dataset_access_token'),
      assetPathDescriptor
    });

    return next();
  });
}

function getAssetPathDescriptor(pathToDdfRepos: string, datasetAssetPath: string, defaultDataset?: any): any {
  const repoDescriptor: { repo: string, branch: string, account: string } = getRepoInfoFromDataset(defaultDataset) || {};
  const defaultRepo = repoDescriptor.repo || '';
  const defaultAccount = repoDescriptor.account || '';
  const defaultBranch = repoDescriptor.branch || '';

  const splittedDatasetAssetPath = datasetAssetPath.split('/');
  const file = splittedDatasetAssetPath.pop();
  const assetsPathFragments = splittedDatasetAssetPath.pop();

  const [ account = defaultAccount, repo = defaultRepo, ...splittedBranchName ] = splittedDatasetAssetPath;
  const branch = splittedBranchName.join('/') || defaultBranch;

  return {
    path: path.resolve(pathToDdfRepos, account, repo, branch, assetsPathFragments, file),
    assetsDir: assetsPathFragments,
    assetName: file,
    dataset: `${account}/${repo}#${branch}`
  };
}

function getRepoInfoFromDataset(dataset: any): any {
  if (!dataset) {
    return null;
  }

  const [ accountAndRepo, branch = 'master' ] = _.split(dataset.name, '#');
  const [ account, repo ] = _.split(accountAndRepo, '/');

  return {
    account,
    repo,
    branch
  };
}

function safeDecodeUriComponent(uri: string): string {
  try {
    return decodeURIComponent(uri);
  } catch (e) {
    return null;
  }
}

function getCacheConfig(prefix?: string): express.Handler {
  return function (req: WSRequest, res: express.Response, next: express.NextFunction): void {
    if (String(req.query.force) === 'true' && !(req.appConfig as any).IS_PRODUCTION) {
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

function respondWithRawDdf(req: WSRequest, res: express.Response, next: express.NextFunction): Function {
  return (error: string, result: any) => {
    if (error) {
      logger.error(error);
      (res as any).use_express_redis_cache = false;
      return res.status(200).json(toErrorResponse(error, req));
    }

    const collectionName = _.get(req.body, 'from', '');
    const docsAmount = _.get(result, collectionName, []).length;

    (req as any).rawData = { rawDdf: result };

    return next();
  };
}

function isResponseString(response: string | Error | FailedResponse): response is string {
  return typeof response === 'string';
}

function isResponseError(response: string | Error | FailedResponse): response is Error {
  return response instanceof Error;
}

// TODO: remove default value for place variable and fix all usages
function toErrorResponse(response: FailedResponse | Error | string, context: RequestTags, place: string = 'default'): ErrorResponse {
  let error: FailedResponse;

  switch (true) {
    case isResponseString(response):
      error = { message: response as string, code: 999, type: 'INTERNAL_SERVER_TEXT_ERROR', place };
      break;
    case isResponseError(response):
      error = { message: (response as Error).message, code: 998, type: 'INTERNAL_SERVER_ERROR', place };
      break;
    default:
      error = _.extend({ place }, response as FailedResponse);
      break;
  }

  TelegrafService.onFailedRespond(error, context);
  logger.error(error);
  return { success: false, error: error.message };
}

function toMessageResponse(message: string): MessageResponse {
  return { success: true, message };
}

function toDataResponse(data: any): DataResponse {
  return { success: true, data };
}

interface ErrorResponse {
  success: boolean;
  error: string;
}

interface DataResponse {
  success: boolean;
  data: any;
}

interface MessageResponse {
  success: boolean;
  message: string;
}
