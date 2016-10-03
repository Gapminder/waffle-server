'use strict';

let mongoose = require('mongoose');

let Datasets = mongoose.model('Datasets');

function DatasetsRepository() {
}

DatasetsRepository.prototype.findByName = (datasetName, done) => {
  return Datasets
    .findOne({name: datasetName})
    .lean()
    .exec((error, dataset) => {
      return done(error, dataset);
    });
};

DatasetsRepository.prototype.findByUser = (userId, done) => {
  return Datasets.find({createdBy: userId}).lean().exec(done);
};

DatasetsRepository.prototype.findByNameAndUser = (datasetName, userId, done) => {
  return Datasets
    .findOne({name: datasetName, createdBy: userId})
    .lean()
    .exec((error, dataset) => {
      return done(error, dataset);
    });
};

DatasetsRepository.prototype.removeVersion = (datasetName, version, done) => {
  return Datasets.findOneAndUpdate({name: datasetName}, {$pull: {versions: version}}, {new: 1}).lean().exec(done);
};

DatasetsRepository.prototype.forceLock = (datasetName, done) => {
  return Datasets.findOneAndUpdate({name: datasetName}, {isLocked: true}, {new: 1}).lean().exec(done);
};

DatasetsRepository.prototype.forceUnlock = (datasetName, done) => {
  return Datasets.findOneAndUpdate({name: datasetName}, {isLocked: false}, {new: 1}).lean().exec(done);
};

DatasetsRepository.prototype.removeDatasetWithoutVersionsByName = (datasetName, done) => {
  return Datasets.findOneAndRemove({name: datasetName, versions: {$size: 0}}, done);
};

module.exports = new DatasetsRepository();
