'use strict';

const _ = require('lodash');
const async = require('async');
const json2csv = require('json2csv');

const wsJsonPack = require('./../ws.routes/data-post-processors/pack/pack-ws.processor.js');
const ddfJsonPack = require('./../ws.routes/data-post-processors/pack/pack-ddf.processor.js');

// FIXME: packToWsJson, packToCsv, packToJson
module.exports = {
  csv: packToCsv,
  json: packToJson,
  wsJson: packToWsJson,
  default: packToWsJson,
  ddfJson: packToDdfJson
};

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

function packToJson(data, _cb) {
  const cb = (error, rows) => _toJson(data.headers, rows, _cb);

  return _toWsJson(data, cb);
}

function _toJson(data, cb) {
  const json = _.map(data.rows, row => {
    return _.zipObject(data.headers, row);
  });

  return cb(null, json);
}

function packToWsJson(data, cb) {
  return _toWsJson(data, (error, rows) => {
    return cb(error, {
      headers: data.headers,
      rows
    });
  });
}

function _toWsJson(data, cb) {
  const rawDdf = _.get(data, 'rawDdf', {});
  const rows = _.get(data, 'wsJson.rows', null);

  if (!_.isEmpty(rows)) {
    return cb(null, {wsJson: {headers: data.headers, rows}});
  }

  if (_.isEmpty(rawDdf)) {
    return cb(null, {wsJson: {}});
  }

  // TODO: should be covered by unittest
  if (!_.isEmpty(rawDdf.datapoints)) {
    return wsJsonPack.mapDatapoints(data, cb);
  }

  // TODO: should be covered by unittest
  if (!_.isEmpty(rawDdf.entities)) {
    return wsJsonPack.mapEntities(data, cb);
  }

  // TODO: should be covered by unittest
  return wsJsonPack.mapConcepts(data, cb);
}

function packToDdfJson(data, cb) {
  return _toDdfJson(data, cb);
}

function _toDdfJson(data, cb) {
  const rawDdf = _.get(data, 'rawDdf', data);
  const json = {};

  if (_.isEmpty(rawDdf)) {
    return cb(null, json);
  }

  const concepts = ddfJsonPack.packConcepts(rawDdf);
  json.concepts = concepts.packed;

  if (_.isEmpty(rawDdf.entities)) {
    return cb(null, json);
  }

  const entities = ddfJsonPack.packEntities(rawDdf);
  json.entities = entities.packed;

  if (_.isEmpty(rawDdf.datapoints)) {
    return cb(null, json);
  }

  const datapoints = ddfJsonPack.packDatapoints(rawDdf, entities.meta.entityByOriginId);
  json.datapoints = datapoints.packed;

  return cb(null, json);
}
