import { createDdfqlController } from './ddfql.controller';
import {ServiceLocator} from '../../ws.service-locator/index';

function registerDdfqlRoutes(serviceLocator: ServiceLocator): void {
  createDdfqlController(serviceLocator);
}

export {
  registerDdfqlRoutes
};
