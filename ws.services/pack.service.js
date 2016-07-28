'use strict';

const _ = require('lodash');
const async = require('async');
const json2csv = require('json2csv');

const wsJsonPack = require('./../ws.routes/data-post-processors/pack/pack-ws.processor.js');
const ddfJsonPack = require('./../ws.routes/data-post-processors/pack/pack-ddf.processor.js');
const ddfJsonUnpack = require('./../ws.routes/data-post-processors/pack/unpack-ddf.processor.js');

// FIXME: packToWsJson, packToCsv, packToJson
module.exports = {
  csv: packToCsv,
  json: packToJson,
  wsJson: packToWsJson,
  default: packToWsJson,
  ddfJson: packToDdfJson
};

function composePackingFunction(data, formatType) {
  switch(true) {
    // case (formatType === 'ddfJson' && _.get(data, 'wsJson', false)):
    //   return async.compose();
    case (formatType === 'ddfJson' && !!_.get(data, 'rawDdf', false)):
      return async.seq(_toDdfJson, _pickDdfJsonProperties);
    case (formatType === 'json' && !!_.get(data, 'rawDdf', false)):
      return async.seq(_toDdfJson, _fromDdfJsonToJson);
    case (formatType === 'wsJson' && !!_.get(data, 'rawDdf', false)):
      return async.compose(_fromRawDdfToWsJson);
    // case (formatType === 'csv' && data):
    //   return async.compose();
    default:
      return async.seq(_toDdfJson);
  }
}

function packToCsv(data, cb) {
  const pipe = {
    headers: data.headers,
    rows: data.rows,
    fields: data.headers,
    quotes: '"'
  };

  return async.waterfall([
    async.constant(data),
    _toWsJson,
    (data, cb) => _toJson(data, (err, json) => cb(null, {headers: data.headers, })),
    _toCsv
  ], cb);
}

function _toCsv(data, _cb) {
  return json2csv({data: data.rows, fields: data.headers, quotes: '"'}, _cb);
}

function packToJson(data, format, cb) {
  const _packFn = composePackingFunction(data, format);

  return _packFn(data, cb);
}

function _toJson(data, cb) {
  const json = _.map(data.rows, row => {
    return _.zipObject(data.headers, row);
  });

  return cb(null, json);
}

function packToWsJson(data, format, cb) {
  const _packFn = composePackingFunction(data, format);

  return _packFn(data, cb);
}

function _fromRawDdfToWsJson(data, cb) {
  const rawDdf = _.get(data, 'rawDdf', {});
  let json;

  // TODO: should be covered by unittest
  switch (true) {
    case (!_.isEmpty(rawDdf.datapoints)):
      json = wsJsonPack.mapDatapoints(rawDdf);
      break;
    case (!_.isEmpty(rawDdf.entities)):
      json = wsJsonPack.mapEntities(rawDdf);
      break;
    case (!_.isEmpty(rawDdf.concepts)):
      json = wsJsonPack.mapConcepts(rawDdf);
      break;
    default:
      json = {};
      break;
  }

  return async.setImmediate(() => cb(null, json));
}

function packToDdfJson(data, format, cb) {
  const _packFn = composePackingFunction(data, format);

  return _packFn(data, cb);
}

function _toDdfJson(data, cb) {
  const rawDdf = _.get(data, 'rawDdf', data);
  const json = {};

  if (_.isEmpty(rawDdf)) {
    return async.setImmediate(() => cb(null, json));
  }

  const concepts = ddfJsonPack.packConcepts(rawDdf);
  json.concepts = concepts.packed;

  if (_.isEmpty(rawDdf.entities)) {
    return async.setImmediate(() => cb(null, json));
  }

  const entities = ddfJsonPack.packEntities(rawDdf);
  json.entities = entities.packed;

  if (_.isEmpty(rawDdf.datapoints)) {
    return async.setImmediate(() => cb(null, json));
  }

  const datapoints = ddfJsonPack.packDatapoints(rawDdf, entities.meta.entityByOriginId);
  json.datapoints = datapoints.packed;

  return async.setImmediate(() => cb(null, json));
}

// FIXME: to remove when vizabi could read all geo props from ddfJson
function _pickDdfJsonProperties(data, cb) {
  const json = {
    concepts: _.pick(data.concepts, ['values']),
    entities: _.pick(data.entities, ['values', 'rows']),
    datapoints: data.datapoints
  };

  return async.setImmediate(() => cb(null, json));
}

function _fromDdfJsonToJson(data, cb) {
  let json;

  switch (true) {
    case (!!_.get(data, 'datapoints.values.0', false)):
      json = ddfJsonUnpack.unpackDdfDatapoints(data);
      break;
    case (!!_.get(data, 'entities.values.0', false)):
      json = ddfJsonUnpack.unpackDdfEntities(data);
      break;
    case (!!_.get(data, 'concepts.values.0', false)):
      json = ddfJsonUnpack.unpackDdfConcepts(data);
      break;
    default:
      json = {};
      break;
  }

  return async.setImmediate(() => cb(null, json))
}
