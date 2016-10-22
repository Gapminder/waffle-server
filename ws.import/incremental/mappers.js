'use strict';

const _ = require('lodash');
const ddfTimeUtils = require('ddf-time-utils');

const constants = require('../../ws.utils/constants');
const logger = require('../../ws.config/log');
const ddfImportProcess = require('../../ws.utils/ddf-import-process');

const JSON_COLUMNS = ['color', 'scales', 'drill_up'];

module.exports = {
  mapDdfConceptsToWsModel,
  mapDdfInDatapointsFoundEntityToWsModel,
  mapDdfDataPointToWsModel
};

function mapDdfDataPointToWsModel(pipe) {
  return function (entry) {
    let isValidEntry = _.chain(entry)
      .values()
      .every((value, key) => !(_.isNil(value) && key === 'originId'))
      .value();

    if (!isValidEntry) {
      return [];
    }

    const dimensions = _.chain(entry)
      .pick(_.keys(pipe.dimensions))
      .reduce((result, entityGid, conceptGid) => {
        const key = `${entityGid}-${pipe.concepts[conceptGid].originId}`;
        const entity =
          pipe.entities.byDomain[key]
          || pipe.entities.bySet[key]
          || pipe.entities.byGid[entityGid]
          || pipe.entities.foundInDatapointsByGid[entityGid];

        result.push(entity.originId);
        return result;
      }, [])
      .value();

    return _.chain(entry)
      .pick(_.keys(pipe.measures))
      .map((datapointValue, measureGid) => {
        const datapointValueAsNumber = _.toNumber(datapointValue);
        return {
          value: _.isNaN(datapointValueAsNumber) ? datapointValue : datapointValueAsNumber,
          measure: pipe.measures[measureGid].originId,
          dimensions: dimensions,
          originId: entry.originId,

          isNumeric: _.isNumber(entry[measureGid]),
          from: pipe.transaction.createdAt,
          dataset: pipe.dataset._id,
          sources: [pipe.filename],
          transaction: pipe.transactionId || pipe.transaction._id
        };
      })
      .value();
  };
}

function mapDdfInDatapointsFoundEntityToWsModel(entity, concept, domain, context, externalContext) {
  const gid = entity[concept.gid];
  return {
    gid: gid,
    sources: [context.filename || filename],
    properties: entity,
    parsedProperties: parseProperties(concept, gid, entity, externalContext.timeConcepts),

    // originId: entity.originId,
    domain: domain.originId,
    sets: concept.type === 'entity_set' ? [concept.originId] : [],
    drillups: [],

    from: externalContext.transaction.createdAt,
    dataset: externalContext.dataset._id,
    transaction: externalContext.transactionId || externalContext.transaction._id
  };
}

function parseProperties(concept, entityGid, entityProperties, timeConcepts) {
  if (_.isEmpty(timeConcepts)) {
    return {};
  }

  let parsedProperties =
    _.chain(entityProperties)
      .pickBy((propValue, prop) => timeConcepts[prop])
      .mapValues(toInternalTimeForm)
      .value();

  if (timeConcepts[concept.gid]) {
    parsedProperties = _.extend(parsedProperties || {}, {[concept.gid]: toInternalTimeForm(entityGid)});
  }
  return parsedProperties;
}

function toInternalTimeForm(value) {
  const timeDescriptor = ddfTimeUtils.parseTime(value);
  return {
    millis: _.get(timeDescriptor, 'time'),
    timeType: _.get(timeDescriptor, 'type')
  };
}

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
      to: constants.MAX_VERSION,
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
      result[key] = ddfImportProcess.isJson(value) ? JSON.parse(value) : null;
    } else {
      result[key] = value;
    }
  }, {});
}
