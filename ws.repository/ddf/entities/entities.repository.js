'use strict';

const _ = require('lodash');
const util = require('util');
const mongoose = require('mongoose');
const Entities = mongoose.model('Entities');
const Concepts = mongoose.model('Concepts');

const utils = require('../../utils');
const constants = require('../../../ws.utils/constants');

util.inherits(EntitiesRepository, utils.VersionedModelRepository);

function EntitiesRepository() {
  utils.VersionedModelRepository.apply(this, arguments);
}

module.exports = new utils.VersionedModelRepositoryFactory(EntitiesRepository);

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

    where = toPropertiesDotNotation(_.mapKeys(where, (value, key) => {
      if (key === entityDomainGid) {
        return 'gid';
      }
      return key;
    }));

    const entitiesQuery = this._composeQuery({domain: concept.originId}, where);

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
