'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConceptsSchema = new Schema({
  value: String,
  name: String,
  type: { type: String, enum: ['entity_set', 'entity_domain', 'time', 'string', 'measure'], default: 'string'},
  tooltip: String,
  indicatorUrl: String,
  domain: String
});

ConceptsSchema.index({type: 1});
ConceptsSchema.index({domain: 1});
ConceptsSchema.index({value: 1, type: 1});

module.exports = mongoose.model('Concepts', ConceptsSchema);
