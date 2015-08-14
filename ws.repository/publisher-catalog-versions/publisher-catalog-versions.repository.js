'use strict';

var mongoose = require('mongoose');
var PublisherCatalogVersions = mongoose.model('PublisherCatalogVersions');

var utils = require('../utils');

function PublisherCatalogVersionsRepository() {
}

['update', 'findById', 'deleteRecord'].forEach(function (actionName) {
  PublisherCatalogVersionsRepository.prototype[actionName] =
    utils.actionFactory(actionName)(PublisherCatalogVersions, this);
});

module.exports = PublisherCatalogVersionsRepository;
