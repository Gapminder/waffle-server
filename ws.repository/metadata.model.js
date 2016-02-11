var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Metadata = new Schema({
  // dimension
  gid: {type: String, match: /^[a-z0-9_]*$/, index: true, unique: true, required: true},

  name: String,
  name_short: String,
  link: String,
  description: String,
  usability: Number,
  ddf_origin: Array

}, {strict: false});

module.exports = mongoose.model('Metadata', Metadata);
