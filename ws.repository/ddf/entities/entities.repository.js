'use strict';

const _ = require('lodash');
const util = require('util');
const async = require('async');
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

EntitiesRepository.prototype.addDrillupsByEntityId = function ({entitiyId, drillups}, done) {
  const query = this._composeQuery({_id: entitiyId});
  return Entities.update(query, {$addToSet: {'drillups': {$each: drillups}}}, {multi: true}, done);
};

EntitiesRepository.prototype.count = function (onCounted) {
  const countQuery = this._composeQuery();
  return Entities.count(countQuery, onCounted);
};

EntitiesRepository.prototype.rollback = function (versionToRollback, onRolledback) {
  return async.parallelLimit([
    done => Entities.update({to: versionToRollback}, {$set: {to: constants.MAX_VERSION}}, {multi: true}).lean().exec(done),
    done => Entities.remove({from: versionToRollback}, done)
  ], constants.LIMIT_NUMBER_PROCESS, onRolledback);
};

EntitiesRepository.prototype.closeByDomainAndSets = function ({domain, sets}, done) {
  const query = this._composeQuery({domain, sets});
  return Entities.update(query, {$set: {to: this.version}}, {multi: true}, done);
};

EntitiesRepository.prototype.closeOneByQuery = function (closeQuery, done) {
  const query = this._composeQuery(closeQuery);
  return Entities.findOneAndUpdate(query, {$set: {to: this.version}}, {new: true}, done);
};

EntitiesRepository.prototype.create = function (entityOrBatchOfEntities, onCreated) {
  return Entities.create(entityOrBatchOfEntities, onCreated);
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
  const composedQuery = this._composeQuery(entitiesQuery);
  return Entities.find(composedQuery).lean().exec(onPropertiesFound);
};

EntitiesRepository.prototype.findAllPopulated = function (done) {
  const composedQuery = this._composeQuery();
  return Entities.find(composedQuery, null, {
    join: {
      domain: {
        $find: composedQuery
      },
      sets: {
        $find: composedQuery
      }
    }
  })
    .populate('dataset')
    .lean()
    .exec(done);
};

EntitiesRepository.prototype.findByDomainAndSets = function ({domain, sets}, done) {
  const composedQuery = this._composeQuery({domain, sets});
  return Entities.find(composedQuery).lean().exec(done);
};

EntitiesRepository.prototype.findAll = function (done) {
  const composedQuery = this._composeQuery();
  return Entities.find(composedQuery).lean().exec(done);
};

EntitiesRepository.prototype.findDistinctSets = function (entitiesOriginIds, done) {
  const composedQuery = this._composeQuery({originId: {$in: entitiesOriginIds}});
  return Entities.distinct('sets', composedQuery).lean().exec(done);
};

EntitiesRepository.prototype.findDistinctDomains = function (entitiesOriginIds, done) {
  const composedQuery = this._composeQuery({originId: {$in: entitiesOriginIds}});
  return Entities.distinct('domain', composedQuery).lean().exec(done);
};

EntitiesRepository.prototype.findEntityProperties = function(entityDomainGid, select, where, onPropertiesFound) {
  const conceptQuery = this._composeQuery({
    gid: entityDomainGid,
    'properties.concept_type': {$in: constants.DEFAULT_ENTITY_GROUP_TYPES}
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

    const entitiesQuery = this._composeQuery({$or: [{domain: concept.originId}, {sets: concept.originId}]}, whereWithPrefixedProperties);

    return Entities.find(entitiesQuery, projection).lean().exec(onPropertiesFound);
  });
};

EntitiesRepository.prototype.addTranslationsForGivenProperties = function (properties, context) {
  const setsOriginIds = _.map(context.sets, constants.ORIGIN_ID);

  const domainOriginId = _.chain(context.domains)
    .values()
    .first()
    .get(`${constants.ORIGIN_ID}`, null)
    .value();

  // It's only one column, where entity could have a gid
  const entityGid = _.chain({})
    .assign(context.sets, context.domains)
    .map(concept => _.get(properties, `${concept.gid}`, null))
    .compact()
    .first()
    .value();

  const subEntityQuery = getSubQueryFromDomainAndSets(setsOriginIds, domainOriginId, entityGid);

  const query = this._composeQuery(subEntityQuery);

  const updateQuery = {
    $set: {
      languages: {
        [context.language]: properties
      }
    }
  };

  return Entities.update(query, updateQuery).exec();
};

function makePositiveProjectionFor(properties) {
  const positiveProjectionValues = _.fill(new Array(_.size(properties)), 1);
  return toPropertiesDotNotation(_.chain(properties).zipObject(positiveProjectionValues).value());
}

function toPropertiesDotNotation(object) {
  return _.mapKeys(object, (value, property) => property === 'gid' ? property : `properties.${property}`);
}

function getSubQueryFromDomainAndSets(setsOriginIds, domain, gid) {
  return {
    gid,
    domain,
    sets: {$not: {$elemMatch: {$nin : setsOriginIds}}}
  };
}

