'use strict';

const _ = require('lodash');
const constants = require('../../../ws.utils/constants');

module.exports = {
  packConcepts: _packConcepts,
  packEntities: _packEntities,
  packDatapoints: _packDatapoints
};

function _packConcepts(rawDdf) {
  const concepts = _.mapKeys(rawDdf.concepts, constants.GID);
  const conceptGids = _.keys(concepts).sort();

  const properties = _.chain(concepts)
    .flatMap(concept => _.keys(concept.properties))
    .uniq()
    .sort()
    .value();

  const propertyValues = _.chain(concepts)
    .flatMap(concept => _.values(concept.properties))
    .map(__mapArrayAndObjectToJson)
    .uniq()
    .sort()
    .value();

  const invertedPropertyValues = _.invert(propertyValues);

  const rows = _.map(conceptGids, (gid) => {
    const row = _.map(properties, (property) => {
      const value = concepts[gid].properties[property];
      const propertyValue = __mapArrayAndObjectToJson(value);

      return Number(_.get(invertedPropertyValues, propertyValue, -1));
    });

    return row;
  });

  const result = {
    packed: {
      values: conceptGids,
      properties: properties,
      propertyValues: propertyValues,
      rows: rows
    }
  };

  return result;
}

function _packEntities(rawDdf) {
  const entities = _.mapKeys(rawDdf.entities, constants.ORIGIN_ID);
  _.forEach(entities, (entity) => {
    entity.properties[rawDdf.domainGid] = entity[constants.GID];
  });
  const concepts = _.mapKeys(rawDdf.concepts, constants.GID);

  const isDomainOrSetOrTime = (value, key) => _.includes(['entity_domain', 'entity_set', 'time'], concepts[key].properties.concept_type);
  const invertedConceptGids = _.chain(concepts).keys().sort().invert().value();

  const invertedConceptValues = _.chain(invertedConceptGids)
    .pickBy(isDomainOrSetOrTime)
    .invert()
    .value();
  const conceptIndexs = _.keys(invertedConceptValues);
  const conceptsByOriginId = _.mapKeys(concepts, 'originId');

  const values = _.chain(entities).map(constants.GID).uniq().value();
  const invertedValues = _.invert(values);
  const properties = _.chain(entities)
    .flatMap(entity => _.keys(entity.properties))
    .uniq()
    .sort()
    .value();
  const propertyValues = _.chain(entities)
    .flatMap(entity => _.values(entity.properties))
    .map(__mapArrayAndObjectToJson)
    .uniq()
    .value();
  const _propertyValues = _.invert(propertyValues);
  const entityByOriginId = {};
  let rowIndex = 0;
  const entitiesNGram = _.size(entities).toString().length;
  const rows = _.map(entities, (entity, key) => {
    const row = _.map(properties, (property) => {
      const value = entity.properties[property];
      const propertyValue = __mapArrayAndObjectToJson(value);

      return Number(_.get(_propertyValues, propertyValue, -1));
    });

    const conceptMask = _.reduce(conceptIndexs, (result, conceptIndex) => {
      const getConceptGid = (setOriginId) => conceptsByOriginId[setOriginId] && conceptsByOriginId[setOriginId][constants.GID];
      const domainOriginId = entity.domain.toString();
      const entitySets = _.chain(entity.sets)
        .map(getConceptGid)
        .compact()
        .concat([conceptsByOriginId[domainOriginId][constants.GID]])
        .value();
      const isExistedRelation = _.includes(entitySets, invertedConceptValues[conceptIndex]);

      result += isExistedRelation ? 1 : 0;

      return result;
    }, '');

    const toDecimalMask = (index) => {
      const indexBits = Number(index).toString();
      const indexNGram = indexBits.length;

      return _.repeat('0', entitiesNGram - indexNGram) + indexBits;
    };

    entityByOriginId[entity.originId] = toDecimalMask(rowIndex++);
    row.unshift(Number(invertedValues[entity[constants.GID]]), conceptMask);

    return row;
  });

  const result = {
    packed: {
      values: values,
      properties: properties,
      concepts: conceptIndexs,
      propertyValues: propertyValues,
      rows: rows
    },
    meta: {
      entityByOriginId
    }
  };

  return result;
}

function _packDatapoints(rawDdf, entityByOriginId) {
  const domainGids = rawDdf.domainGids;
  const headers = rawDdf.headers;
  const concepts = _.mapKeys(rawDdf.concepts, constants.GID);
  const datapoints = rawDdf.datapoints;

  const isMeasure = (value, key) => {
    return _.includes(['measure'], concepts[key].properties.concept_type)
      && _.includes(headers, concepts[key].properties.concept);
  };

  const invertedConceptGids = _.chain(concepts).keys().sort().invert().value();
  const invertedIndicatorValues = _.chain(invertedConceptGids)
    .pickBy(isMeasure)
    .invert()
    .value();
  const indicatorIndexes = _.keys(invertedIndicatorValues);
  const conceptsByOriginId = _.mapKeys(concepts, 'originId');

  const values = _.chain(datapoints).map('value').uniq().value();
  const invertedValues = _.invert(values);

  const rows = _.chain(datapoints)
    .reduce((result, datapoint) => {
      const mask = _.chain(datapoint.dimensions)
        .map((entityOriginId) => entityByOriginId[entityOriginId])
        .join('')
        .value();
      if (!result[mask]) {
        result[mask] = {};
      }
      result[mask][conceptsByOriginId[datapoint.measure][constants.GID]] = invertedValues[datapoint.value];
      return result;
    }, {})
    .map((row, mask) => {
      return _.concat([mask], _.map(indicatorIndexes, (indicatorIndex) => {
        return Number(_.get(row, invertedIndicatorValues[indicatorIndex], -1));
      }));
    })
    .value();

  const result = {
    packed: {
      values: values,
      indicators: indicatorIndexes,
      dimensions: _.chain(invertedConceptGids).pick(domainGids).values().value(),
      rows: rows
    }
  };

  return result;
}

function __mapArrayAndObjectToJson(property) {
  return _.isArray(property) || _.isObject(property) ? JSON.stringify(property) : property;
}
