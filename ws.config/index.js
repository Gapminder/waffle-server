//eslint-disable
var mongoose = require('mongoose');
var neo4j = require('neo4j');

module.exports = function (app) {
  require('./config')(app); // should be the first
  require('./log')(app);

  var config = app.get('config');
  var mongoUri = config.MONGODB_URL;
  var db = mongoose.connection;
  mongoose.set('debug', false);
  mongoose.connect(mongoUri);

  var neo4jDb = new neo4j.GraphDatabase(config.NEO4J_URL);

  app.set('neo4jDb', neo4jDb);

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
