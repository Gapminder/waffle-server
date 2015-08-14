'use strict';

var _ = require('lodash');
var mongoose = require('mongoose');
var Publishers = mongoose.model('Publishers');

var utils = require('../utils');

function PublishersRepository() {
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


['update', 'findById', 'deleteRecord'].forEach(function (actionName) {
  PublishersRepository.prototype[actionName] = utils.actionFactory(actionName)(Publishers, this);
});

module.exports = PublishersRepository;
