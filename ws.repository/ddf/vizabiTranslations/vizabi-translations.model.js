'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/**
 * @typedef {Object} VizabiTranslations
 * @memberof Models
 *
 * @property {Object} key - is not unique, if it doesn't exist for some language, then you could use defaultLanguage property from Dataset
 * @property {String} language - defines language of each dataset
 * @property {Object} value - value on certain language
 *
 */
let VizabiTranslations = new Schema({
  key: {type: String, index: true, required: true},
  language: {type: String, required: true},
  value: {type: String, required: true, sparse: true},

  updatedBy: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
  updatedAt: {type: Date, 'default': new Date(), required: true}
});

VizabiTranslations.index({dataset: 1, language: 1, key: 1});
VizabiTranslations.index({dataset: 1, key: 1});

module.exports = mongoose.model('VizabiTranslations', VizabiTranslations);
