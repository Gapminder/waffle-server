import * as Config from './ws.config';
import * as Routes from './ws.routes';
import { logger } from './ws.config/log';
import { ServiceLocator } from './ws.service-locator';
import * as util from 'util';
import { mongolessImport } from './ws.routes/ddfql/ddfql.controller';

export class Application {
  public listen: Function;

  private config: any;

  public constructor(serviceLocator: ServiceLocator) {
    this.configure(serviceLocator);
    this.registerRoutes(serviceLocator);

    this.config = serviceLocator.get('config');

    const app = serviceLocator.getApplication();
    this.listen = util.promisify(app.listen.bind(app));
  }

  public run(): Promise<void> {
    return this.listen(this.config.PORT)
      .then(() => mongolessImport())
      .then(() => logger.info('\nExpress server listening on port %d in %s mode', this.config.PORT, this.config.NODE_ENV));
  }

  private configure(serviceLocator: ServiceLocator): void {
    Config.configureWaffleServer(serviceLocator);
  }

  private registerRoutes(serviceLocator: ServiceLocator): void {
    Routes.registerRoutes(serviceLocator);
  }
}
