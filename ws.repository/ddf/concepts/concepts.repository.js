'use strict';

const _ = require('lodash');
const util = require('util');
const async = require('async');
const mongoose = require('mongoose');
const Concepts = mongoose.model('Concepts');

const RepositoryFactory = require('../../repository.factory');
const repositoryModel = require('../../repository.model');
const constants = require('../../../ws.utils/constants');

util.inherits(ConceptsRepository, repositoryModel);

function ConceptsRepository() {
  repositoryModel.apply(this, arguments);
}

module.exports = new RepositoryFactory(ConceptsRepository);

ConceptsRepository.prototype.findConceptsByQuery = function (conceptsQuery, onPropertiesFound) {
  const composedQuery = this._composeQuery(conceptsQuery);
  return Concepts.find(composedQuery).lean().exec(onPropertiesFound);
};

ConceptsRepository.prototype.create = function (conceptOrConceptsChunk, onCreated) {
  return Concepts.create(conceptOrConceptsChunk, onCreated);
};

ConceptsRepository.prototype.findConceptProperties = function (select, where, onPropertiesFound) {
  const projection = makePositiveProjectionFor(select);
  if (!_.isEmpty(projection)) {
    projection.gid = 1;
    projection.originId = 1;
    projection['properties.concept_type'] = 1;
  }

  const normalizedWhereClause = this._normalizeWhereClause(where);
  const conceptQuery = this._composeQuery(prefixWithProperties(normalizedWhereClause));

  return Concepts.find(conceptQuery, projection).lean().exec(onPropertiesFound);
};

ConceptsRepository.prototype.addDimensionsForMeasure = function ({measureOriginId, dimensions}, done) {
  const query = this._composeQuery({originId: measureOriginId});
  return Concepts.update(query, {$addToSet: {dimensions: {$each: dimensions}}}, done);
};

ConceptsRepository.prototype.addSubsetOfByGid = function ({gid, parentConceptId}, done) {
  const query = this._composeQuery({'properties.drill_up': gid});
  return Concepts.update(query, {$addToSet: {'subsetOf': parentConceptId}}, {multi: true}, done);
};

ConceptsRepository.prototype.setDomainByGid = function ({gid, domainConceptId}, done) {
  const query = this._composeQuery({'properties.domain': gid});
  return Concepts.update(query,  {$set: {'domain': domainConceptId}}, {multi: true}, done);
};

ConceptsRepository.prototype.findDistinctDrillups = function (done) {
  const query = this._composeQuery();
  return Concepts.distinct('properties.drill_up', query).lean().exec(done);
};

ConceptsRepository.prototype.findDistinctDomains = function (done) {
  const query = this._composeQuery();
  return Concepts.distinct('properties.domain', query).lean().exec(done);
};

ConceptsRepository.prototype.closeByGid = function (gid, onClosed) {
  const query = this._composeQuery({gid});
  return Concepts.findOneAndUpdate(query, {$set: {to: this.version}}, {new: false}).lean().exec(onClosed);
};

ConceptsRepository.prototype.closeOneByQuery = function (closingQuery, onClosed) {
  const query = this._composeQuery(closingQuery);
  return Concepts.findOneAndUpdate(query, {$set: {to: this.version}}, {new: false}).lean().exec(onClosed);
};

ConceptsRepository.prototype.closeById = function (conceptId, onClosed) {
  const query = this._composeQuery({_id: conceptId});
  return Concepts.findOneAndUpdate(query, {$set: {to: this.version}}, {new: false}).lean().exec(onClosed);
};

ConceptsRepository.prototype.closeByOriginId = function (originId, onClosed) {
  const query = this._composeQuery({originId});
  return Concepts.findOneAndUpdate(query, {$set: {to: this.version}}, {new: false}).lean().exec(onClosed);
};

ConceptsRepository.prototype.count = function (onCounted) {
  const countQuery = this._composeQuery();
  return Concepts.count(countQuery, onCounted);
};

ConceptsRepository.prototype.rollback = function (versionToRollback, onRolledback) {
  return async.parallelLimit([
    done => Concepts.update({to: versionToRollback}, {$set: {to: constants.MAX_VERSION}}, {multi: true}).lean().exec(done),
    done => Concepts.remove({from: versionToRollback}, done)
  ], constants.LIMIT_NUMBER_PROCESS, onRolledback);
};


ConceptsRepository.prototype.findAllPopulated = function (done) {
  const composedQuery = this._composeQuery();
  return Concepts.find(composedQuery, null, {
    join: {
      domain: {
        $find: composedQuery
      },
      subsetOf: {
        $find: composedQuery
      }
    }
  })
    .populate('dataset')
    .lean()
    .exec(done);
};

ConceptsRepository.prototype.findAll = function (onFound) {
  const countQuery = this._composeQuery();
  return Concepts.find(countQuery).lean().exec(onFound);
};

ConceptsRepository.prototype.findByGid = function (gid, onFound) {
  const query = this._composeQuery({gid});
  return Concepts.findOne(query).lean().exec(onFound);
};

ConceptsRepository.prototype.removeTranslation = function ({originId, language}, done) {
  return Concepts.findOneAndUpdate({originId}, {$unset: {[`languages.${language}`]: 1}}, {new: true}, done);
};

ConceptsRepository.prototype.addTranslation = function ({id, language, translation}, done) {
  return Concepts.findOneAndUpdate({_id: id}, {$set: {[`languages.${language}`]: translation}}, {new: true}, done);
};

ConceptsRepository.prototype.addTranslationsForGivenProperties = function (properties, context, done) {
  const subEntityQuery = {
    gid: properties.concept
  };

  const query = this._composeQuery(subEntityQuery);
  const updateQuery = {
    $set: {
      languages: {
        [language.id]: properties
      }
    }
  };

  return Concepts.update(query, updateQuery).exec(done);
};

//TODO: Move this in utils that should be common across all repositories
function makePositiveProjectionFor(properties) {
  const positiveProjectionValues = _.fill(new Array(_.size(properties)), 1);
  return prefixWithProperties(_.zipObject(properties, positiveProjectionValues));
}

function prefixWithProperties(object) {
  return _.mapKeys(object, (value, property) => `properties.${property}`);
}
