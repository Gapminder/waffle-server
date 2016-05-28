'use strict';

const async = require('async');
const exportDdfMetaTree = require('./export-ddf-meta-tree');
const exportDdfDataTree = require('./export-ddf-data-tree');

module.exports = (app, done, options = {}) => {
  const logger = app.get('log');
  const neo4jdb = app.get('neo4jDb');
  const config = app.get('config');

  const exportTasks = [];

  if (config.CLEAN_EXPORT) {
    exportTasks.push(cb => cleanGraph(cb));
  }

  exportTasks.push(cb => exportDdfMetaTree(app, cb, options));
  exportTasks.push(cb => exportDdfDataTree(app, cb, options));

  return async.waterfall(exportTasks, error => {
    if (error) {
      logger.error(error);
    }

    return done(error);
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
