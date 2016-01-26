var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var indexDbSchema = new Schema({
  gid: String,
  name: String,
  allowCharts: [{type: String}],
  use: String,
  unit: String,
  scales: [{type: String}],
  sourceLink: String,
  domain: [{type: Number}],
  interpolation: String
});

module.exports = mongoose.model('IndexDb', indexDbSchema);
