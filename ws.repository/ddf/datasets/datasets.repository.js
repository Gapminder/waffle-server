'use strict';

let mongoose = require('mongoose');

let Datasets = mongoose.model('Datasets');

let utils = require('../../utils');

function DatasetsRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  DatasetsRepository.prototype[actionName] = utils.actionFactory(actionName)(Datasets, this);
});

module.exports = DatasetsRepository;
