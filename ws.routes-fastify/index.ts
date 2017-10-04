import { registerDdfqlRoutes } from './ddf/ddfql';
import { ServiceLocator } from '../ws.service-locator/index';

export {
  registerRoutes
};

function registerRoutes(serviceLocator: ServiceLocator): void {
  registerDdfqlRoutes(serviceLocator);
}
