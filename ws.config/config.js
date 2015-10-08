/*eslint no-process-env:0 */
module.exports = function (app) {
  if (!process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('You need to set up AWS access keys');
  }

  var config = {
    PORT: process.env.PORT || 3000,
    HOST: process.env.HOST || 'http://localhost',
    MONGODB_URL: 'mongodb://localhost/waffleserver',
    DEFAULT_NODE_ENV: 'development',
    NEO4J_URL: process.env.NEO4J_URL || 'http://neo4j:neo4j@localhost:7474',

    // NODE_ENV: devtest, development, beta, production; if test - silent:true
    NODE_ENV: process.env.NODE_ENV,
    // LOG_LEVEL: log, info, warn, error
    LOG_LEVEL: process.env.LOG_LEVEL,

    DEFAULT_OPTIONS_CONVERTING_JSON_TO_CSV: {
      DELIMITER: {
        FIELD: ';',
        ARRAY: ',',
        WRAP: '"'
      },
      EOL: '\n',
      PARSE_CSV_NUMBERS: false
    }
  };
  config.social = {
    GOOGLE_CLIENT_ID: '267502081172-qcabnkcj1ns254hnu45gf67d0t5675e3.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: '-qvIG6hoI8a7IpsX1-7-uojr',
    GOOGLE_CALLBACK_URL: (config.HOST_URL ? config.HOST_URL : config.HOST + ':' + config.PORT) + '/api/auth/google/callback',
    GOOGLE_SCOPE: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email']
  };

  app.set('config', config);
};
