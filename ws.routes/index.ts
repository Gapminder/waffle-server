import { registerAdapterRoutes } from './adapter';
import { registerDdfqlRoutes } from './ddf/ddfql';
import { registerPopulateDocumentsRoutes } from './populate-documents';
import { registerDdfCliRoutes } from './ddf/cli';
import { ServiceLocator } from '../ws.service-locator/index';

export {
  registerRoutes
}

function registerRoutes(serviceLocator: ServiceLocator): void {
  registerAdapterRoutes(serviceLocator);
  registerDdfqlRoutes(serviceLocator);
  registerPopulateDocumentsRoutes(serviceLocator);
  registerDdfCliRoutes(serviceLocator);
}
