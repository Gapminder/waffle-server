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

DatasetsRepository.prototype.removeVersion = (datasetName, version, done) => {
  return Datasets.findOneAndUpdate({name: datasetName}, {$pull: {versions: version}}, {new: 1}).lean().exec(done)
};

DatasetsRepository.prototype.forceLock = (datasetName, done) => {
  return Datasets.findOneAndUpdate({name: datasetName}, {isLocked: true}, {new: 1}).lean().exec(done);
};

DatasetsRepository.prototype.forceUnlock = (datasetName, done) => {
  return Datasets.findOneAndUpdate({name: datasetName}, {isLocked: false}, {new: 1}).lean().exec(done);
};

module.exports = new DatasetsRepository();
