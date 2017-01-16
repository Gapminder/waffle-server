'use strict';

const express = require('express');
const propertiesByQueryService = require('./populate-document.service.js');
const logger = require('../../ws.config/log');

module.exports = serviceLocator => {
  const app = serviceLocator.getApplication();

  const router = express.Router();

  router.post('/api/properties-by-query',
    getDocumentByQuery
  );

  return app.use(router);

  function getDocumentByQuery(req, res) {

    const datasetName = req.body.dataset;
    const commit = req.body.version;
    const collection = req.body.collection;
    const queryToCollections = req.body.query;

    let externalContext = {
      datasetName,
      commit,
      collection,
      queryToCollections,
    };

      return propertiesByQueryService.getPopulateDocumentByQuery(externalContext, (error, document) => {
        if (error) {
         return logger.error(error);
        }

        return res.json(document);
      })
    }
};
