'use strict';

const _ = require('lodash');
const async = require('async');

const ddfql = require('../ws.ddfql/ddf-entities-query-normalizer');
const constants = require('../ws.utils/constants');
const commonService = require('./common.service');
const conceptsService = require('./concepts.service');
const ddfQueryValidator = require('../ws.ddfql/ddf-query-validator');
const entitiesRepositoryFactory = require('../ws.repository/ddf/entities/entities.repository');

module.exports = {
  getEntities,
  collectEntitiesByDdfql,
};

function collectEntitiesByDdfql(options, cb) {
  console.time('finish Entities stats');
  const pipe = _.extend(options, {domainGid: _.first(options.domainGids)});

  async.waterfall([
    async.constant(pipe),
    ddfQueryValidator.validateDdfQueryAsync,
    commonService.findDefaultDatasetAndTransaction,
    getConcepts,
    normalizeQueriesToEntitiesByDdfql
  ],  (error, result) => {
    console.timeEnd('finish Entities stats');

    return cb(error, result);
  });
}

function normalizeQueriesToEntitiesByDdfql(pipe, cb) {
  const entitiesRepository = entitiesRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version);

  const normlizedQuery = ddfql.normalizeEntities(pipe.query, pipe.concepts);

  return async.mapLimit(normlizedQuery.join, 10, (item, mcb) => {
    const validateQuery = ddfQueryValidator.validateMongoQuery(item);
    if(!validateQuery.valid) {
      return cb(validateQuery.log, pipe);
    }
    return entitiesRepository
      .findEntityPropertiesByQuery(item, (error, entities) => {
        return mcb(error, _.map(entities, 'gid'));
      });
  }, (err, substituteJoinLinks) => {
    const promotedQuery = ddfql.substituteEntityJoinLinks(normlizedQuery, substituteJoinLinks);
    const subEntityQuery = promotedQuery.where;

    const validateQuery = ddfQueryValidator.validateMongoQuery(subEntityQuery);
    if(!validateQuery.valid) {
      return cb(validateQuery.log, pipe);
    }

    return entitiesRepository
      .findEntityPropertiesByQuery(subEntityQuery, (error, entities) => {
        if (error) {
          return cb(error);
        }

        pipe.entities = entities;

        return commonService.translate(constants.ENTITIES, pipe, cb);
      });
  });
}

function getEntities(pipe, cb) {
  const entitiesRepository = entitiesRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version);

  entitiesRepository
    .findEntityProperties(pipe.domainGid, pipe.headers, pipe.where, (error, entities) => {
      if (error) {
        return cb(error);
      }

      pipe.entities = entities;

      return cb(null, pipe);
    });
}

function getConcepts(pipe, cb) {
  const _pipe = {
    dataset: pipe.dataset,
    version: pipe.version,
    headers: [],
    where: {}
  };

  return conceptsService.getConcepts(_pipe, (err, result) => {
    pipe.concepts = result.concepts;

    return cb(err, pipe);
  });
}
