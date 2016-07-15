'use strict';

const _ = require('lodash');
const constants = require('../../../ws.utils/constants');

// FIXME: wsJson, csv, json pack processors
module.exports = {
  mapConcepts: mapConceptToWsJson,
  mapEntities: mapEntitiesToWsJson,
  mapDatapoints: mapDatapointsToWsJson
};

function mapConceptToWsJson(data, cb) {
  let rows = _.map(data.concepts, concept => {
    return _mapConceptPropertiesToWsJson(data.headers, concept);
  });

  return cb(null, {wsJson: {headers: data.headers, rows}});
}

function _mapConceptPropertiesToWsJson(select, concept) {
  return _.map(select, property => concept.properties[property]);
}

function mapEntitiesToWsJson(data, cb) {
  let rows = _.map(data.entities, (entity) => {
    return _mapEntitiesPropertiesToWsJson(data.domainGid, data.headers, entity);
  });

  return cb(null, {wsJson: {headers: data.headers, rows}});
}

function _mapEntitiesPropertiesToWsJson(entityDomainGid, select, entity) {
  const flattenedEntity = _.merge(__mapGidToEntityDomainGid(entityDomainGid, _.omit(entity, 'properties')), entity.properties);

  return _.map(select, property => flattenedEntity[property]);
}

function __mapGidToEntityDomainGid(entityDomainGid, object) {
  return _.mapKeys(object, (value, property) => {
    if (property === constants.GID) {
      return entityDomainGid;
    }

    return property;
  })
}

function mapDatapointsToWsJson(data, cb) {
  const selectedConceptsByOriginId = _.chain(data.concepts).pick(data.headers).mapKeys('originId').value();

  let rows = _.chain(data.datapoints)
    .reduce((result, datapoint) => {
      const complexKey = _getComplexKey(data.entities, selectedConceptsByOriginId, data.headers, datapoint);

      if (!result[complexKey]) {
        result[complexKey] = {};

        _.each(datapoint.dimensions, (dimension) => {
          const originEntity = data.entities[dimension];
          const domainGid = _getGidOfSelectedConceptByEntity(selectedConceptsByOriginId, originEntity);

          result[complexKey][domainGid] = originEntity[constants.GID];
        });
      }

      const measureGid = data.conceptsByOriginId[datapoint.measure][constants.GID];
      result[complexKey][measureGid] = datapoint.value;

      return result;
    }, {})
    .map((row) => {
      return _.map(data.headers, column => (_.isNaN(_.toNumber(row[column])) ? row[column] : +row[column]) || null);
    })
    .value();

  return cb(null, {wsJson: {
    headers: data.headers,
    rows: _.sortBy(rows, ['0', '1'])
  }});
}

function _getComplexKey(entities, selectedConceptsByOriginId, headers, datapoint) {
  return _.chain(datapoint.dimensions)
    .map((dimension) => entities[dimension])
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
