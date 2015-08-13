'use strict';

var _ = require('lodash');
var mongoose = require('mongoose');
var Publishers = mongoose.model('Publishers');

function PublishersRepository() {
}

function wAtoS(cb) {
  return function (err, list) {
    return cb(err, _.first(list));
  };
}

PublishersRepository.prototype.find = function find(query, projection, cb) {
  Publishers
    .find(query, projection)
    .lean()
    .exec(cb);

  return this;
};

PublishersRepository.prototype.list = function listAll(projection, cb) {
  return this.find({}, projection || {name: 1, url: 1}, cb || projection);
};

PublishersRepository.prototype.add = function addNewOrIgnore(dataStore, cb) {
  var self = this;
  var ds = (new Publishers(dataStore)).toObject();
  if (!ds.name) {
    (new Publishers(ds)).validate(cb);
    return this;
  }
  return this.find(query, {}, wAtoS(findDataSource));

  function findDataSource(err, oldDataSource) {
    if (err) {
      return cb(err);
    }

    if (_.isEmpty(oldDataSource)) {
      return createNewDataSource(ds);
    }

    return updateExistingDataSource(ds);
  }

  function createNewDataSource(newRecord) {
    return Publishers.create(newRecord, findOne);
  }

  function updateExistingDataSource(newRecord) {
    return Publishers.update(query, {$set: _.pick(newRecord, ['name', 'url'])}, findOne);
  }

  function findOne() {
    return self.find(query, {}, wAtoS(cb));
  }
};

PublishersRepository.prototype.findById = function findById(id, cb) {
  return this.find({_id: id}, {}, wAtoS(cb));
};

module.exports = PublishersRepository;
