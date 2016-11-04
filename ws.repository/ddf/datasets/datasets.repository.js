'use strict';

let mongoose = require('mongoose');

let Datasets = mongoose.model('Datasets');

function DatasetsRepository() {
}

DatasetsRepository.prototype.create = (dataset, done) => {
  return Datasets.create(dataset, (error, model) => {
    if (error) {
      return done(error);
    }
    return done(null, model.toObject());
  });
};

DatasetsRepository.prototype.findByName = (datasetName, done) => {
  return Datasets.findOne({name: datasetName}).lean().exec(done);
};

DatasetsRepository.prototype.findByUser = (userId, done) => {
  return Datasets.find({createdBy: userId}).lean().exec(done);
};

DatasetsRepository.prototype.findByGithubUrl = (githubUrl, done) => {
  return Datasets.findOne({path: githubUrl}).lean().exec(done);
};

DatasetsRepository.prototype.findByNameAndUser = (datasetName, userId, done) => {
  return Datasets.findOne({name: datasetName, createdBy: userId}).lean().exec(done);
};

DatasetsRepository.prototype.forceLock = (datasetName, done) => {
  return Datasets.findOneAndUpdate({name: datasetName}, {isLocked: true}, {new: 1}).lean().exec(done);
};

DatasetsRepository.prototype.forceUnlock = (datasetName, done) => {
  return Datasets.findOneAndUpdate({name: datasetName}, {isLocked: false}, {new: 1}).lean().exec(done);
};

DatasetsRepository.prototype.unlock = (datasetName, done) => {
  return Datasets.findOneAndUpdate({name: datasetName, isLocked: true}, {isLocked: false}, {new: 1}).lean().exec(done);
};

DatasetsRepository.prototype.lock = (datasetName, done) => {
  return Datasets.findOneAndUpdate({name: datasetName, isLocked: false}, {isLocked: true}, {new: 1}).lean().exec(done);
};

DatasetsRepository.prototype.removeById = (datasetId, done) => {
  return Datasets.findOneAndRemove({_id: datasetId}, done);
};

module.exports = new DatasetsRepository();
