'use strict';

const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const hi = require('highland');

const logger = require('../ws.config/log');
const ddfUtils = require('./utils/import-ddf.utils');
const constants = require('../ws.utils/constants');
const datapointsUtils = require('./utils/datapoints.utils');

module.exports = startDatapointsCreation;

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
      return ddfUtils.readCsvFileAsStream(pathToDdfFolder, context.filename)
        .map(datapoint => ({datapoint, context}));
    })
    .parallel(ddfUtils.MONGODB_DOC_CREATION_THREADS_AMOUNT)
    .map(({datapoint, context}) => {
      const entitiesFoundInDatapoint = datapointsUtils.findEntitiesInDatapoint(datapoint, context, externalContextFrozen);
      return {datapoint, entitiesFoundInDatapoint, context};
    });

  return saveDatapointsAndEntitiesFoundInThem(datapointsAndFoundEntitiesStream);
}
