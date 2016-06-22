'use strict';

const _ = require('lodash');
const json2csv = require('json2csv');

const wsJsonPack = require('./../ws.routes/data-post-processors/pack/pack-ws.processor.js');
const ddfJsonPack = require('./../ws.routes/data-post-processors/pack/pack-ddf.processor.js');

module.exports = {
  csv: packToCsv,
  json: packToJson,
  wsJson: packToWsJson,
  default: packToWsJson,
  ddfJson: packToDdfJson
};


function packToCsv(data, cb) {
  return _toWsJson(data, (error, rows) => _toCsv(data.headers, rows, cb));
}

function _toCsv(headers, rows, cb) {
  _toJson(headers, rows, (err, json) => {
    return json2csv({data: json, fields: headers, quotes: '"'}, (err, csv) => {
      if (err) {
        return cb(err);
      }

      return cb(null, csv);
    });
  });
}

function packToJson(data, cb) {
  return _toWsJson(data, (error, rows) => _toJson(data.headers, rows, cb));
}

function _toJson(headers, rows, cb) {
  const json = _.map(rows, row => {
    return _.zipObject(headers, row);
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
  const entities = data.entities;
  const datapoints = data.datapoints;
  const rows = data.rows;

  if (!_.isEmpty(rows)) {
    return cb(null, rows);
  }

  // TODO: should be covered by unittest
  if (!_.isEmpty(datapoints)) {
    return wsJsonPack.mapDatapoints(data, cb);
  }

  // TODO: should be covered by unittest
  if (!_.isEmpty(entities)) {
    return wsJsonPack.mapEntities(data, cb);
  }

  // TODO: should be covered by unittest
  return wsJsonPack.mapConcepts(data, cb);
}

function packToDdfJson(data, cb) {
  return _toDdfJson(data, cb);
}

function _toDdfJson(data, cb) {
  const json = {};

  const concepts = ddfJsonPack.packConcepts(data);
  json.concepts = concepts.packed;

  if (_.isEmpty(data.entities)) {
    return cb(null, json);
  }

  const entities = ddfJsonPack.packEntities(data);
  json.entities = entities.packed;

  if (_.isEmpty(data.datapoints)) {
    return cb(null, json);
  }

  const datapoints = ddfJsonPack.packDatapoints(data, entities.meta.entityByOriginId);
  json.datapoints = datapoints.packed;

  return cb(null, json);
}
