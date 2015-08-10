'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var DevInfoOrg = new Schema({
  Country: String,
  Language: String,
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

mongoose.model('DevInfoOrg', DevInfoOrg);