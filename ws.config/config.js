/*eslint no-process-env:0 */
module.exports = function (app) {
  var config = {
    PORT: process.env.PORT || 3000,
    MONGODB_URL: 'mongodb://localhost/waffleserver',
    DEFAULT_NODE_ENV: 'develop',
    NEO4J_URL: 'http://neo4j:neo4j@localhost:7474',

    // NODE_ENV: devtest, development, beta, production; if test - silent:true
    NODE_ENV: process.env.NODE_ENV,
    DEFAULT_NODE_ENV: 'development',
    // LOG_LEVEL: log, info, warn, error
    LOG_LEVEL: process.env.LOG_LEVEL
  }

  app.set('config', config);
};
