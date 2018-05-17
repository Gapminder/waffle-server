import * as Config from './ws.config';
import { registerRoutes } from './ws.routes';
import { logger } from './ws.config/log';
import { ServiceLocator } from './ws.service-locator';
import { loadRepositoriesConfig, RepositoriesConfig } from './ws.config/repos.config';

export class Application {
  public listen: Function;

  private config: any;
  private reposConfig: RepositoriesConfig;

  public constructor(private serviceLocator: ServiceLocator) {
    this.configure(serviceLocator);
    this.registerRoutes(serviceLocator);

    this.config = serviceLocator.get('config');

    const app = serviceLocator.getApplication();
    this.listen = app.listen.bind(app);
  }

  public async run(): Promise<void> {
    try {
      // For test that with repositoryes config everything is ok
      this.reposConfig = await loadRepositoriesConfig(true);
      this.serviceLocator.set('repos-config', this.reposConfig);

      this.listen(this.config.PORT);
      // importService.importByConfig();
      logger.info(`Express server listening on port ${this.config.PORT} in ${this.config.NODE_ENV} mode`);
    } catch (startupError) {
      logger.error(startupError);
      if (this.config.IS_TESTING !== true) {
        process.exit(1);
      } else {
        throw startupError;
      }
    }
  }

  private configure(serviceLocator: ServiceLocator): void {
    Config.configureWaffleServer(serviceLocator);
  }

  private registerRoutes(serviceLocator: ServiceLocator): void {
    registerRoutes(serviceLocator);
  }
}
