import { model, MongooseDocument } from 'mongoose';
import * as _ from 'lodash';
import { MongooseCallback } from '../../repository.types';

const Datasets = model('Datasets');

class DatasetsRepository {
  public create(dataset: any, done: Function): any {
    return Datasets.create(dataset, (error: string, modelInstance: MongooseDocument) => {
      if (error) {
        return done(error);
      }
      return done(null, modelInstance.toObject());
    });
  }

  public findAll(done?: Function): Promise<any> {
    return Datasets.find({}).lean().exec(done);
  }

  public findByName(name: any, done: Function): Promise<Object> {
    return Datasets.findOne(this.getDatasetNameQuery(name)).lean().exec(done);
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

  public findByGithubUrl(githubUrl: string, done: Function): Promise<Object> {
    return Datasets.findOne(this.handleMasterEndingForQuery('path', githubUrl)).lean().exec(done);
  }

  public findByNameAndUser(datasetName: any, userId: any, done: Function): Promise<Object> {
    const options = {createdBy: userId};
    return Datasets.findOne(this.getDatasetNameQuery(datasetName, options)).lean().exec(done);
  }

  public forceLock(datasetName: any, done: Function): Promise<Object> {
    return Datasets.findOneAndUpdate(this.getDatasetNameQuery(datasetName), {isLocked: true}, {new: true}).lean().exec(done);
  }

  public forceUnlock(datasetName: any, done: Function): Promise<Object> {
    return Datasets.findOneAndUpdate(this.getDatasetNameQuery(datasetName), {isLocked: false}, {new: true}).lean().exec(done);
  }

  public unlock(datasetName: any, done: Function): Promise<Object> {
    const options = { isLocked: true };
    return Datasets.findOneAndUpdate(this.getDatasetNameQuery(datasetName, options), {isLocked: false}, {new: true}).lean().exec(done);
  }

  public lock(datasetName: any, done: Function): Promise<Object> {
    const options = { isLocked: false };
    return Datasets.findOneAndUpdate(this.getDatasetNameQuery(datasetName, options), {isLocked: true}, {new: true}).lean().exec(done);
  }

  public removeById(datasetId: any, done: MongooseCallback): any {
    return Datasets.findOneAndRemove({_id: datasetId}, done);
  }

  public setAccessTokenForPrivateDataset({datasetName, userId, accessToken}: any, done: Function): any {
    const options = { createdBy: userId, private: true };
    return Datasets.findOneAndUpdate(this.getDatasetNameQuery(datasetName, options), {accessToken}, {new: true}, done as any);
  }

  private getDatasetNameQuery(name: string, options?: any): any {
    const query = this.handleMasterEndingForQuery('name', name);

    if (_.isEmpty(options)) {
      return query;
    }

    return _.extend(query, options);
  }

  private handleMasterEndingForQuery(searchingField: string, searchingFieldValue: string): any {
    if (_.endsWith(searchingFieldValue, '#master')) {
      return {
        $or: [{[searchingField]: searchingFieldValue}, {[searchingField]: _.replace(searchingFieldValue, '#master$', '')}]
      };
    }

    return {[searchingField]: searchingFieldValue};
  }
}

const repository = new DatasetsRepository();
export { repository as DatasetsRepository };
