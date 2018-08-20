import * as _ from 'lodash';
import * as cors from 'cors';
import * as express from 'express';
import * as routesUtils from '../utils';
import { Application, Response, Request, NextFunction } from 'express';
import * as compression from 'compression';
import { logger } from '../../ws.config/log';
import * as routeUtils from '../utils';
import { getDDFCsvReaderObject } from 'vizabi-ddfcsv-reader';
import { ServiceLocator } from '../../ws.service-locator/index';
import {
  defaultRepository,
  defaultRepositoryBranch, defaultRepositoryCommit,
  repositoryDescriptors
} from '../../ws.config/mongoless-repos.config';
import { performance } from 'perf_hooks';
import * as path from 'path';
import * as fs from 'fs';
import * as NodeRSA from 'node-rsa';
import { spawn } from 'child_process';
import { repositoryDescriptors as repositoryDescriptorsSource } from '../../ws.config/mongoless-repos.config';
import { GitUtils } from './git-utils';
import { toDataResponse, toErrorResponse, WSRequest } from '../utils';

const repositoriesUnderImporting = new Set<string>();
const pk = fs.readFileSync(path.resolve(__dirname, '..', '..', 'ws.config', 'travis.pk'));

let importProcess;
let repositoryStateDescriptors = {};

export function mongolessImport(config: object, repositoryName?: string): void {
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
          logger.info(err, feedback);
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

  if (repositoryName) {
    importProcess.stdin.write(`${repositoryName}\n`);
  } else {
    const repositories = _.keys(repositoryDescriptorsSource);

    for (const repository of repositories) {
      importProcess.stdin.write(`${repository}\n`);
    }
  }
}

function travisHandler(req: WSRequest, res: Response): void {
  const hasError = (msg: string) => {
    res.writeHead(400, {'content-type': 'application/json'});
    res.end(JSON.stringify({error: msg}));
  };
  const repoSlug = req.headers['travis-repo-slug'];
  const sig = req.headers.signature;

  if (!sig) {
    return hasError('No Signature found on request');
  }

  if (!repoSlug) {
    return hasError('No repo found on request');
  }

  const key = new NodeRSA(pk, {signingScheme: 'sha1'});

  if (!key.verify(JSON.parse(req.body.payload), sig, 'base64', 'base64')) {
    return hasError('Signed payload does not match signature');
  }

  let result;

  try {
    result = JSON.parse(req.body.payload);
  } catch (err) {
    return hasError(err.message);
  }

  res.writeHead(200, {'content-type': 'application/json'});
  res.end('{"ok":true}');

  if (result.status === 0) {
    mongolessImport(req.appConfig, `git@github.com:${result.repository.owner_name}/${result.repository.name}.git`);
  }
}

function createDdfqlController(serviceLocator: ServiceLocator): Application {
  const app = serviceLocator.getApplication();
  const config = serviceLocator.get('config');

  const router = express.Router();

  router.options('/ml-ql', cors({maxAge: 86400}));

  router.use(cors());

  router.get('/ql/json',
    compression(),
    routeUtils.trackingRequestTime,
    routeUtils.shareConfigWithRoute.bind(routeUtils, config),
    routeUtils.parseJsonFromUrlQuery,
    getMongolessDdfStats
  );

  router.get('/ql/urlon',
    compression(),
    routeUtils.trackingRequestTime,
    routeUtils.shareConfigWithRoute.bind(routeUtils, config),
    routeUtils.parseUrlonFromUrlQuery,
    getMongolessDdfStats
  );

  router.post('/ql',
    compression(),
    routeUtils.trackingRequestTime,
    routeUtils.shareConfigWithRoute.bind(routeUtils, config),
    getMongolessDdfStats
  );

  router.get('/ml-ql',
    compression(),
    routeUtils.trackingRequestTime,
    routeUtils.shareConfigWithRoute.bind(routeUtils, config),
    routeUtils.bodyFromUrlQuery,
    getMongolessDdfStats
  );

  router.get('/travis', routeUtils.shareConfigWithRoute.bind(routeUtils, config), travisHandler);
  router.post('/travis', routeUtils.shareConfigWithRoute.bind(routeUtils, config), travisHandler);

  router.post('/ml-ql',
    compression(),
    routeUtils.trackingRequestTime,
    routeUtils.shareConfigWithRoute.bind(routeUtils, config),
    // routeUtils.bodyFromUrlQuery,
    getMongolessDdfStats
  );

  router.get('/datasets/status',
    routeUtils.trackingRequestTime,
    routeUtils.shareConfigWithRoute.bind(routeUtils, config),
    (req: any, res: Response) => {
    res.set('Content-Type', 'application/json');
    res.write(JSON.stringify(repositoryStateDescriptors, null, 2));
    res.end();
  });

  router.get('/datasets/setDefault',
    compression(),
    routeUtils.trackingRequestTime,
    routeUtils.shareConfigWithRoute.bind(routeUtils, config),
    setDefaultDataset
  );

  const getStackTrace = function (): void {
    let obj = {};
    Error.captureStackTrace(obj, getStackTrace);
    return (obj as any).stack;
  };

  return app.use('/api/ddf', router);


  function getMongolessDdfStats(req: WSRequest, res: Response): void {
    logger.info({req}, 'DDFQL URL');
    logger.info({obj: req.body}, 'DDFQL');

    (req as any).queryStartTime = performance.now();

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
    const _path = config.PATH_TO_DDF_REPOSITORIES + '/';

    if (_path === '' || _.isEmpty(repositoryStateDescriptors)) {
      logger.error(repositoryStateDescriptors, `${dataset}@${branch}:${commit}`);
    }

    logger.info('repositoryDescriptor', repositoriesDescriptor, `${dataset}@${branch}:${commit}`);

    const datasetsConfig = _.chain(repositoryDescriptors)
      .cloneDeep()
      .mapKeys((value: object, key: string) => {
        return GitUtils.getRepositoryNameByUrl(key);
      })
      .mapValues((datasetConfig: object) => {
        if (_.isEmpty(datasetConfig)) {
          return {master: ['HEAD']};
        }
        return _.mapValues(datasetConfig, (commits: string[]) => _.isEmpty(commits) ? ['HEAD'] : commits);
      })
      .value();

    reader.init({
      path: _path,
      datasetsConfig: Object.assign({
        default: {
          dataset: GitUtils.getRepositoryNameByUrl(defaultRepository),
          branch: defaultRepositoryBranch,
          commit: defaultRepositoryCommit
        }
      }, datasetsConfig)
    });
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

  function setDefaultDataset(req: WSRequest, res: Response, next: NextFunction): Response | void {
    logger.info({query: req.query}, 'SetDefaultDataset');
    const reqBody = _.get(req, 'query', {});
    const datasetParam = _.get(reqBody, 'dataset', null);
    if (_.isEmpty(datasetParam)) {
      return res.json(toErrorResponse('No dataset in query params', req, 'setDefaultDataset'));
    }
    const [dataset, branchParam] = datasetParam.split('#');
    config.DEFAULT_DATASET = _.get(reqBody, 'datasetName', config.DEFAULT_DATASET || defaultRepository);
    config.DEFAULT_DATASET_VERSION = _.get(reqBody, 'version', config.DEFAULT_DATASET_VERSION || 'HEAD');
    const repoName = GitUtils.getRepositoryNameByUrl(dataset);

    if (repositoriesUnderImporting.has(repoName)) {
      res.json(routesUtils.toErrorResponse(`dataset ${dataset} is temporary unavailable due to importing reason`, req, 'mongoless'));

      return next();
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

    return res.json(toDataResponse({dataset}));
  }
}

export {
  createDdfqlController
};
