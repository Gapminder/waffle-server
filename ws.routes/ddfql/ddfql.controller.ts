import * as _ from 'lodash';
import * as cors from 'cors';
import * as express from 'express';
import * as routesUtils from '../utils';
import { Application, NextFunction, Response, Request } from 'express';
import * as compression from 'compression';
import { constants } from '../../ws.utils/constants';
import { logger } from '../../ws.config/log';
import * as routeUtils from '../utils';
import { getDDFCsvReaderObject } from 'vizabi-ddfcsv-reader';
import { ServiceLocator } from '../../ws.service-locator/index';
import { defaultRepository } from '../../ws.config/mongoless-repos.config';
import { performance } from 'perf_hooks';
import * as path from 'path';
import * as fs from 'fs';
import { config } from '../../ws.config/config';

function createDdfqlController(serviceLocator: ServiceLocator): Application {
  const app = serviceLocator.getApplication();

  const router = express.Router();

  router.options('/api/ddf/ml-ql', cors({ maxAge: 86400 }));

  router.use(cors());

  router.get('/api/ddf/ml-ql',
    compression(),
    routeUtils.trackingRequestTime,
    routeUtils.bodyFromUrlQuery,
    getMongolessDdfStats
  );

  router.post('/api/ddf/ml-ql',
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
    const repositoryDescriptorPath = path.resolve(config.PATH_TO_DDF_REPOSITORIES, 'repositories-descriptors.json');
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
}

export {
  createDdfqlController
};
