import * as Config from './ws.config';
import * as Routes from './ws.routes';
import { logger } from './ws.config/log';
import { ServiceLocator } from './ws.service-locator';
import { defaultRepository, defaultRepositoryCommit } from './ws.config/mongoless-repos.config';
import { importService } from './ws.services/import/import.service';

export class Application {
  public listen: Function;

  private config: any;

  public constructor(serviceLocator: ServiceLocator) {
    this.configure(serviceLocator);
    this.registerRoutes(serviceLocator);

    this.config = serviceLocator.get('config');

    const app = serviceLocator.getApplication();
    this.listen = app.listen.bind(app);
  }

  public run(): void {
    try {
      this.config.DEFAULT_DATASET = defaultRepository;
      this.config.DEFAULT_DATASET_VERSION = defaultRepositoryCommit;
      this.listen(this.config.PORT);
      importService.importByConfig();
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
    Routes.registerRoutes(serviceLocator);
  }
}
