import { model, MongooseDocument } from 'mongoose';
import * as _ from 'lodash';
import { MongoCallback } from 'mongodb';
import { MongooseCallback } from '../../repository.types';

const Datasets = model('Datasets');

class DatasetsRepository {
  public create(dataset: any, done: Function): any {
    return Datasets.create(dataset, (error: string, model: MongooseDocument) => {
      if (error) {
        return done(error);
      }
      return done(null, model.toObject());
    });
  }

  public findAll(done?: Function): Promise<any> {
    return Datasets.find({}).lean().exec(done);
  }

  public findByName(name: any, done: Function): Promise<Object> {
    let query: any = {name};
    if (_.endsWith(name, '#master')) {
      query = {
        $or: [{name}, {name: _.trimEnd(name, '#master')}]
      };
    }
    return Datasets.findOne({name}).lean().exec(done);
  }

  public findByUser(userId: any, done: Function): Promise<Object> {
    return Datasets.find({createdBy: userId}).lean().exec(done);
  }

  public findPrivateByUser(userId: any, done: Function): Promise<Object> {
    return Datasets.find({createdBy: userId, private: true}).lean().exec(done);
  }

  public findDatasetsInProgressByUser(userId: any, done: Function): Promise<Object> {
    return Datasets.find({createdBy: userId, isLocked: true}).lean().exec(done);
  }

  public findByGithubUrl(githubUrl: any, done: Function): Promise<Object> {
    return Datasets.findOne({path: githubUrl}).lean().exec(done);
  }

  public findByNameAndUser(datasetName: any, userId: any, done: Function): Promise<Object> {
    return Datasets.findOne({name: datasetName, createdBy: userId}).lean().exec(done);
  }

  public forceLock(datasetName: any, done: Function): Promise<Object> {
    return Datasets.findOneAndUpdate({name: datasetName}, {isLocked: true}, {new: true}).lean().exec(done);
  }

  public forceUnlock(datasetName: any, done: Function): Promise<Object> {
    return Datasets.findOneAndUpdate({name: datasetName}, {isLocked: false}, {new: true}).lean().exec(done);
  }

  public unlock(datasetName: any, done: Function): Promise<Object> {
    return Datasets.findOneAndUpdate({
      name: datasetName,
      isLocked: true
    }, {isLocked: false}, {new: true}).lean().exec(done);
  }

  public lock(datasetName: any, done: Function): Promise<Object> {
    return Datasets.findOneAndUpdate({
      name: datasetName,
      isLocked: false
    }, {isLocked: true}, {new: true}).lean().exec(done);
  }

  public removeById(datasetId: any, done: MongooseCallback): any {
    return Datasets.findOneAndRemove({_id: datasetId}, done);
  }

  public setAccessTokenForPrivateDataset({datasetName, userId, accessToken}: any, done: Function): any {
    return Datasets.findOneAndUpdate({
      name: datasetName,
      createdBy: userId,
      private: true
    }, {accessToken}, {new: true}, done as any);
  }
}

const repository = new DatasetsRepository();
export { repository as DatasetsRepository };
