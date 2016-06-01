'use strict';

const cors = require('cors');
const express = require('express');
const compression = require('compression');

const reposService = require('../import/repos.service');
const service = require('./demo.service');
const decodeQuery = require('../../utils').decodeQuery;

module.exports = (serviceLocator) => {
  const app = serviceLocator.getApplication();

  const config = app.get('config');
  const logger = app.get('log');
  const router = express.Router();

  router.all('/api/ddf/demo/prestored-queries',
    cors(),
    compression(),
    decodeQuery
    //getPrestoredQueries
  );

  router.post('/api/ddf/demo/update-incremental',
    cors(),
    compression(),
    decodeQuery,
    _updateIncrementally
  );

  router.all('/api/ddf/demo/import-dataset',
    cors(),
    compression(),
    decodeQuery
    //importDataset
  );

  router.all('/api/ddf/demo/git-commits-list',
    cors(),
    compression(),
    decodeQuery
    //getGitCommitsList
  );

  return app.use(router);


//function getPrestoredQueries(req, res) {
//  if (/*check*/) {
//    return res.json(req.body);
//  }
//  if (/*check*/) {
//    return res.json(req.query);
//  }
//}
  function _updateIncrementally(req, res) {
    let params = {
      commit: req.body.commit,
      github: req.body.github,
      datasetName: reposService.getRepoName(req.body.github),
      diff: JSON.parse(req.body.diff),
    };

    service.updateIncrementally(params, (err) => {
      if (err) {
        logger.error(err);
      }

      return res.json({success: !err, err});
    });
  }

//function importDataset(req, res) {
//  if (/*check*/) {
//    return res.json(req.body);
//  }
//  if (/*check*/) {
//    return res.json(req.query);
//  }
//
//}
//function getGitCommitsList(req, res) {
//  if (/*check*/) {
//    return res.json(req.body);
//  }
//  if (/*check*/) {
//    return res.json(req.query);
//  }
//}
};
