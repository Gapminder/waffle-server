'use strict';

const _ = require('lodash');
const async = require('async');
const validator = require('validator');

const RESERVED_PROPERTIES = ['properties', 'dimensions', 'subsetOf', 'from', 'to', 'originId', 'gid', 'domain', 'type'];

module.exports = {
  activateLifecycleHook,
  isJson,
  isPropertyReserved
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

