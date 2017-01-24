import * as _ from 'lodash';
import * as hi from 'highland';
import {logger} from '../ws.config/log';
import * as ddfImportUtils from './utils/import-ddf.utils';
import {constants} from '../ws.utils/constants';
import * as fileUtils from '../ws.utils/file';
import * as datapointsUtils from './utils/datapoints.utils';

export {
  startDatapointsCreation as createDatapoints
};

function startDatapointsCreation(externalContext, done) {
  logger.info('start process creating data points');

  const externalContextFrozen = Object.freeze(_.pick(externalContext, [
    'pathToDdfFolder',
    'datapackage',
    'concepts',
    'timeConcepts',
    'transaction',
    'dataset'
  ]));

  const datapointsCreateStream = createDatapoints(externalContextFrozen);
  ddfImportUtils.startStreamProcessing(datapointsCreateStream, externalContext, done);
};

function createDatapoints(externalContextFrozen) {
  const {pathToDdfFolder, datapackage: {resources}} = externalContextFrozen;
  const findAllEntitiesMemoized = _.memoize(datapointsUtils.findAllEntities);

  const saveEntitiesFoundInDatapoints = datapointsUtils.createEntitiesFoundInDatapointsSaverWithCache();

  const saveDatapointsAndEntitiesFoundInThem = _.curry(datapointsUtils.saveDatapointsAndEntitiesFoundInThem)(
    saveEntitiesFoundInDatapoints,
    externalContextFrozen
  );

  const datapointsAndFoundEntitiesStream = hi(resources)
    .filter(resource => resource.type === constants.DATAPOINTS)
    .flatMap(resource => {
      const {measures, dimensions} = datapointsUtils.getDimensionsAndMeasures(resource, externalContextFrozen);
      return hi(findAllEntitiesMemoized(externalContextFrozen))
        .map(segregatedEntities => ({filename: resource.path, measures, dimensions, segregatedEntities}));
    })
    .map(context => {
      return fileUtils.readCsvFileAsStream(pathToDdfFolder, context.filename)
        .map(datapoint => ({datapoint, context}));
    })
    .parallel(ddfImportUtils.MONGODB_DOC_CREATION_THREADS_AMOUNT)
    .map(({datapoint, context}) => {
      const entitiesFoundInDatapoint = datapointsUtils.findEntitiesInDatapoint(datapoint, context, externalContextFrozen);
      return {datapoint, entitiesFoundInDatapoint, context};
    });

  return saveDatapointsAndEntitiesFoundInThem(datapointsAndFoundEntitiesStream);
}
