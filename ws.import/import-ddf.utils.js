'use strict';

const _ = require('lodash');
const async = require('async');
const validator = require('validator');
const ddfTimeUtils = require('ddf-time-utils');

const RESERVED_PROPERTIES = ['properties', 'dimensions', 'subsetOf', 'from', 'to', 'originId', 'gid', 'domain', 'type', 'languages'];

module.exports = {
  activateLifecycleHook,
  isJson,
  isPropertyReserved,
  parseProperties
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
