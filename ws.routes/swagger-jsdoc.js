module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var swaggerJson = require('../swagger.json');
  var swagger2 = require('swagger2-utils');
  var config = app.get('config');

  var cors = require('cors');

  app.get('/api-docs.json', cors(), function(req, res) {
    if (swagger2.validate(swaggerJson)) {
      res.json(swaggerJson);
    }
    else {
      console.log('swaggerJson failed!');
      console.log(JSON.stringify(swagger2.validationError))
    }
  });
  app.get('/swagger-docs.json', function(req, res) {
    res.redirect(`http://editor.swagger.io/#/?import=${config.HOST_URL}/api-docs.json`);
  });
};
