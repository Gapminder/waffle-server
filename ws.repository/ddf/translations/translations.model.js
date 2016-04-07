'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let Translations = new Schema({
  key: {type: String, index: true, required: true},
  language: {type: String, required: true},
  value: {type: String, required: true, sparse: true},

  dataSet: {type: Schema.Types.ObjectId, ref: 'DataSets'}
});

Translations.index({1: true, key: 1});

module.exports = mongoose.model('Translations', Translations);
