'use strict';

const _ = require('lodash');
const async = require('async');

const wsJsonPack = require('../ws.routes/data-post-processors/format/format-ws.processor');
const constants = require('../ws.utils/constants');

module.exports = {
  wsJson: packToWsJson,
  default: packToWsJson,
};

function packToWsJson(data, format, onSendResponse) {
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

  return async.setImmediate(() => onSendResponse(null, json));
}
