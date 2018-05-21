import * as _ from 'lodash';
import * as cors from 'cors';
import * as express from 'express';
import * as routesUtils from '../../utils';
import { Application, NextFunction, Response, Request } from 'express';
import * as compression from 'compression';
import { constants } from '../../../ws.utils/constants';
import * as schemaService from '../../../ws.services/schema.service';
import * as entitiesService from '../../../ws.services/entities.service';
import * as conceptsService from '../../../ws.services/concepts.service';
import * as datapointsService from '../../../ws.services/datapoints.service';
import * as dataPostProcessors from '../../data-post-processors';
import { cache, statusCodesExpirationConfig } from '../../../ws.utils/redis-cache';
import { logger } from '../../../ws.config/log';
import * as routeUtils from '../../utils';
import { getDDFCsvReaderObject } from 'vizabi-ddfcsv-reader';
import { ServiceLocator } from '../../../ws.service-locator/index';
import { AsyncResultCallback } from 'async';
import { defaultRepository } from '../../../ws.config/mongoless-repos.config';
import { performance } from 'perf_hooks';
import * as path from 'path';
import * as fs from 'fs';
import { config } from '../../../ws.config/config';

function createDdfqlController(serviceLocator: ServiceLocator): Application {
  const app = serviceLocator.getApplication();

  const router = express.Router();

  router.options('/api/ddf/ql', cors({ maxAge: 86400 }));

  router.use(cors());

  router.get('/api/ddf/ql',
    routeUtils.getCacheConfig(constants.DDF_REDIS_CACHE_NAME_DDFQL),
    cache.route(statusCodesExpirationConfig),
    compression(),
    routeUtils.trackingRequestTime,
    routeUtils.bodyFromUrlQuery,
    routeUtils.checkDatasetAccessibility,
    getDdfStats,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.pack
  );

  router.post('/api/ddf/ql',
    routeUtils.getCacheConfig(constants.DDF_REDIS_CACHE_NAME_DDFQL),
    cache.route(statusCodesExpirationConfig),
    compression(),
    routeUtils.trackingRequestTime,
    routeUtils.checkDatasetAccessibility,
    getDdfStats,
    dataPostProcessors.gapfilling,
    dataPostProcessors.toPrecision,
    dataPostProcessors.pack
  );

  router.get('/api/ddf/ml-ql',
    routeUtils.getCacheConfig(constants.DDF_REDIS_CACHE_NAME_MLQL),
    cache.route(statusCodesExpirationConfig),
    compression(),
    routeUtils.trackingRequestTime,
    routeUtils.bodyFromUrlQuery,
    getMongolessDdfStats
  );

  router.post('/api/ddf/ml-ql',
    routeUtils.getCacheConfig(constants.DDF_REDIS_CACHE_NAME_MLQL),
    cache.route(statusCodesExpirationConfig),
    compression(),
    routeUtils.trackingRequestTime,
    routeUtils.bodyFromUrlQuery,
    getMongolessDdfStats
  );

  const getStackTrace = function (): void {
    let obj = {};
    Error.captureStackTrace(obj, getStackTrace);
    return (obj as any).stack;
  };

  return app.use(router);


  function getMongolessDdfStats(req: any, res: Response): void {
    logger.info({ req }, 'DDFQL URL');
    logger.info({ obj: req.body }, 'DDFQL');

    req.queryStartTime = performance.now();

    const reqBody = _.get(req, 'body', {});
    const datasetParam = _.get(reqBody, 'dataset', config.DEFAULT_DATASET || defaultRepository);
    const [ dataset, branchParam ] = datasetParam.split('#');
    const branch = branchParam || 'master';
    const commit = _.get(reqBody, 'version', config.DEFAULT_DATASET_VERSION || 'HEAD');
    const select = _.get(reqBody, 'select.key', []).concat(_.get(reqBody, 'select.value', []))
    const repositoryDescriptorPath = path.resolve(constants.WORKDIR, 'ws.import', 'repos', 'repositories-descriptors.json');
    let repositoriesDescriptors: object;

    try {
      logger.info('repositoryDescriptorPath', repositoryDescriptorPath);
      logger.info('fsSstatSync:repositoryDescriptorPath', fs.statSync(repositoryDescriptorPath));
      repositoriesDescriptors = JSON.parse(fs.readFileSync(repositoryDescriptorPath, 'utf8'));
    } catch (error) {
      console.trace('I am here');
      logger.error(getStackTrace());
      res.json(routesUtils.toErrorResponse(error, req, 'mongoless'));
      return;
    }

    const repositoriesDescriptor = repositoriesDescriptors[ `${dataset}@${branch}:${commit}` ];
    const reader = getDDFCsvReaderObject();
    const _path = _.get(repositoriesDescriptor, 'path', '');

    if (_path === '' || _.isEmpty(repositoriesDescriptors)) {
      logger.error(repositoriesDescriptors, `${dataset}@${branch}:${commit}`);
    }

    logger.info('repositoryDescriptor', repositoriesDescriptor, `${dataset}@${branch}:${commit}`);

    reader.init({ path: _path });
    reader.read(reqBody).then((data: any[]) => {
      res.set('Content-Type', 'application/json');
      res.write(`{"success":true,"headers":${JSON.stringify(select)},"rows":[`);
      data.map((row: object, index: number) => {
        res.write((index ? ',' : '') + JSON.stringify(select.map((header: string) => row[ header ])));
      });
      res.write(`]}`);
      res.end();
    }).catch((error: any) => {
      logger.error(error);
      res.json(routesUtils.toErrorResponse(error, req, 'mongoless'));
    });
  }

  function getDdfStats(req: any, res: any, next: NextFunction): void {
    logger.info({ req }, 'DDFQL URL');
    logger.info({ obj: req.body }, 'DDFQL');

    req.queryStartTime = performance.now();
    const query = _.get(req, 'body', {});
    const from = _.get(req, 'body.from', null);
    const onEntriesCollected = routeUtils.respondWithRawDdf(req, res, next) as AsyncResultCallback<any, any>;

    if (!from) {
      return onEntriesCollected(`The filed 'from' must present in query.`, null);
    }

    const where = _.get(req, 'body.where', {});
    const language = _.get(req, 'body.language', {});
    const select = _.get(req, 'body.select.value', []);
    const domainGids = _.get(req, 'body.select.key', []);
    const headers = _.union(domainGids, select);
    const sort = _.get(req, 'body.order_by', []);
    const groupBy = _.get(req, 'body.group_by', {});
    const datasetName = _.get(req, 'body.dataset', null);
    const version = _.get(req, 'body.version', null);

    const options = {
      user: req.user,
      from,
      select,
      headers,
      domainGids,
      where,
      sort,
      groupBy,
      datasetName,
      version,
      query,
      language
    };

    req.ddfDataType = from;
    if (from === constants.DATAPOINTS) {
      return datapointsService.collectDatapointsByDdfql(options, onEntriesCollected);
    } else if (from === constants.ENTITIES) {
      return entitiesService.collectEntitiesByDdfql(options, onEntriesCollected);
    } else if (from === constants.CONCEPTS) {
      return conceptsService.collectConceptsByDdfql(options, onEntriesCollected);
    } else if (queryToSchema(from)) {
      req.ddfDataType = constants.SCHEMA;
      const onSchemaEntriesFound = routeUtils.respondWithRawDdf(req, res, next) as AsyncResultCallback<any, any>;
      return schemaService.findSchemaByDdfql(options, onSchemaEntriesFound);
    } else {
      return onEntriesCollected(`Value '${from}' in the 'from' field isn't supported yet.`, null);
    }
  }
}

function queryToSchema(from: any): any {
  return _.endsWith(from, '.schema');
}

export {
  createDdfqlController
};
