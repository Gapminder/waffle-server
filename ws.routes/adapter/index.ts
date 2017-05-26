import { createAdapterServiceController } from './service';
import {ServiceLocator} from "../../ws.service-locator/index";

function registerAdapterRoutes(serviceLocator: ServiceLocator): void {
  createAdapterServiceController(serviceLocator);
}

export {
  registerAdapterRoutes
};
