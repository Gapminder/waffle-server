'use strict';

const async = require('async');
const exportDdfMetaTree = require('./export-ddf-meta-tree');
const exportDdfDataTree = require('./export-ddf-data-tree');

module.exports = (app, done, datasetName = process.env.DATASET_NAME) => {
  var logger = app.get('log');
  var neo4jdb = app.get('neo4jDb');

  return cleanGraph(error => {
    if (error) {
      return done(error);
    }

    return async.waterfall([
      cb => exportDdfMetaTree(app, cb, datasetName),
      cb => exportDdfDataTree(app, cb, datasetName)
    ], error => {
      if (error) {
        logger.error(error);
      }

      return done(error);
    });
  });

  function cleanGraph(cb) {
    logger.log(`Removing all relationships between nodes`);
    neo4jdb.cypherQuery('match ()-[r]-() delete r;', err => {
      if (err) {
        return cb(err);
      }

      logger.log(`done!`);
      logger.log(`Removing all nodes`);

      neo4jdb.cypherQuery('match (n) delete n;', err => {
        if (err) {
          return cb(err);
        }

        logger.log(`done!`);

        return cb(null);
      });
    });
  }
};
