var cors = require('cors');
var multiparty = require('connect-multiparty')();

var corsOptions = {
  origin: function (origin, callback) {
    callback(null, true);
  }
};

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var logger = app.get('log');
  app.options('/api/files/uploads', cors(corsOptions));
  app.post('/api/files/uploads', cors(corsOptions), multiparty, function (req, res) {
    logger.log(req.files.file.path);
    console.log(req.body)
    // don't forget to delete all req.files when done
    return res.json({answer: 'completed'});
  });
};
