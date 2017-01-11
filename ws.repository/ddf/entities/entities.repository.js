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
const logger = require('../../../ws.config/log');

util.inherits(EntitiesRepository, repositoryModel);

function EntitiesRepository(... args) {
  repositoryModel.apply(this, args);
}

module.exports = new RepositoryFactory(EntitiesRepository);

EntitiesRepository.prototype._getModel = function () {
  return Entities;
};

EntitiesRepository.prototype.findByOriginId = function (originId, done) {
  const query = this._composeQuery({originId: originId});
  return Entities.findOne(query).lean().exec(done);
};

EntitiesRepository.prototype.addDrillupsByEntityId = function ({entitiyId, drillups}, done) {
  const query = this._composeQuery({_id: entitiyId});
  return Entities.update(query, {$addToSet: {'drillups': {$each: drillups}}}, {multi: true}, done);
};

EntitiesRepository.prototype.count = function (onCounted) {
  const countQuery = this._composeQuery();
  return Entities.count(countQuery, onCounted);
};

EntitiesRepository.prototype.rollback = function (transaction, onRolledback) {
  const {createdAt: versionToRollback} = transaction;

  return async.parallelLimit([
    done => Entities.update({to: versionToRollback}, {$set: {to: constants.MAX_VERSION}}, {multi: true}).lean().exec(done),
    done => Entities.remove({from: versionToRollback}, done)
  ], constants.LIMIT_NUMBER_PROCESS, onRolledback);
};

EntitiesRepository.prototype.removeByDataset = function (datasetId, onRemove) {
  return Entities.remove({dataset: datasetId}, onRemove);
};

EntitiesRepository.prototype.closeByDomainAndSets = function ({domain, sets}, done) {
  const query = this._composeQuery({domain, sets});
  return Entities.update(query, {$set: {to: this.version}}, {multi: true}, done);
};

EntitiesRepository.prototype.closeOneByQuery = function (closeQuery, done) {
  const query = this._composeQuery(closeQuery);
  return Entities.findOneAndUpdate(query, {$set: {to: this.version}}, {new: true}).lean().exec(done);
};

EntitiesRepository.prototype.findOneByDomainAndSetsAndGid = function (params, done) {
  const {domain, sets, gid} = params;
  const query = this._composeQuery({domain, sets, gid});
  return Entities.findOne(query).lean().exec(done);
};

EntitiesRepository.prototype.findTargetForTranslation = function (params, done) {
  return this.findOneByDomainAndSetsAndGid(params, done);
};

EntitiesRepository.prototype.removeTranslation = function ({originId, language}, done) {
  return Entities.findOneAndUpdate({originId}, {$unset: {[`languages.${language}`]: 1}}, {new: true}, done);
};

EntitiesRepository.prototype.addTranslation = function ({id, language, translation}, done) {
  return Entities.findOneAndUpdate({_id: id}, {$set: {[`languages.${language}`]: translation}}, {new: true}, done);
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
  logger.debug({obj: composedQuery}, 'Query to get entities according to ddfql');
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

EntitiesRepository.prototype.addTranslationsForGivenProperties = function (properties, externalContext, done) {
  const {source, language, resolvedProperties} = externalContext;

  const subEntityQuery =_.extend({sources: source}, resolvedProperties);
  const query = this._composeQuery(subEntityQuery);

  const updateQuery = {
    $set: {
      languages: {
        [language.id]: properties
      }
    }
  };

  return Entities.update(query, updateQuery).exec(done);
};

function makePositiveProjectionFor(properties) {
  const positiveProjectionValues = _.fill(new Array(_.size(properties)), 1);
  return toPropertiesDotNotation(_.chain(properties).zipObject(positiveProjectionValues).value());
}

function toPropertiesDotNotation(object) {
  return _.mapKeys(object, (value, property) => property === 'gid' ? property : `properties.${property}`);
}

