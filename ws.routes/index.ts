import { registerDdfqlRoutes } from './ddfql';
import { registerDdfAssetsRoutes } from './assets';
import { ServiceLocator } from '../ws.service-locator/index';

export {
  registerRoutes
};

function registerRoutes(serviceLocator: ServiceLocator): void {
  registerDdfqlRoutes(serviceLocator);
  registerDdfAssetsRoutes(serviceLocator);
}
