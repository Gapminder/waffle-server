'use strict';

const _ = require('lodash');
const util = require('util');
const mongoose = require('mongoose');
const Entities = mongoose.model('Entities');
const Concepts = mongoose.model('Concepts');

const RepositoryFactory = require('../../repository.factory');
const repositoryModel = require('../../repository.model');
const constants = require('../../../ws.utils/constants');

util.inherits(EntitiesRepository, repositoryModel);

function EntitiesRepository() {
  repositoryModel.apply(this, arguments);
}

module.exports = new RepositoryFactory(EntitiesRepository);

EntitiesRepository.prototype.countBy = function (where, onCounted) {
  const countQuery = this._composeQuery(where);
  return Entities.count(countQuery, onCounted);
};

EntitiesRepository.prototype.findAllHavingGivenDomainsOrSets = function (domainsIds, setsIds, onFound) {
  const query = this._composeQuery({
    $or: [
      {
        domain: {$in: domainsIds}
      },
      {
        sets: {$in: setsIds}
      }
    ]
  });

  return Entities.find(query).lean().exec(onFound);
};

EntitiesRepository.prototype.findEntityPropertiesByQuery = function(entitiesQuery, onPropertiesFound) {
  return Entities.find(entitiesQuery).lean().exec(onPropertiesFound);
};

EntitiesRepository.prototype.findEntityProperties = function(entityDomainGid, select, where, onPropertiesFound) {
  const conceptQuery = this._composeQuery({
    gid: entityDomainGid,
    'properties.concept_type': entityDomainGid === 'time' ? 'time' : 'entity_domain'
  });

  return Concepts.findOne(conceptQuery).lean().exec((error, concept) => {
    if (error || !concept) {
      return onPropertiesFound(error || `There is no entity domain '${entityDomainGid}'`);
    }

    const projection = makePositiveProjectionFor(_.without(select, entityDomainGid));
    if (_.includes(select, entityDomainGid)) {
      projection.gid = 1;
    }
    if (!_.isEmpty(projection)) {
      projection.gid = 1;
      projection.originId = 1;
      projection.domain = 1;
    }

    const normalizedWhereClause = this._normalizeWhereClause(where);
    const whereClauseWithSubstitutedGid = _.mapKeys(normalizedWhereClause, (value, key) => {
      if (entityDomainGid === key) {
        return 'gid';
      }

      return key.slice(key.indexOf('.') + 1);
    });
    const whereWithPrefixedProperties = toPropertiesDotNotation(whereClauseWithSubstitutedGid);

    const entitiesQuery = this._composeQuery({domain: concept.originId}, whereWithPrefixedProperties);

    return Entities.find(entitiesQuery, projection).lean().exec(onPropertiesFound);
  });
};

function makePositiveProjectionFor(properties) {
  const positiveProjectionValues = _.fill(new Array(_.size(properties)), 1);
  return toPropertiesDotNotation(_.chain(properties).zipObject(positiveProjectionValues).value());
}

function toPropertiesDotNotation(object) {
  return _.mapKeys(object, (value, property) => property === 'gid' ? property : `properties.${property}`);
}
