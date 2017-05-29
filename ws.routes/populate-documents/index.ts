import { createPopulateDocumentsController } from './populate-documents.controller.js';
import {ServiceLocator} from '../../ws.service-locator/index';

function registerPopulateDocumentsRoutes(serviceLocator: ServiceLocator): void {
  createPopulateDocumentsController(serviceLocator);
}

export {
  registerPopulateDocumentsRoutes
};
