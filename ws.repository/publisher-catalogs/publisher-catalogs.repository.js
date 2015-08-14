'use strict';

var _ = require('lodash');
var mongoose = require('mongoose');
var PublisherCatalogs = mongoose.model('PublisherCatalogs');

var utils = require('../utils');

function PublisherCatalogsRepository() {
}

PublisherCatalogsRepository.prototype.find = function find(query, projection, cb) {
  PublisherCatalogs
    .find(query, projection)
    .lean()
    .exec(cb);

  return this;
};

PublisherCatalogsRepository.prototype.list = function listAll(projection, cb) {
  return this.find({}, projection || {name: 1}, cb || projection);
};

['update', 'findById', 'deleteRecord'].forEach(function (actionName) {
  PublisherCatalogsRepository.prototype[actionName] = utils.actionFactory(actionName)(PublisherCatalogs, this);
});

module.exports = PublisherCatalogsRepository;
