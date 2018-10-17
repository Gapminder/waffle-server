import '../ws.config/config';
import * as _ from 'lodash';

export {
  findDefaultDatasetAndTransaction,
  translateDocument
};

function findDefaultDatasetAndTransaction(pipe: any, done: Function): void {
  const config = pipe.appConfig;

  if (!_.get(config, 'DEFAULT_DATASET', null)) {
    return done('Dataset isn\'t present.');
  }
  if (!_.get(config, 'DEFAULT_DATASET_VERSION', null)) {
    return done('Transaction isn\'t present.');
  }

  pipe.dataset = config.DEFAULT_DATASET;
  pipe.transaction = config.DEFAULT_DATASET_VERSION;
  pipe.version = Date.now();

  return done(null, pipe);
}

function translateDocument(target: any, language: string): any {
  if (!language) {
    return target.properties;
  }

  const translatedProperties = _.get(target.languages, language, {});
  if (_.isEmpty(translatedProperties)) {
    return target.properties;
  }

  return _.extend({}, target.properties, translatedProperties);
}
