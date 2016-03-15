var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Geo = new Schema({
  // description
  gid: {type: String, match: /^[a-z0-9_\-]*$/, index: true, unique: true, required: true},
  name: String,
  nameShort: String,
  nameLong: String,

  description: String,

  // location
  latitude: Number,
  longitude: Number,

  region4: String,

  // color should not be here
  color: String,

  // planet, g_region4
  subdim: {type: String, index: true, sparse: true},

  // geo category
  isGlobal: {type: Boolean, default: false},
  isRegion4: {type: Boolean, default: false},
  isCountry: {type: Boolean, default: false},
  isUnState: {type: Boolean, default: false},
  g77_and_oecd_countries: String,
  geographic_regions: String,
  income_groups: String,
  landlocked: String,
  main_religion_2008: String
});

module.exports = mongoose.model('Geo', Geo);
