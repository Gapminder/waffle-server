'use strict';

let mongoose = require('mongoose');
let DataPoints = mongoose.model('DataPoints');

let utils = require('../utils');

function DataPointsRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  DataPointsRepository.prototype[actionName] = utils.actionFactory(actionName)(DataPoints, this);
});

module.exports = DataPointsRepository;
