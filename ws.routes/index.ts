import { registerAdapterRoutes } from './adapter';
import { registerDdfqlRoutes } from './ddf/ddfql';
import { registerPopulateDocumentsRoutes } from './populate-documents';
import { registerDdfCliRoutes } from './ddf/cli';

export {
  registerRoutes
}

function registerRoutes(serviceLocator) {
  registerAdapterRoutes(serviceLocator);
  registerDdfqlRoutes(serviceLocator);
  registerPopulateDocumentsRoutes(serviceLocator);
  registerDdfCliRoutes(serviceLocator);
}

