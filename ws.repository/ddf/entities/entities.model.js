'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const originId = require('../origin-id.plugin');

const constants = require('../../../ws.utils/constants');

const Entities = new Schema({
  gid: {type: Schema.Types.Mixed, match: constants.GID_REGEXP, index: true, required: true},
  originId: {type: Schema.Types.ObjectId},

  title: String,
  sources: [{type: String, required: true}],
  properties: {},
  languages: {},

  // should be required
  domain: {type: Schema.Types.ObjectId, required: true},
  sets: [{type: Schema.Types.ObjectId}],

  from: {type: Number, required: true},
  to: {type: Number, required: true, default: Number.MAX_SAFE_INTEGER},
  dataset: {type: Schema.Types.ObjectId, ref: 'Datasets', required: true},
}, { strict: false });


Entities.plugin(originId, {
  modelName: 'Entities',
  domain: 'Concepts',
  sets: 'Concepts',
  originId: 'Entities'
});

// This index exists only for entities of type "time"
Entities.index({dataset: 1, from: 1, to: 1, domain: 1, 'parsedProperties.time.millis': 1, 'parsedProperties.time.timeType': 1}, {sparse: true});
Entities.index({dataset: 1, from: 1, to: 1, domain: 1, sets: 1});
// Entities.index({dataset: 1, from: 1, to: 1, domain: 1, _id: 1});
Entities.index({dataset: 1, from: 1, to: 1, originId: 1});
Entities.index({dataset: 1, from: 1, to: 1, gid: 1, 'properties.concept_type': 1});
Entities.index({from: 1});
Entities.index({to: 1});
Entities.index({originId: 1});


module.exports = mongoose.model('Entities', Entities);
