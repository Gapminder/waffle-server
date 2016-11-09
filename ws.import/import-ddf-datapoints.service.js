'use strict';

const _ = require('lodash');
const hi = require('highland');
const fs = require('fs');

const logger = require('../ws.config/log');
const ddfUtils = require('./import-ddf.utils');
const constants = require('../ws.utils/constants');
const datapointsUtils = require('./datapoints.utils');

const MONGODB_DOC_CREATION_THREADS_AMOUNT = 3;

module.exports = startDatapointsCreation;

function startDatapointsCreation(externalContext, done) {
  logger.info('start process creating data points');

  const externalContextFrozen = Object.freeze(_.pick(externalContext, [
    'pathToDdfFolder',
    'concepts',
    'timeConcepts',
    'transaction',
    'dataset',
    'filePaths'
  ]));

  const errors = [];
  createDatapoints(externalContextFrozen)
    .stopOnError(error => {
      errors.push(error);
    })
    .done(() => {
      if (!_.isEmpty(errors)) {
        return done(errors, externalContext);
      }
      return done(null, externalContext);
    });
}

function createDatapoints(externalContextFrozen) {
  const findAllEntitiesMemoized = _.memoize(datapointsUtils.findAllEntities);

  const saveEntitiesFoundInDatapoints = datapointsUtils.createEntitiesFoundInDatapointsSaverWithCache();

  const saveDatapointsAndEntitiesFoundInThem = _.curry(datapointsUtils.saveDatapointsAndEntitiesFoundInThem)(
    saveEntitiesFoundInDatapoints,
    externalContextFrozen
  );

  const datapointsAndFoundEntitiesStream = hi(externalContextFrozen.filePaths[constants.DATAPOINTS])
    .flatMap(datapointFile => {
      const {measures, dimensions} = datapointsUtils.parseDatapackageSchema(datapointFile, externalContextFrozen);
      return hi(findAllEntitiesMemoized(externalContextFrozen))
        .map(segregatedEntities => ({datapointFile, measures, dimensions, segregatedEntities}));
    })
    .map(context => {
      return ddfUtils.readCsvFile(context.datapointFile.path, {})
        .map(datapoint => ({datapoint, context}));
    })
    .parallel(MONGODB_DOC_CREATION_THREADS_AMOUNT)
    .map(({datapoint, context}) => {
      const entitiesFoundInDatapoint = datapointsUtils.findEntitiesInDatapoint(datapoint, context, externalContextFrozen);
      return {datapoint, entitiesFoundInDatapoint, context};
    });

  return saveDatapointsAndEntitiesFoundInThem(datapointsAndFoundEntitiesStream);
}
