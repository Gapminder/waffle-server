'use strict';

const mongoose = require('mongoose');
const Datasets = mongoose.model('Datasets');

function DatasetsRepository() {
}

DatasetsRepository.prototype.create = function (dataset, done) {
  return Datasets.create(dataset, (error, model) => {
    if (error) {
      return done(error);
    }
    return done(null, model.toObject());
  });
};

DatasetsRepository.prototype.findByName = function (name, done) {
  return Datasets.findOne({name}).lean().exec(done);
};

DatasetsRepository.prototype.findByUser = function (userId, done) {
  return Datasets.find({createdBy: userId}).lean().exec(done);
};

DatasetsRepository.prototype.findPrivateByUser = function (userId, done) {
  return Datasets.find({createdBy: userId, private: true}).lean().exec(done);
};

DatasetsRepository.prototype.findDatasetsInProgressByUser = function (userId, done) {
  return Datasets.find({createdBy: userId, isLocked: true}).lean().exec(done);
};

DatasetsRepository.prototype.findByGithubUrl = function (githubUrl, done) {
  return Datasets.findOne({path: githubUrl}).lean().exec(done);
};

DatasetsRepository.prototype.findByNameAndUser = function (datasetName, userId, done) {
  return Datasets.findOne({name: datasetName, createdBy: userId}).lean().exec(done);
};

DatasetsRepository.prototype.forceLock = function (datasetName, done) {
  return Datasets.findOneAndUpdate({name: datasetName}, {isLocked: true}, {new: 1}).lean().exec(done);
};

DatasetsRepository.prototype.forceUnlock = function (datasetName, done) {
  return Datasets.findOneAndUpdate({name: datasetName}, {isLocked: false}, {new: 1}).lean().exec(done);
};

DatasetsRepository.prototype.unlock = function (datasetName, done) {
  return Datasets.findOneAndUpdate({name: datasetName, isLocked: true}, {isLocked: false}, {new: 1}).lean().exec(done);
};

DatasetsRepository.prototype.lock = function (datasetName, done) {
  return Datasets.findOneAndUpdate({name: datasetName, isLocked: false}, {isLocked: true}, {new: 1}).lean().exec(done);
};

DatasetsRepository.prototype.removeById = function (datasetId, done) {
  return Datasets.findOneAndRemove({_id: datasetId}, done);
};

DatasetsRepository.prototype.setAccessTokenForPrivateDataset = function ({datasetName, userId, accessToken}, done) {
  return Datasets.findOneAndUpdate({name: datasetName, createdBy: userId, private: true}, {accessToken}, {new: 1}, done);
};

module.exports = new DatasetsRepository();
