'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Datasets = new Schema({
  name: {type: String, required: true, unique: true, index: true},
  path: {type: String, required: true},

  isLocked: {type: Boolean, default: true},
  lockedAt: {type: Date, default: new Date()},
  lockedBy: {type: Schema.Types.ObjectId, ref: 'Users'},

  createdBy: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
  createdAt: {type: Number, 'default': Date.now(), required: true}
});

Datasets.index({name: 1});

module.exports = mongoose.model('Datasets', Datasets);
