'use strict';

var mongoose = require('mongoose');
var PublisherCatalogs = mongoose.model('PublisherCatalogs');

var utils = require('../utils');

function PublisherCatalogsRepository() {
}

['update', 'findById', 'deleteRecord'].forEach(function (actionName) {
  PublisherCatalogsRepository.prototype[actionName] =
    utils.actionFactory(actionName)(PublisherCatalogs, this);
});

module.exports = PublisherCatalogsRepository;
