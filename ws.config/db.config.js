//eslint-disable
const mongoose = require('mongoose');
const config = require('./config');
const Neo4j = require('node-neo4j');

const db = mongoose.connection;
mongoose.set('debug', false);
mongoose.connect(config.MONGODB_URL);

db.on('error', function (err) {
  console.log('db connect error', err);
});

db.once('open', function () {
  console.log('db connect good');
});

db.once('close', function () {
  console.log('db connect close');
});

module.exports = {
  neo4jDb: new Neo4j(config.NEO4J_URL)
};
