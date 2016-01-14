var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var indexTreeSchema = new Schema({
  id: {
    type: String
  },
  children: {}
}, {strict: false});

module.exports = mongoose.model('IndexTree', indexTreeSchema);
