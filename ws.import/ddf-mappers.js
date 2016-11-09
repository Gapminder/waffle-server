'use strict';

const _ = require('lodash');

const constants = require('../ws.utils/constants');
const ddfImportUtils = require('../ws.import/import-ddf.utils');

const JSON_COLUMNS = ['color', 'scales', 'drill_up'];

module.exports = {
  mapDdfEntityToWsModel,
  mapDdfConceptsToWsModel,
  mapDdfEntityFoundInDatapointToWsModel,
  mapDdfDataPointToWsModel
};

function mapDdfEntityToWsModel(entry, context) {
    const gid = getGid(context.entitySet, entry);
    const resolvedColumns = mapResolvedColumns(entry);
    const resolvedSets = mapResolvedSets(context.concepts, resolvedColumns);
    const _entry = _.mapValues(entry, value => {

      const ddfBool = toBoolean(value);
      if (!_.isNil(ddfBool)) {
        return ddfBool;
      }

      const ddfNumeric = toNumeric(value);
      if (!_.isNil(ddfNumeric)) {
        return ddfNumeric;
      }

      return value;
    });

    const domainOriginId = _.get(context, 'entityDomain.originId', context.entityDomain);

    const newSource = context.filename ? [context.filename] : [];
    const combinedSources = _.union(context.sources, newSource);

    return {
      gid: gid,
      sources: combinedSources,
      properties: _entry,
      parsedProperties: ddfImportUtils.parseProperties(context.entityDomain, gid, _entry, context.timeConcepts),

      originId: _.get(context, 'originId', null),
      languages: _.get(context, 'languages', null),

      domain: domainOriginId,
      sets: resolvedSets,

      from: context.version,
      dataset: context.datasetId
    };
}

function mapDdfDataPointToWsModel(entry, context) {
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
        const datapointValueAsNumber = toNumeric(datapointValue);
        return {
          value: _.isNil(datapointValueAsNumber) ? datapointValue : datapointValueAsNumber,
          measure: context.measures[measureGid].originId,
          dimensions: dimensions,

          properties: entry,
          originId: _.get(context, 'originId', null),
          languages: _.get(context, 'languages', null),

          isNumeric: _.isNumber(entry[measureGid]),
          from: context.version,
          dataset: context.datasetId,
          sources: [context.filename]
        };
      })
      .value();
}

function mapDdfEntityFoundInDatapointToWsModel(datapoint, context) {
  const gid = datapoint[context.concept.gid];
  return {
    gid: gid,
    sources: [context.filename],
    properties: datapoint,
    parsedProperties: ddfImportUtils.parseProperties(context.concept, gid, datapoint, context.timeConcepts),

    domain: context.domain.originId,
    sets: context.concept.type === 'entity_set' ? [context.concept.originId] : [],
    drillups: [],

    from: context.version,
    dataset: context.datasetId
  };
}

function mapDdfConceptsToWsModel(entry, context) {
  const transformedEntry = transformPropsToJsonWherePossible(entry);

  const concept = {
    gid: transformedEntry.concept,

    title: transformedEntry.name || transformedEntry.title,
    type: transformedEntry.concept_type === 'time' ? 'entity_domain' : transformedEntry.concept_type,

    properties: transformedEntry,

    domain: null,
    subsetOf: [],
    dimensions: [],

    from: context.version,
    to: constants.MAX_VERSION,
    dataset: context.datasetId
  };

  const languages = _.get(context, 'languages');
  if (languages) {
    concept.languages = languages;
  }

  if (context.filename) {
    concept.sources = [context.filename];
  }

  return concept;
}


function toNumeric(value) {
  const numericValue = value && _.toNumber(value);
  return !_.isNaN(numericValue) && _.isNumber(numericValue) ? numericValue : null;
}

function toBoolean(value) {
  if (value === 'TRUE' || value === 'FALSE') {
    return value === 'TRUE';
  }

  if (_.isBoolean(value)) {
    return Boolean(value);
  }

  return null;
}

function getGid(entitySet, entry) {
  return entry[entitySet.gid] || (entitySet.domain && entry[entitySet.domain.gid]);
}

function mapResolvedSets(concepts, resolvedGids) {
  return _.chain(concepts)
    .filter(concept => _.includes(constants.DEFAULT_ENTITY_GROUP_TYPES, concept.type) && _.includes(resolvedGids, `is--${concept.gid}`))
    .filter(concept => concept.type !== 'entity_domain')
    .map('originId')
    .uniq()
    .value();
}

function mapResolvedColumns(entry) {
  return _.chain(entry)
    .keys()
    .filter(name => _.includes(name, 'is--') && entry[name])
    .uniq()
    .value();
}

function transformPropsToJsonWherePossible(object) {
  return _.transform(object, (result, value, key) => {
    if (_.isNil(value) || value === '') {
      result[key] = null;
    } else if (isJsonColumn(key) && _.isString(value)) {
      result[key] = ddfImportUtils.isJson(value) ? JSON.parse(value) : null;
    } else {
      result[key] = value;
    }
  }, {});
}

function isJsonColumn(column) {
  return _.includes(JSON_COLUMNS, column);
}
