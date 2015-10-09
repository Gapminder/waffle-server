var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Files = new Schema({
  uri: String,
  name: {type: String, index: true},
  ext: {type: String, index: true},
  owners: [{type: mongoose.Schema.Types.ObjectId, ref: 'Users'}],
  type: String,
  size: Number,
  createdAt: {type: Date, 'default': Date.now()},
  createdBy: {type: mongoose.Schema.Types.ObjectId, ref: 'Users'}
});

mongoose.model('Files', Files);
