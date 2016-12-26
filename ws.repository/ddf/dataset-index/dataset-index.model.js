'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const constants = require('../../../ws.utils/constants');

const DatasetIndex = new Schema({
  key: [{type: String, required: true}],
  value: {type: Schema.Types.Mixed, required: true},
  source: [{type: String, required: true}],
  keyOriginIds: [{type: Schema.Types.ObjectId}],
  valueOriginId: {type: Schema.Types.ObjectId},
  type: {type: String, enum: [constants.CONCEPTS, constants.ENTITIES, constants.DATAPOINTS]},

  dataset: {type: Schema.Types.ObjectId, ref: 'Datasets', required: true},
  transaction: {type: Schema.Types.ObjectId, ref: 'DatasetIndex', required: true}
}, { strict: false });

DatasetIndex.index({transaction: 1});
DatasetIndex.index({key: 1});
DatasetIndex.index({value: 1});
DatasetIndex.index({type: 1});

module.exports = mongoose.model('DatasetIndex', DatasetIndex);

