import {model, MongooseDocument} from 'mongoose';

const Datasets = model('Datasets');


// TODO: It should be rewrited as a TS class
/* tslint:disable-next-line:no-empty */
function DatasetsRepository(): void {
}

DatasetsRepository.prototype.create = function (dataset: any, done: Function): any {
  return Datasets.create(dataset, (error: string, model: MongooseDocument) => {
    if (error) {
      return done(error);
    }
    return done(null, model.toObject());
  });
};

DatasetsRepository.prototype.findByName = function (name: any, done: Function): Promise<Object> {
  return Datasets.findOne({name}).lean().exec(done);
};

DatasetsRepository.prototype.findByUser = function (userId: any, done: Function): Promise<Object> {
  return Datasets.find({createdBy: userId}).lean().exec(done);
};

DatasetsRepository.prototype.findPrivateByUser = function (userId: any, done: Function): Promise<Object> {
  return Datasets.find({createdBy: userId, private: true}).lean().exec(done);
};

DatasetsRepository.prototype.findDatasetsInProgressByUser = function (userId: any, done: Function): Promise<Object> {
  return Datasets.find({createdBy: userId, isLocked: true}).lean().exec(done);
};

DatasetsRepository.prototype.findByGithubUrl = function (githubUrl: any, done: Function): Promise<Object> {
  return Datasets.findOne({path: githubUrl}).lean().exec(done);
};

DatasetsRepository.prototype.findByNameAndUser = function (datasetName: any, userId: any, done: Function): Promise<Object> {
  return Datasets.findOne({name: datasetName, createdBy: userId}).lean().exec(done);
};

DatasetsRepository.prototype.forceLock = function (datasetName: any, done: Function): Promise<Object> {
  return Datasets.findOneAndUpdate({name: datasetName}, {isLocked: true}, {new: true}).lean().exec(done);
};

DatasetsRepository.prototype.forceUnlock = function (datasetName: any, done: Function): Promise<Object> {
  return Datasets.findOneAndUpdate({name: datasetName}, {isLocked: false}, {new: true}).lean().exec(done);
};

DatasetsRepository.prototype.unlock = function (datasetName: any, done: Function): Promise<Object> {
  return Datasets.findOneAndUpdate({name: datasetName, isLocked: true}, {isLocked: false}, {new: true}).lean().exec(done);
};

DatasetsRepository.prototype.lock = function (datasetName: any, done: Function): Promise<Object> {
  return Datasets.findOneAndUpdate({name: datasetName, isLocked: false}, {isLocked: true}, {new: true}).lean().exec(done);
};

DatasetsRepository.prototype.removeById = function (datasetId: any, done: Function): any {
  return Datasets.findOneAndRemove({_id: datasetId}, done);
};

DatasetsRepository.prototype.setAccessTokenForPrivateDataset = function ({datasetName, userId, accessToken}: any, done: any): any {
  return Datasets.findOneAndUpdate({name: datasetName, createdBy: userId, private: true}, {accessToken}, {new: true}, done);
};

const repository = new DatasetsRepository();
export {repository as DatasetsRepository};
