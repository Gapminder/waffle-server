'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Humnum = new Schema({
  Indicator: String,
  Unit: String,
  Subgroup: String,
  Area: String,
  'Area ID': String,
  'Time Period': String,
  Source: String,
  'Data Value': Number,
  Footnotes: String
});

mongoose.model('Humnum', Humnum);
