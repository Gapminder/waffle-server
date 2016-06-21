'use strict';

let mongoose = require('mongoose');

let Datasets = mongoose.model('Datasets');

let utils = require('../../utils');

function DatasetsRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  DatasetsRepository.prototype[actionName] = utils.actionFactory(actionName)(Datasets, this);
});

DatasetsRepository.prototype.findByName = (datasetName, done) => {
  return Datasets
    .findOne({name: datasetName})
    .lean()
    .exec((error, dataset) => {
      return done(error, dataset);
    });
};

DatasetsRepository.prototype.removeVersion = (datasetId, version, done) => {
  return Datasets.update({_id: datasetId}, {$pull: {versions: version}}).lean().exec(done)
};

module.exports = DatasetsRepository;
