import * as _ from 'lodash';
import * as cors from 'cors';
import * as express from 'express';
import * as routesUtils from '../utils';
import { Application, Response, Request, NextFunction } from 'express';
import * as compression from 'compression';
import { logger } from '../../ws.config/log';
import * as routeUtils from '../utils';
import { getGcpFileReaderObject } from 'vizabi-ddfcsv-reader';
import { ServiceLocator } from '../../ws.service-locator/index';
import { performance } from 'perf_hooks';
import * as path from 'path';
import * as fs from 'fs';
import * as NodeRSA from 'node-rsa';
import { spawn } from 'child_process';
import { toDataResponse, toErrorResponse, WSRequest } from '../utils';
import { config } from '../../ws.config/config';
import { loadRepositoriesConfig } from '../../ws.config/repos.config';

const repositoriesUnderImporting = new Set<string>();
const pk = fs.readFileSync(config.PATH_TO_TRAVIS_KEY);

let importProcess;
let repositoryStateDescriptors = {};

export async function mongolessImport(importConfig: object, repositoryName?: string): Promise<void> {
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

    importProcess.stderr.on('data', (data: string) => logger.error(`${data}`));
  }

  if (repositoryName) {
    importProcess.stdin.write(`${repositoryName}\n`);
  } else {
    const {repositoryDescriptors} = await loadRepositoriesConfig();
    const repositories = _.keys(repositoryDescriptors);

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
  const appConfig = serviceLocator.get('config');

  const router = express.Router();

  router.options('/ml-ql', cors({maxAge: 86400}));
  router.options('/ql', cors({maxAge: 86400}));

  router.use(cors());

  router.get('/ql',
    compression(),
    routeUtils.trackingRequestTime,
    routeUtils.shareConfigWithRoute.bind(routeUtils, appConfig),
    routeUtils.parseQueryFromUrlQuery,
    routeUtils.validateBodyStructure,
    routeUtils.parseDatasetVersion,
    getMongolessDdfStats
  );

  router.post('/ql',
    compression(),
    routeUtils.trackingRequestTime,
    routeUtils.shareConfigWithRoute.bind(routeUtils, appConfig),
    routeUtils.validateBodyStructure,
    routeUtils.parseDatasetVersion,
    getMongolessDdfStats
  );

  router.get('/ml-ql',
    compression(),
    routeUtils.trackingRequestTime,
    routeUtils.shareConfigWithRoute.bind(routeUtils, appConfig),
    routeUtils.bodyFromUrlQuery,
    getMongolessDdfStats
  );

  router.get('/travis', routeUtils.shareConfigWithRoute.bind(routeUtils, appConfig), travisHandler);
  router.post('/travis', routeUtils.shareConfigWithRoute.bind(routeUtils, appConfig), travisHandler);

  router.post('/ml-ql',
    compression(),
    routeUtils.trackingRequestTime,
    routeUtils.shareConfigWithRoute.bind(routeUtils, appConfig),
    // routeUtils.bodyFromUrlQuery,
    getMongolessDdfStats
  );

  router.get('/datasets/status',
    routeUtils.trackingRequestTime,
    routeUtils.shareConfigWithRoute.bind(routeUtils, appConfig),
    (req: any, res: Response) => {
      res.set('Content-Type', 'application/json');
      res.write(JSON.stringify(repositoryStateDescriptors, null, 2));
      res.end();
    });

  router.get('/datasets/setDefault',
    compression(),
    routeUtils.trackingRequestTime,
    routeUtils.shareConfigWithRoute.bind(routeUtils, appConfig),
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

    req.queryStartTime = performance.now();

    const query = _.get(req, 'body', {});
    const reader = getGcpFileReaderObject();
    const select = _.get(query, 'select.key', []).concat(_.get(query, 'select.value', []));
    const headersStr = JSON.stringify(select);
    const queryStr = JSON.stringify(query);

    reader.init({
      path: query.repositoryPath
    });
    reader.read(query).then((data: any[]) => {
      const requestTime = performance.now() - req.requestStartTime;
      const queryTime = performance.now() - req.queryStartTime;
      res.set('Content-Type', 'application/json');
      res.write(`{"success":true,"requestTime":${requestTime},"queryTime":${queryTime},"query":${queryStr},"headers":${headersStr},"rows":[`);
      data.map((row: object, index: number) => {
        res.write((index ? ',' : '') + JSON.stringify(select.map((header: string) => row[header])));
      });
      res.write(`]}`);
      res.end();
    }).catch((error: any) => {
      logger.error(error);
      return res.json(routesUtils.toErrorResponse(error, req, 'vizabi-ddfcsv-reader'));
    });
  }

  function setDefaultDataset(req: WSRequest, res: Response, next: NextFunction): Response | void {
    logger.info({query: req.query}, 'SetDefaultDataset');
    const reqBody = _.get(req, 'query', {});

    return res.json(toDataResponse({repository: reqBody.repository}));
  }
}

export {
  createDdfqlController
};
