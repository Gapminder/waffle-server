'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VersionsSchema = new Schema({
  value: String,
  status: { type: String, enum: ['IMPORTED', 'PUBLISHED', 'WORK_IN_PROGRESS'], default: 'WORK_IN_PROGRESS'},
  author: {type: Schema.Types.ObjectId, ref: 'Users'},
  basedOn: {type: Schema.Types.ObjectId, ref: 'Versions'}
});

VersionsSchema.index({value: 1});
VersionsSchema.index({status: 1});

module.exports = mongoose.model('Versions', VersionsSchema);
