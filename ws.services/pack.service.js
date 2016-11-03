'use strict';

const _ = require('lodash');
const async = require('async');
const json2csv = require('json2csv');

const wsJsonPack = require('./../ws.routes/data-post-processors/pack/pack-ws.processor.js');
const ddfJsonPack = require('./../ws.routes/data-post-processors/pack/pack-ddf.processor.js');
const ddfJsonUnpack = require('./../ws.routes/data-post-processors/pack/unpack-ddf.processor.js');

const constants = require('./../ws.utils/constants');

// FIXME: packToWsJson, packToCsv, packToJson
module.exports = {
  csv: packToCsv,
  json: packToJson,
  wsJson: packToWsJson,
  default: packToWsJson,
  ddfJson: packToDdfJson
};

function composePackingFunction(data, formatType) {
  const rawDdf = !!_.get(data, 'rawDdf', false);
  if (formatType === 'ddfJson' && rawDdf) {
    return async.seq(_toDdfJson, _pickDdfJsonProperties);
  } else if (formatType === 'json' && rawDdf) {
    return async.seq(_toDdfJson, _fromDdfJsonToJson);
  } else {
    return _fromRawDdfToWsJson;
  }
}

function packToCsv(data, onSendResponse) {
  const pipe = {
    headers: data.headers,
    rows: data.rows,
    fields: data.headers,
    quotes: '"'
  };

  return async.waterfall([
    async.constant(data),
    _toWsJson,
    (data, next) => _toJson(data, (err, json) => next(null, {headers: data.headers, })),
    _toCsv
  ], onSendResponse);
}

function _toCsv(data, next) {
  return json2csv({data: data.rows, fields: data.headers, quotes: '"'}, next);
}

function packToJson(data, format, onSendResponse) {
  const _packFn = composePackingFunction(data, format);

  return _packFn(data, onSendResponse);
}

function _toJson(data, next) {
  const json = _.map(data.rows, row => {
    return _.zipObject(data.headers, row);
  });

  return next(null, json);
}

function packToWsJson(data, format, onSendResponse) {
  const _packFn = composePackingFunction(data, format);

  return _packFn(data, onSendResponse);
}

function _fromRawDdfToWsJson(data, next) {
  const rawDdf = _.get(data, 'rawDdf', {});
  rawDdf.datasetName = _.get(data, 'rawDdf.dataset.name');
  rawDdf.datasetVersion = _.get(data, 'rawDdf.transaction.commit');

  const ddfDataType = _.get(data, 'type');

  let json = {};

  if (ddfDataType === constants.DATAPOINTS) {
    json = wsJsonPack.mapDatapoints(rawDdf);
  } else if (ddfDataType === constants.ENTITIES) {
    json = wsJsonPack.mapEntities(rawDdf);
  } else if (ddfDataType === constants.CONCEPTS) {
    json = wsJsonPack.mapConcepts(rawDdf);
  } else if (ddfDataType === constants.SCHEMA) {
    json = wsJsonPack.mapSchema(rawDdf);
  }

  return async.setImmediate(() => next(null, json));
}

function packToDdfJson(data, format, onSendResponse) {
  const _packFn = composePackingFunction(data, format);

  return _packFn(data, onSendResponse);
}

function _toDdfJson(data, next) {
  const rawDdf = _.get(data, 'rawDdf', data);
  const ddfDataType = _.get(data, 'type');
  const json = {};

  if (!_.isEmpty(rawDdf)) {
    if (ddfDataType === constants.DATAPOINTS) {
      const concepts = ddfJsonPack.packConcepts(rawDdf);
      json.concepts = concepts.packed;

      const entities = ddfJsonPack.packEntities(rawDdf);
      json.entities = entities.packed;

      const datapoints = ddfJsonPack.packDatapoints(rawDdf, entities.meta.entityByOriginId);
      json.datapoints = datapoints.packed;
    } else if (ddfDataType === constants.CONCEPTS) {
      const concepts = ddfJsonPack.packConcepts(rawDdf);
      json.concepts = concepts.packed;
    } else if (ddfDataType === constants.ENTITIES) {
      const concepts = ddfJsonPack.packConcepts(rawDdf);
      json.concepts = concepts.packed;

      const entities = ddfJsonPack.packEntities(rawDdf);
      json.entities = entities.packed;
    }
  }

  return async.setImmediate(() => next(null, {json, ddfDataType}));
}

// FIXME: to remove when vizabi could read all geo props from ddfJson
function _pickDdfJsonProperties(data, next) {
  const json = {
    concepts: data.json.concepts,
    entities: data.json.entities,
    datapoints: data.json.datapoints
  };

  return async.setImmediate(() => next(null, json));
}

function _fromDdfJsonToJson(data, next) {
  let json;

  if (data.ddfDataType === constants.DATAPOINTS) {
    json = ddfJsonUnpack.unpackDdfDatapoints(data.json);
  } else if (data.ddfDataType === constants.ENTITIES) {
    json = ddfJsonUnpack.unpackDdfEntities(data.json);
  } else if (data.ddfDataType === constants.CONCEPTS) {
    json = ddfJsonUnpack.unpackDdfConcepts(data.json);
  } else {
    json = {};
  }

  return async.setImmediate(() => next(null, json));
}
