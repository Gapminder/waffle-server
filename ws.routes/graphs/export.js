'use strict';

const express = require('express');
const exportDdf = require('./export.service');

//var ensureAuthenticated = require('../utils').ensureAuthenticated;
const ensureAuthenticated = (req, res, next) => next();

module.exports = serviceLocator => {
  // FIXME: single thread hack :)
  let isExportInProgress = false;

  const app = serviceLocator.getApplication();
  const logger = app.get('log');

  /*eslint new-cap:0*/
  const router = express.Router();

  router.get('/api/graphs/export', ensureAuthenticated, runExportDdf);

  return app.use(router);

  function runExportDdf(req, res) {
    if (isExportInProgress) {
      return res.json({success: true, msg: 'Export is already in progress!'});
    }
    
    if (!req.params.datasetName) {
      return res.json({success: false, msg: 'No datasetName for exporting was given!'});
    }

    isExportInProgress = true;
    return exportDdf(app, error => {
      if (error) {
        logger.error(error);
      }
      isExportInProgress = false;
      return res.json({success: !error, msg, error});
    }, {
      datasetName: req.params.datasetName,
      version: req.params.version
    });
  }
};
