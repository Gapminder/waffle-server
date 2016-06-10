'use strict';

const _ = require('lodash');

const mongoose = require('mongoose');
const Entities = mongoose.model('Entities');
const Concepts = mongoose.model('Concepts');

const utils = require('../../utils');
const constants = require('../../../ws.utils/constants');

module.exports = EntitiesRepositoryWrapper;

function EntitiesRepositoryWrapper(options) {
  this.version = options.version;
  this.datasetId = options.datasetId;
}

EntitiesRepositoryWrapper.prototype.currentVersion = function () {
  const versionQueryFragment = {
    from: {$lte: this.version},
    to: {$gt: this.version},
    dataset: this.datasetId
  };
  return new EntitiesRepository(versionQueryFragment)
};

function EntitiesRepository(versionQueryFragment) {
  this.versionQueryFragment = versionQueryFragment;
}

EntitiesRepository.prototype.findEntityProperties = function(entityDomainGid, select, where, onPropertiesFound) {
  const conceptQuery = _.merge({}, this.versionQueryFragment, {
      gid: entityDomainGid,
      'properties.concept_type': 'entity_domain'
  });

  Concepts.findOne(conceptQuery).lean().exec((error, concept) => {
    if (error) {
      return onPropertiesFound(error);
    }

    const projection = makePositiveProjectionFor(_.without(select, entityDomainGid));
    if (_.includes(select, entityDomainGid)) {
      projection.gid = 1;
    }

    where = toPropertiesDotNotation(_.mapKeys(where, (value, key) => {
      if (key === entityDomainGid) {
        return 'gid';
      }
      return key;
    }));

    const entitiesQuery = _.merge({}, this.versionQueryFragment, {domain: concept.originId}, where);

    Entities.find(entitiesQuery, projection).lean().exec((error, entities) => {
      if (error) {
        return onPropertiesFound(error);
      }

      return onPropertiesFound(null, {
        headers: select,
        rows: _.map(entities, entity => toWsJson(entityDomainGid, select, entity))
      });
    });
  });
};

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  EntitiesRepository.prototype[actionName] = utils.actionFactory(actionName)(Entities, this);
});

function toWsJson(entityDomainGid, select, entity) {
  const flattenedEntity = _.merge(gidToEntityDomainGid(entityDomainGid, _.omit(entity, 'properties')), entity.properties);
  return _.map(select, property => flattenedEntity[property]);
}

function makePositiveProjectionFor(properties) {
  const positiveProjectionValues = _.fill(new Array(_.size(properties)), 1);
  return toPropertiesDotNotation(_.chain(properties).zipObject(positiveProjectionValues).value());
}

function gidToEntityDomainGid(entityDomainGid, object) {
  return _.mapKeys(object, (value, property) => {
    if (property === 'gid') {
      return entityDomainGid;
    }
    return property;
  })
}

function toPropertiesDotNotation(object) {
  return _.mapKeys(object, (value, property) => property === 'gid' ? property : `properties.${property}`);
}
