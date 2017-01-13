import * as _ from 'lodash';
import { model } from 'mongoose';


const KeyValue = model('KeyValue');

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

const repository = new KeyValueRepository();

export { repository as KeyValueRepository };
