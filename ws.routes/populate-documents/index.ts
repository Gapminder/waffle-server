import { createPopulateDocumentsController } from './populate-documents.controller.js';

function registerPopulateDocumentsRoutes(serviceLocator) {
  createPopulateDocumentsController(serviceLocator);
}

export {
  registerPopulateDocumentsRoutes
}

