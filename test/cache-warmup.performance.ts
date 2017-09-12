import 'mongoose';
import '../ws.repository';

import * as async from 'async';
import * as _ from 'lodash';
import * as fetch from 'node-fetch';
import * as shell from 'shelljs';
import { logger } from '../ws.config/log';
import { cleanDdfRedisCache } from '../ws.services/cli.service';
import { getCommitsByGithubUrl, runDatasetImport, setDefaultCommit as _setDefaultCommit } from './cli.utils';
import { e2eEnv } from './e2e.env';
import { startWaffleServer as _startWaffleServer, stopWaffleServer as _stopWaffleServer } from './e2e.utils';

const repos = [
  { url: 'git@github.com:VS-work/ddf--ws-testing.git' },
  { url: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git#develop' },
  // { url: 'git@github.com:open-numbers/ddf--gapminder--population.git#develop' }
];

const externalContext = {
  repos,
  // defaultDatasetName: 'VS-work/ddf--ws-testing',
  // defaultDatasetPath: 'git@github.com:VS-work/ddf--ws-testing.git',
  defaultDatasetName: 'open-numbers/ddf--gapminder--systema_globalis#develop',
  defaultDatasetPath: 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git#develop',
  startBranchName: 'development'
};

shell.exec(`node -v`, (code: number, stdout: string, stderr: string) => {
  logger.info(code, stdout, stderr);
});

getCurrentBranchName(externalContext, (error: string, _context: any) => {
  // _context.startBranchName = _context.currentBranchName;
  if (error) {
    logger.error(error);
    process.exit(2);
  }

  async.waterfall([
    async.constant(_context),
    cleanCache,
    checkoutOnDevelopmentBranch,
    startWaffleServer,
    recognizeLastCommitForEachRepos,
    runImportsOfAllRepos,
    setDefaultDataset,
    waitForCacheWarmup,
    async.apply(getAllRecentQueriesResults, _context.startBranchName),
    stopWaffleServer,
    cleanCache,
    checkoutOnCurrentBranch,
    recognizeLastCommitForEachRepos,
    startWaffleServer,
    runImportsOfAllRepos,
    setDefaultDataset,
    waitForCacheWarmup,
    async.apply(getAllRecentQueriesResults, _context.currentBranchName),
    stopWaffleServer,
    cleanCache,
    findDifferenceBetweenStartAndCurrentVersion
  ], (_error: string, results: any) => {
    if (_error) {
      logger.error(_error);

      return checkoutOnCurrentBranch(_context, (__error: string) => {
        if (__error) {
          logger.error(__error);
        }

        process.exit(1);
      });
    }

    const queriesAmount = _.get(results, results.startBranchName, []).length;

    if (_.isEmpty(results.foundAggravations)) {
      logger.info('No aggravations were found');
    } else {
      const aggravationsAmount = _.get(results, 'foundAggravations', []).length;
      const groupedAggravations = _.groupBy(_.get(results, 'foundAggravations', []), 'message');

      logger.warn(`Counted ${aggravationsAmount} aggravations of ${queriesAmount} queries`);

      _.forIn(groupedAggravations, (aggravations: any[], message: string) => {
        const smallQueries = _.filter(aggravations, (item: any) => _.get(item, 'newQuery.timeSpentInMillis', 0) < 1000 && _.get(item, 'query.timeSpentInMillis', 0) < 1000);

        logger.warn(`Amount of aggravations for message '${message}': `, aggravations.length);
        logger.warn(`Counted ${smallQueries.length} small queries of ${aggravations.length} aggravations for message '${message}'`);

        logger.warn(message, _.map(aggravations, (aggravation: any) => _.omit(aggravation, ['message', 'newQuery', 'query'])));
      });
    }

    if (_.isEmpty(results.foundImprovements)) {
      logger.warn('No improvements were found');
    } else {
      const improvementsAmount = results.foundImprovements.length;
      const smallQueries = _.filter(results.foundImprovements, (item: any) => _.get(item, 'newQuery.timeSpentInMillis', 0) < 1000 && _.get(item, 'query.timeSpentInMillis', 0) < 1000);
      logger.info(`Counted ${improvementsAmount} improvements of ${queriesAmount} queries`);
      logger.info(`Counted ${smallQueries.length} small queries of ${improvementsAmount} improvements`);
    }

    logger.info('Job is done successfully');
    process.exit(0);
  });
});

function cleanCache(context: any, done: Function): void {
  cleanDdfRedisCache((error: string) => {
    if (error) {
      return done(error);
    }

    return done(null, context);
  });
}

function recognizeLastCommitForEachRepos(context: any, done: Function): void {
  async.eachSeries(context.repos, (repo: any, _done: Function) => {
    getCommitsByGithubUrl(repo.url, (error: string, commitsList: any[]) => {
      if (error) {
        return _done(error);
      }

      repo.commitIndexToStartImport = commitsList.length - 1;
      repo.commitHashToSetDefaultVersion = commitsList[repo.commitIndexToStartImport];

      return _done(null, repo);
    });
  }, (error: string) => done(error, context));
}

function waitForDefaultUser(counter: number, done: Function): void {
  fetch(`http://${e2eEnv.wsHost}:${e2eEnv.wsPort}/api/ddf/cli/authenticate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: e2eEnv.login, password: e2eEnv.pass })
  }).then((response: any) => {
    return response.json();
  }).then((response: any) => {
    if (!response.success) {
      logger.warn(response.error);
    }

    if (response.success) {
      logger.info(response, 'Connect to WS successfully');
      return done(null, response.data);
    }

    if (counter > 10000) {
      return done('TIMEOUT');
    }

    setTimeout(() => {
      counter += 2000;
      waitForDefaultUser(counter, done);
    }, 2000);
  }).catch((error: any) => {
    if (error) {
      logger.warn(error);
    }

    if (counter > 10000) {
      return done('TIMEOUT');
    }

    setTimeout(() => {
      counter += 2000;
      waitForDefaultUser(counter, done);
    }, 2000);
  });
}

function setDefaultDataset(context: any, done: Function): void {
  const defaultRepo = _.find(context.repos, { url: context.defaultDatasetPath });
  const defaultCommit = _.get(defaultRepo, 'commitHashToSetDefaultVersion', 'HEAD');

  return _setDefaultCommit(defaultCommit, { repo: context.defaultDatasetPath }, (error: string) => {
    if (error) {
      return done(error);
    }

    logger.info({ datasetName: context.defaultDatasetName, commit: defaultCommit }, 'Set Default dataset');

    return done(null, context);
  });
}

function startWaffleServer(context: any, done: Function): void {
  async.series([
    _startWaffleServer,
    (_done: Function) => waitForDefaultUser(0, (error: string, result: any) => {
      if (error) {
        return _done(error);
      }

      context.token = result.token;

      return _done();
    })
  ], (error: string) => done(error, context));
}

function runImportsOfAllRepos(context: any, done: Function): void {
  runDatasetImport(context, (error: string) => {
    return done(error, context);
  });
}

function waitForCacheWarmup(context: any, done: Function): void {
  const lastResponseSize = 0;
  const startRequestsCounter = 0;
  const {token} = context;
  const options = {counter: startRequestsCounter, lastResponseSize, token};

  _waitForCacheWarmup(options, (error: string, warmedQueriesAmount: number) => {
    if (error) {
      return done(error);
    }

    if (warmedQueriesAmount) {
      logger.info(`Cache is warm. Amount of warmed queries: ${warmedQueriesAmount}`);
    } else {
      logger.warn(`There are no queries to warm up cache OR queries were executed with no success`);
    }

    return done(null, context);
  });
}

function _waitForCacheWarmup( options: any, done: Function): void {
  let {counter, lastResponseSize, token} = options;
  const limit = 3600000;
  const step = 60000;

  // const limit = 60000;
  // const step = 2000;

  fetch(`http://${e2eEnv.wsHost}:${e2eEnv.wsPort}/api/ddf/cli/recentQueries/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  }).then((response: any) => {
    return response.json();
  }).then((response: any) => {
    if (!response.success) {
      logger.warn(response.error);
    }

    if (response.success && _.size(response.data) === lastResponseSize) {
      logger.info(response, 'Connect to WS successfully');
      return done(null, _.size(response.data));
    }

    if (response.success) {
      lastResponseSize = _.size(response.data);
    }

    if (counter > limit) {
      return done('TIMEOUT');
    }

    setTimeout(() => {
      counter += step;
      _waitForCacheWarmup({counter, lastResponseSize}, done);
    }, step);
  }).catch((error: any) => {
    if (error) {
      logger.warn(error);
    }

    if (counter > limit) {
      return done('TIMEOUT');
    }

    setTimeout(() => {
      counter += step;
      _waitForCacheWarmup({counter, lastResponseSize}, done);
    }, step);
  });
}

function stopWaffleServer(context: any, done: Function): void {
  _stopWaffleServer((_error: string) => {
    if (_error) {
      return done(_error);
    }

    return done(null, context);
  });
}

function getCurrentBranchName(context: any, done: Function): void {
  shell.exec(`git symbolic-ref --short HEAD`, (code: number, stdout: string, stderr: string) => {
    if (code > 0) {
      logger.error(code, stdout.trim(), stderr);
      return done(stderr);
    }

    context.currentBranchName = stdout.trim();

    return done(null, context);
  });

}

function checkoutOnDevelopmentBranch(context: any, done: Function): void {
  shell.exec(`git checkout ${context.startBranchName}`, (code: number, stdout: string, stderr: string) => {
    if (code > 0) {
      logger.error(code, stdout, stderr);
      return done(stderr);
    }

    return done(null, context);
  });
}

function checkoutOnCurrentBranch(context: any, done: Function): void {
  shell.exec(`git checkout ${context.currentBranchName}`, (code: number, stdout: string, stderr: string) => {
    if (code > 0) {
      logger.error(code, stdout, stderr);
      return done(stderr);
    }

    return done(null, context);
  });
}

function getAllRecentQueriesResults(branch: string, context: any, done: Function): void {
  fetch(`http://${e2eEnv.wsHost}:${e2eEnv.wsPort}/api/ddf/cli/recentQueries/status`, { method: 'GET' })
    .then((response: any) => {
      return response.json();
    })
    .then((parsedResponse: any) => {
      if (!parsedResponse.success) {
        logger.error(parsedResponse);
        return done(parsedResponse.error);
      }

      logger.info(`Response data length with all results of recent queries for ${branch} branch: `, parsedResponse.data.length);

      context[branch] = parsedResponse.data;

      return done(null, context);

    })
    .catch((error: string) => {
      return done(error);
    });
}

function findDifferenceBetweenStartAndCurrentVersion(context: any, done: Function): void {
  const newResults = _.keyBy(_.get(context, context.currentBranchName, []), 'queryRaw');
  const oldResults = _.get(context, context.startBranchName, []);
  context.foundAggravations = [];
  context.foundImprovements = [];

  // logger.info(newResults);
  // logger.info(oldResults);

  oldResults.map((query: any) => {
    const newQuery: any = newResults[query.queryRaw];

    if (!newQuery) {
      context.foundAggravations.push({ newResults, query, message: 'Query raw wasn\'t found in new branch' });
      return;
    }

    logger.info(query.queryRaw, `docsAmount: ${query.docsAmount} === ${newQuery.docsAmount}`, `timeSpentInMillis: ${query.timeSpentInMillis * 1.2} > ${newQuery.timeSpentInMillis}`);

    if (query.docsAmount !== newQuery.docsAmount) {
      context.foundAggravations.push(createDifferenceDescriptor(query, newQuery, 'Documents amount aren\'t equal between new and old query'));
    }

    if (query.timeSpentInMillis * 1.2 < newQuery.timeSpentInMillis) {
      context.foundAggravations.push(createDifferenceDescriptor(query, newQuery, 'Too bad! Spent much more time than expected!'));
    }

    if (query.timeSpentInMillis * 0.85 > newQuery.timeSpentInMillis) {
      context.foundImprovements.push(createDifferenceDescriptor(query, newQuery, 'Good job!!!'));
    }
  });

  async.setImmediate(() => done(null, context));
}

function createDifferenceDescriptor(query: any, newQuery: any, message: string): any {
  return {
    queryRaw: query.queryRaw,
    type: query.type,
    query,
    newQuery,
    difference: {
      docsAmount: `${query.docsAmount} => ${newQuery.docsAmount}`,
      timeSpentInMillis: `${query.timeSpentInMillis} => ${newQuery.timeSpentInMillis}`
    },
    message
  };
}
