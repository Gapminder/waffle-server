import { createDdfqlController } from './ddfql.controller';

function registerDdfqlRoutes(serviceLocator) {
  createDdfqlController(serviceLocator);
}

export {
  registerDdfqlRoutes
};

