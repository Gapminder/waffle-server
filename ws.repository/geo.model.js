var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Geo = new Schema({
  // description
  gid: {type: String, match: /^[a-z0-9_]*$/, index: true, unique: true, required: true },
  name: String,
  description: String,

  // location
  lat: Number,
  lng: Number,

  // categories (populate via gid)?
  geoRegion4: String,
  geoWestRest: String,

  // color should not be here
  color: String,

  // planet, g_region4
  subdim: {type: String, index: true, sparse: true},

  // geo category
  isRegion4: Boolean,
  isTerritory: Boolean,
  isUnState: Boolean
});

module.exports = mongoose.model('Geo', Geo);
