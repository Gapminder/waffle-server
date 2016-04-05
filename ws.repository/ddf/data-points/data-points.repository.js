'use strict';

var mongoose = require('mongoose');
var DataPoints = mongoose.model('DataPoints');

var utils = require('../utils');

function DataPointsRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(function (actionName) {
  DataPointsRepository.prototype[actionName] = utils.actionFactory(actionName)(DataPoints, this);
});

module.exports = DataPointsRepository;
