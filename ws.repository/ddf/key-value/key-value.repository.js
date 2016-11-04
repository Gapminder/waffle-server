'use strict';

const _ = require('lodash');

const mongoose = require('mongoose');
const KeyValue = mongoose.model('KeyValue');

function KeyValueRepository() {
}

KeyValueRepository.prototype.set = function (key, value, onSet) {
  return KeyValue.update({key}, {$set: {value}}, {upsert: true}, onSet);
};

KeyValueRepository.prototype.get = function (key, defaultValue, onGot) {
  if (_.isFunction(defaultValue)) {
    onGot = defaultValue;
    defaultValue = undefined;
  }

  return KeyValue.findOne({key}).lean().exec((error, keyValue) => {
    return onGot(_.get(keyValue, 'value', defaultValue));
  });
};

module.exports = new KeyValueRepository();
