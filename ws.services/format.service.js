'use strict';

const _ = require('lodash');
const async = require('async');
const hi = require('highland');
const fastCsv = require('fast-csv');
const wsJsonPack = require('../ws.routes/data-post-processors/format/format-ws.processor');
const constants = require('../ws.utils/constants');

const toFormatter = _.curry(sendResponse);
const csvFormatter = toFormatter(packToCsv);
const wsJsonFormatter = toFormatter(packToWsJson);

module.exports = {
  csv: csvFormatter,
  wsJson: wsJsonFormatter,
  default: wsJsonFormatter,
};

function packToCsv(data) {
  const wsJson = packToWsJson(data);
  return hi(wsJson.rows).map(row => _.zipObject(wsJson.headers, row)).pipe(fastCsv.createWriteStream({headers: true}));
}

function packToWsJson(data) {
  const rawDdf = _.get(data, 'rawDdf', {});
  rawDdf.datasetName = _.get(data, 'rawDdf.dataset.name');
  rawDdf.datasetVersionCommit = _.get(data, 'rawDdf.transaction.commit');

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

  return json;
}

function sendResponse(format, data, onSendResponse) {
  return async.setImmediate(() => onSendResponse(null, format(data)));
}
