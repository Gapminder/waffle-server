import * as _ from 'lodash';
import { model } from 'mongoose';

const KeyValue = model('KeyValue');

/* tslint:disable-next-line:no-empty */
function KeyValueRepository(): void {
}

KeyValueRepository.prototype.set = function (key: any, value: any, onSet: (err: any) => void): any {
  return KeyValue.update({key}, {$set: {value}}, {upsert: true}, onSet);
};

KeyValueRepository.prototype.get = function (key: any, defaultValue: any, onGot: Function): any {
  if (_.isFunction(defaultValue)) {
    onGot = defaultValue;
    defaultValue = undefined;
  }

  return KeyValue.findOne({key}).lean().exec((error: string, keyValue: any) => {
    return onGot(_.get(keyValue, 'value', defaultValue));
  });
};

const repository = new KeyValueRepository();

export { repository as KeyValueRepository };
