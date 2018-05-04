import './ws.repository';

import * as Config from './ws.config';
import * as Routes from './ws.routes';
import { logger } from './ws.config/log';
import { ServiceLocator } from './ws.service-locator';
import * as util from 'util';
import { CronJob } from './ws.utils/long-running-queries-killer';
import { mongolessImport } from './mongoless-import';

export class Application {
  public listen: Function;

  private config: any;
  private warmupUtils: any;
  private importUtils: any;
  private importService: any;
  private usersService: any;
  private longRunningQueriesKiller: CronJob;

  public constructor(serviceLocator: ServiceLocator) {
    this.configure(serviceLocator);
    this.registerRoutes(serviceLocator);

    this.importUtils = serviceLocator.get('importUtils');
    this.importService = serviceLocator.get('importService');
    this.warmupUtils = serviceLocator.get('warmupUtils');
    this.config = serviceLocator.get('config');
    this.usersService = serviceLocator.get('usersService');
    this.longRunningQueriesKiller = serviceLocator.get('longRunningQueriesKiller');

    const app = serviceLocator.getApplication();
    this.listen = util.promisify(app.listen.bind(app));
  }

  public run(): Promise<void> {
    return this.usersService.makeDefaultUser()
      .then(() => this.listen(this.config.PORT))
      .then(() => logger.info('\nExpress server listening on port %d in %s mode', this.config.PORT, this.config.NODE_ENV))
      .then(() => this.importService.importDdfRepos())
      .then(() => mongolessImport())
      .then(() => this.warmup())
      .then(() => this.startLongRunningQueriesKiller());
  }

  private configure(serviceLocator: ServiceLocator): void {
    Config.configureWaffleServer(serviceLocator);
  }

  private registerRoutes(serviceLocator: ServiceLocator): void {
    Routes.registerRoutes(serviceLocator);
  }

  private warmup(): Promise<void> {
    return util.promisify(this.warmupUtils.warmUpCache)()
      .then((warmedQueriesAmount: number) => {
          logger.info(`Attempt to warm up the cache is has been completed. Amount of executed queries: ${warmedQueriesAmount}`);
      })
      .catch((error: any) => logger.error(error, 'Cache warm up failed.'));
  }

  private startLongRunningQueriesKiller(): Promise<void> {
    this.longRunningQueriesKiller.start();

    if (!this.longRunningQueriesKiller.running) {
      return Promise.reject('Long running queries killer failed to start');
    }

    return Promise.resolve();
  }
}
