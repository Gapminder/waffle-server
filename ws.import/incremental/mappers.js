'use strict';

const _ = require('lodash');

const constants = require('../../ws.utils/constants');
const ddfImportUtils = require('../import-ddf.utils');

const JSON_COLUMNS = ['color', 'scales', 'drill_up'];

module.exports = {
  mapDdfConceptsToWsModel,
  mapDdfInDatapointsFoundEntityToWsModel,
  mapDdfDataPointToWsModel
};

function mapDdfDataPointToWsModel(context) {
  return function (entry, options) {
    let isValidEntry = _.chain(entry)
      .values()
      .every((value, key) => !_.isNil(value) || key !== 'originId')
      .value();

    if (!isValidEntry) {
      return [];
    }

    const dimensions = _.chain(entry)
      .pick(_.keys(context.dimensions))
      .reduce((result, entityGid, conceptGid) => {
        const key = `${entityGid}-${context.concepts[conceptGid].originId}`;
        const entity =
          context.entities.byDomain[key]
          || context.entities.bySet[key]
          || context.entities.byGid[entityGid]
          || context.entities.foundInDatapointsByGid[entityGid];

        result.push(entity.originId);
        return result;
      }, [])
      .value();

    return _.chain(entry)
      .pick(_.keys(context.measures))
      .map((datapointValue, measureGid) => {
        const datapointValueAsNumber = _.toNumber(datapointValue);
        return {
          value: _.isNaN(datapointValueAsNumber) ? datapointValue : datapointValueAsNumber,
          measure: context.measures[measureGid].originId,
          dimensions: dimensions,

          properties: entry,
          originId: _.get(options, 'originId', null),
          languages: _.get(options, 'languages', null),

          isNumeric: _.isNumber(entry[measureGid]),
          from: context.transaction.createdAt,
          dataset: context.dataset._id,
          sources: [context.filename]
        };
      })
      .value();
  };
}

function mapDdfInDatapointsFoundEntityToWsModel(datapoint, concept, domain, context, externalContext) {
  const gid = datapoint[concept.gid];
  return {
    gid: gid,
    sources: [context.filename],
    properties: datapoint,
    parsedProperties: ddfImportUtils.parseProperties(concept, gid, datapoint, externalContext.timeConcepts),

    domain: domain.originId,
    sets: concept.type === 'entity_set' ? [concept.originId] : [],
    drillups: [],

    from: externalContext.transaction.createdAt,
    dataset: externalContext.dataset._id
  };
}

function mapDdfConceptsToWsModel(version, datasetId) {
  return (entry, options) => {
    let transformedEntry = transformPropsToJsonWherePossible(entry);

    return {
      gid: transformedEntry.concept,

      title: transformedEntry.name || transformedEntry.title,
      type: transformedEntry.concept_type === 'time' ? 'entity_domain' : transformedEntry.concept_type,

      properties: transformedEntry,
      languages: options.languages,

      domain: null,
      subsetOf: [],
      dimensions: [],

      from: version,
      to: constants.MAX_VERSION,
      dataset: datasetId
    };
  };
}

function transformPropsToJsonWherePossible(object) {
  return _.transform(object, (result, value, key) => {
    if (isJsonColumn(key)) {
      result[key] = ddfImportUtils.isJson(value) ? JSON.parse(value) : null;
    } else {
      result[key] = value;
    }
  }, {});
}

function isJsonColumn(column) {
  return _.includes(JSON_COLUMNS, column);
}
