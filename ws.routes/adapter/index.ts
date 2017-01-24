import { createAdapterServiceController } from './service';

function registerAdapterRoutes(serviceLocator) {
  createAdapterServiceController(serviceLocator);
}

export {
  registerAdapterRoutes
}
