'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RecentDdfqlQueriesSchema = new Schema({
  queryRaw: {type: Schema.Types.Mixed},
  type: {type: String, enum: ['URLON', 'JSON'], default: 'URLON', required: true},
  createdAt: {type: Date, default: Date.now},
}, { strict: false, capped: { size: 50000000, max: 512 } });

RecentDdfqlQueriesSchema.index({queryRaw: 1});
module.exports = mongoose.model('RecentDdfqlQueries', RecentDdfqlQueriesSchema);
