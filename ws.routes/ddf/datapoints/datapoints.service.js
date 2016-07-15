'use strict';
const _ = require('lodash');
const constants = require('../../../ws.utils/constants');

const conceptsRepositoryFactory = require('../../../ws.repository/ddf/concepts/concepts.repository');
const entitiesRepositoryFactory = require('../../../ws.repository/ddf/entities/entities.repository');
const datapointsRepositoryFactory = require('../../../ws.repository/ddf/data-points/data-points.repository');

module.exports = {
  getConcepts,
  getEntities,
  getDataPoints
};

function getConcepts(pipe, cb) {
  return conceptsRepositoryFactory
    .currentVersion(pipe.dataset._id, pipe.version)
    .findAll((err, res) => {
      pipe.concepts = _.keyBy(res, constants.GID);
      pipe.conceptsByOriginId = _.keyBy(res, 'originId');

      pipe.selectedConcepts = _.pick(pipe.concepts, pipe.headers);

      if (_.isEmpty(pipe.selectedConcepts)) {
        return cb(`You didn't select any column`);
      }

      pipe.measures = _.pickBy(pipe.selectedConcepts, ['type', 'measure']);
      pipe.domains = _.pickBy(pipe.selectedConcepts, ['type', 'entity_domain']);
      pipe.sets = _.pickBy(pipe.selectedConcepts, ['type', 'entity_set']);
      pipe.dimensions = _.pick(pipe.concepts, _.keys(pipe.where));

      let wrongConcepts = _.chain(pipe.selectedConcepts)
        .pickBy(_.isNil)
        .keys()
        .join(', ')
        .value();

      if (wrongConcepts) {
        return cb(`You select column(s) '${wrongConcepts}' which aren't present in choosen dataset`);
      }

      return cb(null, pipe);
    });
}

function getEntities(pipe, cb) {
  const resolvedDimensionsGid = _.keys(_.assign({}, pipe.domains, pipe.sets));
  const resolvedFilters = _.chain(pipe.where)
    .pick(pipe.where, resolvedDimensionsGid)
    .mapKeys((value, key) => {
      return pipe.concepts[key].originId;
    })
    .mapValues((dimension) => {
      return _.chain(dimension)
        .flatMap(value => !_.isArray(value) ? [value] : _.range(_.first(value), _.last(value) + 1))
        .map(_.toString)
        .value();
    })
    .value();

  entitiesRepositoryFactory
    .currentVersion(pipe.dataset._id, pipe.version)
    .findAllHavingGivenDomainsOrSets(_.map(pipe.domains, 'originId'), _.map(pipe.sets, 'originId'), (error, foundEntities) => {
      if (error) {
        return cb(error);
      }

      const filteredEntitiesGroupedByDomain = _.chain(foundEntities)
        .groupBy('domain')
        .mapValues((entities, domainOriginId) => {
          if (!_.isEmpty(resolvedFilters[domainOriginId])) {
            return _.chain(entities)
              .filter(entity => _.includes(resolvedFilters[domainOriginId], entity[constants.GID]))
              .map('originId')
              .value()
              .sort();
          }

          return _.map(entities, 'originId').sort();
        })
        .value();

      pipe.entitiesGroupedByDomain = filteredEntitiesGroupedByDomain;
      pipe.entities = _.keyBy(foundEntities, 'originId');
      return cb(null, pipe);
    });
}

function getDataPoints(pipe, cb) {
  console.time('get datapoints');
  if (_.isNil(pipe.measures)) {
    return cb(null, pipe);
  }

  const dimensions = _.defaults({}, pipe.domains, pipe.sets);

  const measureIds = _.map(pipe.measures, 'originId');
  const dimensionIds = _.map(dimensions, entitySet => {
    const domainOriginId = _.isEmpty(entitySet.domain) ? entitySet.originId : entitySet.domain;
    return pipe.entitiesGroupedByDomain[_.toString(domainOriginId)];
  });

  return datapointsRepositoryFactory
    .currentVersion(pipe.dataset._id, pipe.version)
    .findForGivenMeasuresAndDimensions(measureIds, dimensionIds, (error, datapoints) => {
      console.timeEnd('get datapoints');
      if (error) {
        return cb(error);
      }
      pipe.datapoints = datapoints;
      return cb(null, pipe);
    });
}
