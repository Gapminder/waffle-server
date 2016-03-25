// todo: convert types
var _ = require('lodash');
var async = require('async');
var express = require('express');
var mongoose = require('mongoose');

//var ensureAuthenticated = require('../utils').ensureAuthenticated;
var ensureAuthenticated = function (req, res, next) {
  return next();
};

module.exports = function (serviceLocator) {
  // fix: single thread hack :)
  var isExportInProgress = false;

  var app = serviceLocator.getApplication();
  var logger = app.get('log');
  var exportAllGraphs = require('./export.service');

  /*eslint new-cap:0*/
  var router = express.Router();

  /** Outdated
   * //@swagger
   * /api/graphs/export:
   *   get:
   *    description: Export data in neo4j
   *    produces:
   *      - application/json
   *      - text/csv
   *    tags:
   *      - GraphExport
   *    responses:
   *      200:
   *        description: Export in neo4j
   *      default:
   *        description: Unexpected error
   *        schema:
   *          $ref: '#/definitions/Error'
   *
   */
  // router.get('/api/graphs/export', ensureAuthenticated, runExportAllGraphs);

  return app.use(router);

  function runExportAllGraphs(req, res, next) {
    if (isExportInProgress) {
      return res.json({success: true, msg: 'Export is already in progress!'});
    }

    isExportInProgress = true;

    exportAllGraphs(app, (err, msg) => {
      if (err) {
        logger.error(err);
      }

      isExportInProgress = false;

      return res.json({success: !err, msg: msg, error: err});
    });
  }
};
