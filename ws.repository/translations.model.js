var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Translations = new Schema({
  key: {type: String, index: true, required: true},
  language: {type: String, required: true},
  value: String
});

Translations.index({1: true, key: 1});
mongoose.model('Translations', Translations);
