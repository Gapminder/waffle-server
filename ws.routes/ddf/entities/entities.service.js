'use strict';
var _ = require('lodash');
var async = require('async');

const mongoose = require('mongoose');

const Concepts = mongoose.model('Concepts');
const Entities = mongoose.model('Entities');
const DataPoints = mongoose.model('DataPoints');

const EntitiesRepositoryFactory = require('../../../ws.repository/ddf/entities/entities.repository');

module.exports = {
  getEntities
};

function getEntities(pipe, cb) {
  const EntitiesRepository = new EntitiesRepositoryFactory({
    datasetId: pipe.dataset._id,
    version: pipe.version
  });

  EntitiesRepository
    .currentVersion()
    .findEntityProperties(pipe.domainGid, pipe.select, pipe.where, (error, entities) => {
      if (error) {
        return cb(error);
      }

      pipe.entities = entities;

      return mapResult(pipe, cb);
    });
}

function mapResult(pipe, cb) {
  return cb(null, {
    headers: pipe.select,
    rows: _.map(pipe.entities, entity => toWsJson(pipe.domainGid, pipe.select, entity))
  });
}

function toWsJson(entityDomainGid, select, entity) {
  const flattenedEntity = _.merge(gidToEntityDomainGid(entityDomainGid, _.omit(entity, 'properties')), entity.properties);

  return _.map(select, property => flattenedEntity[property]);
}

function gidToEntityDomainGid(entityDomainGid, object) {
  return _.mapKeys(object, (value, property) => {
    if (property === 'gid') {
      return entityDomainGid;
    }

    return property;
  })
}
