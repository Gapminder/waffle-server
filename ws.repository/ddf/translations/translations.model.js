'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/**
 * @typedef {Object} Translations
 * @memberof Models
 *
 * @property {Object} key - is not unique, if it doesn't exist for some language, then you could use defaultLanguage property from DataSet
 * @property {String} language - defines language of each dataset
 * @property {Object} value - value on certain language
 *
 * @property {Models.DataSets} dataset - of version, could be only one
 */
let Translations = new Schema({
  key: {type: String, index: true, required: true},
  language: {type: String, required: true},
  value: {type: String, required: true, sparse: true},

  dataset: {type: Schema.Types.ObjectId, ref: 'DataSets'}
});

Translations.index({dataset: 1, language: 1, key: 1});
Translations.index({dataset: 1, key: 1});

module.exports = mongoose.model('Translations', Translations);
