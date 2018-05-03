import * as express from 'express';
import {config} from '../../ws.config/config';
import {logger} from '../../ws.config/log';

import * as routeUtils from '../../ws.routes/utils';
import * as populateDocumentService from './populate-documents.service';
import {ServiceLocator} from '../../ws.service-locator/index';
import {WSRequest} from '../utils';

function createPopulateDocumentsController(serviceLocator: ServiceLocator): any {
  if (!config.CAN_POPULATE_DOCUMENTS) {
    return;
  }

  const app = serviceLocator.getApplication();

  const router = express.Router();

  router.post('/api/development/populate-documents',
    getDocumentByQuery
  );

  return app.use(router);

  function getDocumentByQuery(req: WSRequest, res: any): void {
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

    return populateDocumentService.getDocumentsByQuery(externalContext, (error: string, documents: any) => {
      if (error) {
        logger.error({req}, 'POPULATE DOCUMENTS: Bad request');
        return res.json(routeUtils.toErrorResponse('POPULATE DOCUMENTS: Bad request', req));
      }

      return res.json(routeUtils.toDataResponse(documents));
    });
  }
}

export { createPopulateDocumentsController };
