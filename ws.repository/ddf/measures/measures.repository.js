'use strict';

var mongoose = require('mongoose');

var Measures = mongoose.model('Measures');
var DataPoints = mongoose.model('DataPoints');

var utils = require('../../utils');

function MeasuresRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(function (actionName) {
  MeasuresRepository.prototype[actionName] = utils.actionFactory(actionName)(Measures, this);
});

module.exports = MeasuresRepository;
