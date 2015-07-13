//eslint-disable
var mongoose = require('mongoose');

var mongoUri = 'mongodb://localhost/waffleserver';
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

module.exports = function (app) {

};
