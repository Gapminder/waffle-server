'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const hi = require('highland');
const async = require('async');
const validator = require('validator');
const ddfTimeUtils = require('ddf-time-utils');

const Converter = require('csvtojson').Converter;
const constants = require('../ws.utils/constants');

const reposService = require('../ws.services/repos.service');

const RESERVED_PROPERTIES = ['properties', 'dimensions', 'subsetOf', 'from', 'to', 'originId', 'gid', 'domain', 'type', 'languages'];

module.exports = {
  activateLifecycleHook,
  isJson,
  isPropertyReserved,
  parseProperties,
  readCsvFile,
  resolveFilePathsToDdfFolder
};

function activateLifecycleHook(hookName) {
  const actualParameters = [].slice.call(arguments, 1);
  return (pipe, done) => {
    if (pipe.lifecycleHooks && pipe.lifecycleHooks[hookName]) {
      pipe.lifecycleHooks[hookName](actualParameters);
    }
    return async.setImmediate(() => {
      return done(null, pipe);
    });
  };
}

function isPropertyReserved(property) {
  return _.includes(RESERVED_PROPERTIES, property);
}

function isJson(value) {
  return isJsonLike(value) && validator.isJSON(value);
}

function isJsonLike(value) {
  return /^\[.*\]$|^{.*}$/g.test(value);
}

function parseProperties(concept, entityGid, entityProperties, timeConcepts) {
  if (_.isEmpty(timeConcepts)) {
    return {};
  }

  let parsedProperties =
    _.chain(entityProperties)
      .pickBy((propValue, prop) => timeConcepts[prop])
      .mapValues(toInternalTimeForm)
      .value();

  if (timeConcepts[concept.gid]) {
    parsedProperties = _.extend(parsedProperties || {}, {[concept.gid]: toInternalTimeForm(entityGid)});
  }
  return parsedProperties;
}

function toInternalTimeForm(value) {
  const timeDescriptor = ddfTimeUtils.parseTime(value);
  return {
    millis: _.get(timeDescriptor, 'time'),
    timeType: _.get(timeDescriptor, 'type')
  };
}

function readCsvFile(absoluteFilepath) {
  return hi(fs.createReadStream(absoluteFilepath, 'utf-8')
    .pipe(new Converter({constructResult: false}, {objectMode: true})));
}

function groupFiles(datapackage, pathToDdfFolder) {
  const resources = _.get(datapackage, `resources`, []);

  return _.chain(resources)
    .map(_.partial(prefixResourcePath, pathToDdfFolder))
    .groupBy(groupResourcesByModel)
    .mapValues(resources => _.uniqBy(resources, 'path'))
    .value();
}

function prefixResourcePath (pathToDdfFolder, resource) {
  let primaryKey = _.get(resource, 'schema.primaryKey');

  return _.defaultsDeep({
    absolutePath: path.resolve(pathToDdfFolder, resource.path),
    schema: {
      primaryKey: _.isString(primaryKey) ? [primaryKey] : primaryKey
    }
  }, resource);
}

function groupResourcesByModel (resource) {
  let primaryKey = _.get(resource, 'schema.primaryKey');

  if (primaryKey.length > 1)
    return constants.DATAPOINTS;

  if (_.includes(constants.CONCEPTS, _.first(primaryKey)))
    return constants.CONCEPTS;

  return constants.ENTITIES;
}

function resolveFilePathsToDdfFolder(pipe, done) {
  const pathToDdfFolder = reposService.getPathToRepo(pipe.datasetName);

  fs.readFile(path.resolve(pathToDdfFolder, 'datapackage.json'), 'utf-8', (err, datapackageString) => {
    const datapackage = JSON.parse(datapackageString);

    pipe.pathToDdfFolder = pathToDdfFolder;
    pipe.datapackage = datapackage;
    pipe.changedFilenames = _.keys(pipe.allChanges);
    pipe.files = Object.freeze({
      byModels: groupFiles(datapackage, pathToDdfFolder),
      byPaths: _.chain(datapackage.resources).keyBy('path').mapValues(_.partial(prefixResourcePath, pathToDdfFolder)).value()
    });

    return done(null, pipe);
  });
}
