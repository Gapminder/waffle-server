'use strict';

var zipObject = require('lodash').zipObject;

module.exports = {
  decodeParam,
  encodeParam,
  toObject
};

function encodeParam(param, depth) {
  return mapParams(depth)(param);
}

function mapParams(depth) {
  if (!depth) {
    return _map;
  }

  return _mapRange;
}

function _map(v, i) {
  // if falsy value
  if (!v) {
    return v;
  }

  // if value is string or number
  if (v.toString() === v || _isNumber(v)) {
    return v;
  }

  // if value is array
  if (Array.isArray(v)) {
    return v.map(mapParams(1)).join();
  }

  if (typeof v === 'object') {
    return _toArray(v).map(mapParams(1)).join();
  }

  return v;
}

function _mapRange(v) {
  return encodeURI(v).replace(/,/g, ':')
}

function _isNumber(value) {
  return parseInt(value, 10) == value;
}

function _toArray(object) {
  return Object.keys(object).map(function(key) {
    if (object[key] === true) {
      return [key];
    }

    return [key, object[key]];
  })
}

function decodeParam(v, toObject) {
  if (!v) {
    return v;
  }
  var arr = v
    .split(',')
    .map(function (sv) {
      var r = sv.split(':').map(function(value) {
        return _isNumber(value) ? parseInt(value, 10) : value;
      });
      return r.length === 1 ? r[0] : r;
    });

  var result = arr.length === 1 && arr[0].length === 1 ? arr[0] : arr;

  return toObject && typeof toObject === 'function' ? toObject(result) : result;
}

function toObject(array) {
  var keyValuePairs = array.map(function(value) {
    if (Array.isArray(value)) {
      return value;
    }

    return [value, true];
  });

  return zipObject(keyValuePairs);
}
