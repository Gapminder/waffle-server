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
import { constants } from '../ws.utils/constants';
import * as path from 'path';

import * as commonService from '../ws.services/common.service';

const RELATIVE_PATH_REGEX = /\/\.+\/?/;

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
  bodyFromUrlAssets,
  toDataResponse,
  toErrorResponse,
  toMessageResponse
};

function bodyFromUrlQuery(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const query = _.get(req.query, 'query', null);
  const parser = query
    ? { parse: parseJsonAsync, query, queryType: 'JSON' }
    : { parse: parseUrlonAsync, query: url.parse(req.url).query, queryType: 'URLON' };

  parser.parse(parser.query, (error: string, parsedQuery: any) => {
    logger.info({ ddfqlRaw: parser.query });
    if (error) {
      res.json(toErrorResponse('Query was sent in incorrect format'));
    } else {
      req.body = _.extend(parsedQuery, { rawDdfQuery: { queryRaw: parser.query, type: parser.queryType } });
      next();
    }
  });
}

function bodyFromUrlAssets(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (!_.startsWith(req.baseUrl, constants.ASSETS_ROUTE_BASE_PATH)) {
    return next();
  }

  const pathnameUrl = _.split(req.originalUrl, constants.ASSETS_ROUTE_BASE_PATH + '/').pop();
  const datasetAssetsPathFromUrl = safeDecodeUriComponent(pathnameUrl);

  if (datasetAssetsPathFromUrl === null) {
    res.status(400).json(toErrorResponse('Malformed url was given'));
    return;
  }

  if (RELATIVE_PATH_REGEX.test(datasetAssetsPathFromUrl)) {
    res.status(400).json(toErrorResponse('You cannot use relative path constraints like "." or ".." in the asset path'));
    return;
  }

  commonService.findDefaultDatasetAndTransaction({}, (error: any, context: any) => {
    const isRequestedDefaultAssets = _.startsWith(req.originalUrl, `${constants.ASSETS_ROUTE_BASE_PATH}/default`);

    if (error && isRequestedDefaultAssets) {
      res.status(500).json(toErrorResponse(`Default dataset couldn't be found`));
      return;
    }

    const {pathname} = url.parse(datasetAssetsPathFromUrl);
    const assetPathDescriptor = getAssetPathDescriptor(
      config.PATH_TO_DDF_REPOSITORIES,
      isRequestedDefaultAssets ? pathname.replace('default/', '') : pathname,
      isRequestedDefaultAssets && _.get(context, 'dataset')
    );

    if (assetPathDescriptor.assetsDir !== constants.ASSETS_EXPECTED_DIR) {
      res.status(403).json(toErrorResponse(`You cannot access directories other than "${constants.ASSETS_EXPECTED_DIR}"`));
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
  const repoDescriptor: {repo: string, branch: string, account: string} = getRepoInfoFromDataset(defaultDataset) || {};
  const defaultRepo = repoDescriptor.repo || '';
  const defaultAccount = repoDescriptor.account || '';
  const defaultBranch = repoDescriptor.branch || '';

  const splittedDatasetAssetPath = datasetAssetPath.split('/');
  const file = splittedDatasetAssetPath.pop();
  const assetsPathFragments = splittedDatasetAssetPath.pop();

  const [account = defaultAccount, repo = defaultRepo, ...splittedBranchName] = splittedDatasetAssetPath;
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

  const [accountAndRepo, branch = 'master'] = _.split(dataset.name, '#');
  const [account, repo] = _.split(accountAndRepo, '/');

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
  return (error: string, result: any) => {
    if (error) {
      logger.error(error);
      (res as any).use_express_redis_cache = false;
      return res.status(500).json(toErrorResponse(error));
    }
    const collectionName = _.get(query, 'from', '');
    const docsAmount = _.get(result, collectionName, []).length;
    _storeWarmUpQueryForDefaultDataset(_.extend({docsAmount}, query));

    (req as any).rawData = { rawDdf: result };

    return next();
  };
}

function _storeWarmUpQueryForDefaultDataset(query: any): void {
  const rawDdfQuery = _.get(query, 'rawDdfQuery', null);
  const docsAmount = _.get(query, 'docsAmount', 0);
  const timeSpentInMillis = Date.now() - _.get(query, 'queryStartTime', 0);

  if (!rawDdfQuery) {
    return;
  }

  if (config.IS_TEST && (_.has(query, 'dataset') || _.has(query, 'version') || _.has(query, 'format'))) {
    return;
  }

  RecentDdfqlQueriesRepository.create(_.extend({timeSpentInMillis, docsAmount}, rawDdfQuery), (error: string) => {
    if (error) {
      logger.debug(error);
    } else {
      logger.debug('Writing query to cache warm up storage', rawDdfQuery.queryRaw);
    }
  });
}

function ensureCliVersion(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const clientWsCliVersion = req.header('X-Gapminder-WSCLI-Version');

  if (!clientWsCliVersion) {
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
    return semver.satisfies(clientVersion, serverVersion);
  } catch (e) {
    return false;
  }
}

function checkDatasetAccessibility(req: express.Request, res: express.Response, next: express.NextFunction): any {
  const datasetName = _.get(req, 'body.dataset', null);
  if (!datasetName) {
    return next();
  }

  return DatasetsRepository.findByName(datasetName, (error: string, dataset: any) => {
    if (error) {
      logger.error(error);
      return res.json({ success: false, error });
    }

    if (!dataset) {
      return res.json({ success: false, message: `Dataset with given name ${datasetName} was not found` });
    }

    if (!dataset.private) {
      return next();
    }

    const providedAccessToken = _.get(req, 'body.dataset_access_token', null);
    if (_validateDatasetAccessToken(dataset.accessToken, providedAccessToken)) {
      return next();
    }

    return res.json({ success: false, error: 'You are not allowed to access data according to given query' });
  });
}

function _validateDatasetAccessToken(datasetAccessToken: string, providedAccessToken: string): boolean {
  const tokensAreEqual = datasetAccessToken === providedAccessToken;
  const tokensAreNotEmpty = !_.isEmpty(datasetAccessToken) && !_.isEmpty(providedAccessToken);
  return tokensAreNotEmpty && tokensAreEqual;
}

function toErrorResponse(error: any): ErrorResponse {
  logger.error(error);
  return { success: false, error: error.message || error };
}

function toMessageResponse(message: string): MessageResponse {
  return { success: true, message };
}

function toDataResponse(data: any): DataResponse {
  return { success: true, data };
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
