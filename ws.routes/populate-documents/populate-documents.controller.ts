import * as express from 'express';
import {config} from '../../ws.config/config';
import {logger} from '../../ws.config/log';

import * as routeUtils from '../../ws.routes/utils';
import * as populateDocumentService from './populate-documents.service';

function createPopulateDocumentsController(serviceLocator) {
  if (!config.CAN_POPULATE_DOCUMENTS) {
    return;
  }

  const app = serviceLocator.getApplication();

  const router = express.Router();

  router.post('/api/populate-documents',
    getDocumentByQuery
  );

  return app.use(router);

  function getDocumentByQuery(req, res) {
    const datasetName = req.body.dataset;
    const commit = req.body.version;
    const collection = req.body.collection;
    const query = req.body.query;

    let externalContext = {
      datasetName,
      commit,
      collection,
      query
    };

    return populateDocumentService.getDocumentsByQuery(externalContext, (error, documents) => {
      if (error) {
        logger.error({req}, 'POPULATE DOCUMENTS: Bad request');
        return res.json(routeUtils.toErrorResponse('POPULATE DOCUMENTS: Bad request'));
      }

      return res.json(routeUtils.toDataResponse(documents));
    });
  }
}

export { createPopulateDocumentsController };
