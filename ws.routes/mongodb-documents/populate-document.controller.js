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
    const version = req.body.version;
    const collection = req.body.collection;
    const query = req.body.query;
    const populateDataset = {isDefault: true};

    let options = {
      datasetName,
      version,
      collection,
      query,
      populateDataset
    };

      return propertiesByQueryService.getPopulateDocumentByQuery(options, (error, document) => {
        if (error) {
          logger.error(error);
        }

        res.json(document);
      })
    }
};
