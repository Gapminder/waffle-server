'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const KeyValueSchema = new Schema({
  key: {type: String, index: true, required: true},
  value: {type: Schema.Types.Mixed}
});

module.exports = mongoose.model('KeyValue', KeyValueSchema);
