const _ = require('lodash');
const validator = require('validator');

const LIMIT_NUMBER_PROCESS = 10;
const MAX_VALUE = Number.MAX_SAFE_INTEGER;
const RESERVED_PROPERTIES = ['properties', 'dimensions', 'subsetOf', 'from', 'to', 'originId', 'gid', 'domain', 'type'];

module.exports = {
  MAX_VALUE,
  LIMIT_NUMBER_PROCESS,
  isJson,
  isPropertyReserved
};

function isPropertyReserved(property) {
  return _.includes(RESERVED_PROPERTIES, property);
}

function isJson(value) {
  return isJsonLike(value) && validator.isJSON(value);
}

function isJsonLike(value) {
  return /^\[.*\]$|^{.*}$/g.test(value);
}
