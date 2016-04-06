'use strict';

let mongoose = require('mongoose');

let Measures = mongoose.model('Measures');

let utils = require('../utils');

function MeasuresRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  MeasuresRepository.prototype[actionName] = utils.actionFactory(actionName)(Measures, this);
});

module.exports = MeasuresRepository;
