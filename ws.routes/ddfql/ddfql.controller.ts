import * as _ from 'lodash';
import * as cors from 'cors';
import * as express from 'express';
import * as routesUtils from '../utils';
import { Application, Response } from 'express';
import * as compression from 'compression';
import { logger } from '../../ws.config/log';
import * as routeUtils from '../utils';
import { getDDFCsvReaderObject } from 'vizabi-ddfcsv-reader';
import { ServiceLocator } from '../../ws.service-locator/index';
import { defaultRepository } from '../../ws.config/mongoless-repos.config';
import { performance } from 'perf_hooks';
import * as path from 'path';
import { config } from '../../ws.config/config';
import { spawn } from 'child_process';
import { keys } from 'lodash';
import { repositoryDescriptors as repositoryDescriptorsSource } from '../../ws.config/mongoless-repos.config';
import { GitUtils } from './git-utils';

const repositoriesUnderImporting = new Set<string>();

let importProcess;
let repositoryStateDescriptors = {};

export function mongolessImport(): void {
  if (!importProcess) {
    importProcess = spawn('node', [path.resolve(__dirname, 'mongoless-import-processing.js')]);

    importProcess.stdout.on('data', (data: string) => {
      if (!data) {
        return;
      }

      const allFeedback = `${data}`.split('\n');

      for (const feedback of allFeedback) {
        if (!feedback || feedback.indexOf('#') !== 0) {
          logger.info(feedback);

          return;
        }

        let content;

        try {
          content = JSON.parse(feedback.substr(1));
        } catch (err) {
          console.log(err, feedback);
          return;
        }

        switch (content.action) {
          case 'empty-queue':
            importProcess.kill();
            importProcess = null;

            break;
          case 'repository-imported':
            repositoryStateDescriptors = Object.assign({}, repositoryStateDescriptors, content.descriptors);
            logger.info(content.repoName + ' imported');
            repositoriesUnderImporting.delete(content.repoName);

            break;
          case 'repository-is-importing':
            repositoriesUnderImporting.add(content.repoName);

            break;
          default:
            break;
        }
      }
    });

    importProcess.stderr.on('data', (data: string) => logger.info(`${data}`));
  }

  const repositories = keys(repositoryDescriptorsSource);

  for (const repository of repositories) {
    importProcess.stdin.write(repository + '\n');
  }
}

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

  router.get('/api/ddf/ml-ql-status', (req: any, res: Response) => {
    res.set('Content-Type', 'application/json');
    res.write(JSON.stringify(repositoryStateDescriptors, null, 2));
    res.end();
  });

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
    const [dataset, branchParam] = datasetParam.split('#');
    const repoName = GitUtils.getRepositoryNameByUrl(dataset);

    if (repositoriesUnderImporting.has(repoName)) {
      res.json(routesUtils.toErrorResponse(`dataset ${dataset} is temporary unavailable due to importing reason`, req, 'mongoless'));

      return;
    }

    const branch = branchParam || 'master';
    const commit = _.get(reqBody, 'version', config.DEFAULT_DATASET_VERSION || 'HEAD');
    const select = _.get(reqBody, 'select.key', []).concat(_.get(reqBody, 'select.value', []));
    const repositoriesDescriptor = repositoryStateDescriptors[`${dataset}@${branch}:${commit}`];
    const reader = getDDFCsvReaderObject();
    const _path = _.get(repositoriesDescriptor, 'path', '');

    if (_path === '' || _.isEmpty(repositoryStateDescriptors)) {
      logger.error(repositoryStateDescriptors, `${dataset}@${branch}:${commit}`);
    }

    logger.info('repositoryDescriptor', repositoriesDescriptor, `${dataset}@${branch}:${commit}`);

    reader.init({ path: _path });
    reader.read(reqBody).then((data: any[]) => {
      res.set('Content-Type', 'application/json');
      res.write(`{"success":true,"headers":${JSON.stringify(select)},"rows":[`);
      data.map((row: object, index: number) => {
        res.write((index ? ',' : '') + JSON.stringify(select.map((header: string) => row[header])));
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
