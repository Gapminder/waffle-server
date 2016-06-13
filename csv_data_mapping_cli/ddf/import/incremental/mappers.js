'use strict';

const _ = require('lodash');
const utils = require('./utils');

const JSON_COLUMNS = ['color', 'scales', 'drill_up'];

module.exports = {
  mapDdfConceptsToWsModel
};

function mapDdfConceptsToWsModel(version, datasetId, transactionId) {
  return entry => {
    let transformedEntry = transformPropsToJsonWherePossible(entry);

    return {
      gid: transformedEntry.concept,

      title: transformedEntry.name || transformedEntry.title,
      type: transformedEntry.concept_type === 'time' ? 'entity_domain' : transformedEntry.concept_type,

      tags: transformedEntry.tags,
      tooltip: transformedEntry.tooltip,
      indicatorUrl: transformedEntry.indicator_url,
      color: transformedEntry.color,
      unit: transformedEntry.unit,
      scales: transformedEntry.scales,
      properties: transformedEntry,

      domain: null,
      subsetOf: [],
      dimensions: [],

      from: version,
      to: utils.MAX_VALUE,
      dataset: datasetId,
      transaction: transactionId
    };
  };
}

function isJsonColumn(column) {
  return _.includes(JSON_COLUMNS, column);
}

function transformPropsToJsonWherePossible(object) {
  return _.transform(object, (result, value, key) => {
    if (isJsonColumn(key)) {
      result[key] = utils.isJson(value) ? JSON.parse(value) : null;
    } else {
      result[key] = value;
    }
  }, {});
}
