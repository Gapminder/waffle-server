'use strict';

const _ = require('lodash');
const constants = require('../../../ws.utils/constants');

// FIXME: wsJson, csv, json pack processors
module.exports = {
  mapConcepts: mapConceptToWsJson,
  mapEntities: mapEntitiesToWsJson,
  mapDatapoints: mapDatapointsToWsJson,
  mapSchema: mapSchemaToWsJson
};

function mapSchemaToWsJson(data) {
  const rows = _.map(data.schema, schemaDoc => _.reduce(data.headers, (schemaRow, header) => {
    schemaRow.push(schemaDoc[header]);
    return schemaRow;
  }, []));

  const headers = _.map(data.headers, header => data.aliases[header] ? data.aliases[header] : header);
  return {headers, rows};
}

function mapConceptToWsJson(data) {
  const uniqConceptProperties = _.chain(data.concepts)
    .flatMap(concept => _.keys(concept.properties))
    .uniq()
    .value();

  const select = _.isEmpty(data.headers) ? uniqConceptProperties : data.headers;

  const rows = _.map(data.concepts, concept => {
    return _mapConceptPropertiesToWsJson(select, concept);
  });

  return { headers: select, rows };
}

function _mapConceptPropertiesToWsJson(select, concept) {
  return _.map(select, property => {
    return concept.properties[property];
  });
}

function mapEntitiesToWsJson(data) {
  const uniqEntityProperties = _.chain(data.entities)
    .flatMap(entity => _.keys(entity.properties))
    .uniq()
    .value();

  const select = _.isEmpty(data.headers) ? uniqEntityProperties : data.headers;

  const rows = _.map(data.entities, (entity) => {
    return _mapEntitiesPropertiesToWsJson(data.domainGid, select, entity);
  });

  return { headers: select, rows };
}

function _mapEntitiesPropertiesToWsJson(entityDomainGid, select, entity) {
  const flattenedEntity = _.merge(__mapGidToEntityDomainGid(entityDomainGid, _.omit(entity, 'properties')), entity.properties);

  return _.map(select, property => {
    return flattenedEntity[property];
  });
}

function __mapGidToEntityDomainGid(entityDomainGid, object) {
  return _.mapKeys(object, (value, property) => {
    if (property === constants.GID) {
      return entityDomainGid;
    }

    return property;
  });
}

function mapDatapointsToWsJson(data) {
  const selectedConceptsByOriginId = _.chain(data.concepts)
    .keyBy(constants.GID)
    .pick(data.headers)
    .mapKeys(constants.ORIGIN_ID)
    .value();

  const conceptsByOriginId = _.keyBy(data.concepts, constants.ORIGIN_ID);
  const entitiesByOriginId = _.keyBy(data.entities, constants.ORIGIN_ID);

  const rows = _.chain(data.datapoints)
    .reduce((result, datapoint) => {
      const complexKey = _getComplexKey(entitiesByOriginId, selectedConceptsByOriginId, data.headers, datapoint);

      if (!result[complexKey]) {
        result[complexKey] = {};

        _.each(datapoint.dimensions, (dimension) => {
          const originEntity = entitiesByOriginId[dimension];
          const domainGid = _getGidOfSelectedConceptByEntity(selectedConceptsByOriginId, originEntity);

          result[complexKey][domainGid] = originEntity[constants.GID];
        });
      }

      const measureGid = conceptsByOriginId[datapoint.measure][constants.GID];
      result[complexKey][measureGid] = datapoint.value;

      return result;
    }, {})
    .map((row) => {
      return _.map(data.headers, column => (_.isNaN(_.toNumber(row[column])) ? row[column] : +row[column]) || undefined);
    })
    .value();

  return {
    headers: data.headers,
    rows: _.sortBy(rows, ['0', '1'])
  };
}

function _getComplexKey(entities, selectedConceptsByOriginId, headers, datapoint) {
  return _.chain(datapoint.dimensions)
    .map((dimension) => {
      return entities[dimension];
    })
    .sortBy((originEntity) => {
      const domainGid = _getGidOfSelectedConceptByEntity(selectedConceptsByOriginId, originEntity);

      return headers.indexOf(domainGid);
    })
    .map(constants.GID)
    .join(':')
    .value();
}

function _getGidOfSelectedConceptByEntity(selectedConceptsByOriginId, entity) {
  const conceptOriginIds = _.concat(entity.domain, entity.sets);
  const originIdOfSelectedConcept = _.intersection(_.keys(selectedConceptsByOriginId), _.map(conceptOriginIds, _.toString));

  if (originIdOfSelectedConcept.length === 0 || originIdOfSelectedConcept.length > 1) {
    console.error('Header was populated incorrectly');
  }

  return selectedConceptsByOriginId[_.first(originIdOfSelectedConcept)][constants.GID];
}
