//eslint-disable
var mongoose = require('mongoose');

module.exports = function (app) {
  require('./config')(app); // should be the first
  require('./log')(app);

  var config = app.get('config');
  var mongoUri = config.MONGODB_URL;
  var db = mongoose.connection;
  mongoose.set('debug', false);
  mongoose.connect(mongoUri);

  db.on('error', function (err) {
    console.log('db connect error', err);
  });

  db.once('open', function () {
    console.log('db connect good');
  });

  db.once('close', function () {
    console.log('db connect close');
  });

};
