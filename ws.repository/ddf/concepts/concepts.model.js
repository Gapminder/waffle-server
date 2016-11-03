'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const originId = require('../origin-id.plugin');

const Concepts = new Schema({
  gid: {type: String, match: /^[a-z0-9_]*$/, index: true, required: true},
  originId: {type: Schema.Types.ObjectId},

  type: {type: String, enum: ['entity_set', 'entity_domain', 'time', 'string', 'measure'], 'default': 'string', required: true},
  sources: [{type: String, required: true}],

  properties: {},
  languages: {},

  isNumeric: {type: Boolean, index: true, sparse: true},
  domain: {type: Schema.Types.ObjectId, sparse: true},
  subsetOf: [{type: Schema.Types.ObjectId}],
  dimensions: [{type: Schema.Types.ObjectId}],

  from: {type: Number, required: true},
  to: {type: Number, required: true, default: Number.MAX_SAFE_INTEGER},
  dataset: {type: Schema.Types.ObjectId, ref: 'Datasets', required: true},
}, { strict: false });

Concepts.post('save', function (doc, next) {
  if (!doc.originId) {
    doc.originId = doc._id;
    mongoose.model('Concepts').update({ _id: doc._id }, { $set: { originId: doc._id } }, (error, result) => {
      next(error, result);
    });
  } else {
    next();
  }
});

Concepts.plugin(originId, {
  modelName: 'Concepts',
  domain: 'Concepts',
  subsetOf: 'Concepts',
  dimensions: 'Concepts',
  originId: 'Concepts'
});

Concepts.index({dataset: 1, from: 1, to: 1});
Concepts.index({dataset: 1, from: 1, to: 1, originId: 1});
Concepts.index({dataset: 1, from: 1, to: 1, gid: 1});
// Concepts.index({dataset: 1, from: 1, to: 1, _id: 1});
Concepts.index({from: 1});
Concepts.index({to: 1});
Concepts.index({originId: 1});

module.exports = mongoose.model('Concepts', Concepts);
