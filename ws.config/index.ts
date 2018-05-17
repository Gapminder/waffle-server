import { configureExpress } from './express.config';
import { ServiceLocator } from '../ws.service-locator';

export function configureWaffleServer(serviceLocator: ServiceLocator): void {
  configureExpress(serviceLocator.getApplication());
}
