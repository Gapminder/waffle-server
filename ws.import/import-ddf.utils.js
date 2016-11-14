'use strict';

const _ = require('lodash');
const fs = require('fs');
const hi = require('highland');
const async = require('async');
const validator = require('validator');
const ddfTimeUtils = require('ddf-time-utils');

const Converter = require('csvtojson').Converter;

const RESERVED_PROPERTIES = ['properties', 'dimensions', 'subsetOf', 'from', 'to', 'originId', 'gid', 'domain', 'type', 'languages'];

module.exports = {
  activateLifecycleHook,
  isJson,
  isPropertyReserved,
  parseProperties,
  readCsvFile,
  toNumeric,
  toBoolean
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

function toNumeric(value) {
  const numericValue = value && _.toNumber(value);
  return !_.isNaN(numericValue) && _.isNumber(numericValue) ? numericValue : null;
}

function toBoolean(value) {
  if (value === 'TRUE' || value === 'FALSE') {
    return value === 'TRUE';
  }

  if (_.isBoolean(value)) {
    return Boolean(value);
  }

  return null;
}

function readCsvFile(filepath) {
  return hi(fs.createReadStream(filepath, 'utf-8')
    .pipe(new Converter({constructResult: false}, {objectMode: true})));
}
