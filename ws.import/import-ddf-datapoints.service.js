'use strict';

const _ = require('lodash');
const hi = require('highland');
const fs = require('fs');

const Converter = require('csvtojson').Converter;

const logger = require('../ws.config/log');
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
    'resolvePath'
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

  const datapointsAndFoundEntitiesStream = hi.wrapCallback(fs.readdir)(externalContextFrozen.pathToDdfFolder)
    .flatMap(filenames => hi(filenames))
    .filter(filename => /^ddf--datapoints--/.test(filename))
    .flatMap(filename => {
      const {measures, dimensions} = datapointsUtils.parseFilename(filename, externalContextFrozen);
      return hi(findAllEntitiesMemoized(externalContextFrozen))
        .map(segregatedEntities => ({filename, measures, dimensions, segregatedEntities}));
    })
    .map(context => {
      return readCsvFile(externalContextFrozen.resolvePath(context.filename), {})
        .map(datapoint => ({datapoint, context}));
    })
    .parallel(MONGODB_DOC_CREATION_THREADS_AMOUNT)
    .map(({datapoint, context}) => {
      const entitiesFoundInDatapoint = datapointsUtils.findEntitiesInDatapoint(datapoint, context, externalContextFrozen);
      return {datapoint, entitiesFoundInDatapoint, context};
    });

  return saveDatapointsAndEntitiesFoundInThem(datapointsAndFoundEntitiesStream);
}

function readCsvFile(filepath) {
  return hi(fs.createReadStream(filepath, 'utf-8')
    .pipe(new Converter({constructResult: false}, {objectMode: true})));
}
