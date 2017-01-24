import * as _ from 'lodash';
import * as async from 'async';
import { model } from 'mongoose';

import { VersionedModelRepositoryFactory } from '../../versioned-model-repository-factory';
import { VersionedModelRepository } from '../../versioned-model-repository';
import { constants } from '../../../ws.utils/constants';
import { logger } from '../../../ws.config/log';

const Entities = model('Entities');
const Concepts = model('Concepts');

class EntitiesRepository extends VersionedModelRepository {
  public constructor(versionQueryFragment, datasetId?, version?) {
    super(versionQueryFragment, datasetId, version);
  }

  protected _getModel(): any {
    return Entities;
  }

  public count(onCounted) {
    const countQuery = this._composeQuery();
    return Entities.count(countQuery, onCounted);
  }

  public rollback(transaction, onRolledback) {
    const {createdAt: versionToRollback} = transaction;

    return async.parallelLimit([
      done => Entities.update({to: versionToRollback}, {$set: {to: constants.MAX_VERSION}}, {multi: true}).lean().exec(done),
      done => Entities.remove({from: versionToRollback}, done)
    ], constants.LIMIT_NUMBER_PROCESS, onRolledback);
  }

  public removeByDataset(datasetId, onRemove) {
    return Entities.remove({dataset: datasetId}, onRemove);
  }

  public closeOneByQuery(closeQuery, done) {
    const query = this._composeQuery(closeQuery);
    return Entities.findOneAndUpdate(query, {$set: {to: this.version}}, {'new': true}).lean().exec(done);
  }

  public findOneByDomainAndSetsAndGid(params, done) {
    const {domain, sets, gid} = params;
    const query = this._composeQuery({domain, sets, gid});
    return Entities.findOne(query).lean().exec(done);
  }

  public findTargetForTranslation(params, done) {
    return this.findOneByDomainAndSetsAndGid(params, done);
  }

  public removeTranslation({originId, language}, done) {
    return Entities.findOneAndUpdate({originId}, {$unset: {[`languages.${language}`]: 1}}, {'new': true}, done);
  }

  public addTranslation({id, language, translation}, done) {
    return Entities.findOneAndUpdate({_id: id}, {$set: {[`languages.${language}`]: translation}}, {'new': true}, done);
  }

  public findEntityPropertiesByQuery(entitiesQuery, onPropertiesFound) {
    const composedQuery = this._composeQuery(entitiesQuery);
    logger.debug({obj: composedQuery}, 'Query to get entities according to ddfql');
    return Entities.find(composedQuery).lean().exec(onPropertiesFound);
  }

  public findAll(done) {
    const composedQuery = this._composeQuery();
    return Entities.find(composedQuery).lean().exec(done);
  }

  public findEntityProperties(entityDomainGid, select, where, onPropertiesFound) {
    const conceptQuery = this._composeQuery({
      gid: entityDomainGid,
      'properties.concept_type': {$in: constants.DEFAULT_ENTITY_GROUP_TYPES}
    });

    return Concepts.findOne(conceptQuery).lean().exec((error, concept: any) => {
      if (error || !concept) {
        return onPropertiesFound(error || `There is no entity domain '${entityDomainGid}'`);
      }

      const projection = EntitiesRepository.makePositiveProjectionFor(_.without(select, entityDomainGid));
      if (_.includes(select, entityDomainGid)) {
        projection.gid = 1;
      }
      if (!_.isEmpty(projection)) {
        projection.gid = 1;
        projection.originId = 1;
        projection.domain = 1;
      }

      const normalizedWhereClause = this._normalizeWhereClause(where);
      const whereClauseWithSubstitutedGid = _.mapKeys(normalizedWhereClause, (value, key: string) => {
        if (entityDomainGid === key) {
          return 'gid';
        }

        return key.slice(key.indexOf('.') + 1);
      });
      const whereWithPrefixedProperties = EntitiesRepository.toPropertiesDotNotation(whereClauseWithSubstitutedGid);

      const entitiesQuery = this._composeQuery({$or: [{domain: concept.originId}, {sets: concept.originId}]}, whereWithPrefixedProperties);

      return Entities.find(entitiesQuery, projection).lean().exec(onPropertiesFound);
    });
  }

  public addTranslationsForGivenProperties(properties, externalContext, done) {
    const {source, language, resolvedProperties} = externalContext;

    const subEntityQuery = _.extend({sources: source}, resolvedProperties);
    const query = this._composeQuery(subEntityQuery);

    const updateQuery = {
      $set: {
        languages: {
          [language.id]: properties
        }
      }
    };

    return Entities.update(query, updateQuery).exec(done);
  }

  private static makePositiveProjectionFor(properties): any {
    const positiveProjectionValues = _.fill(new Array(_.size(properties)), 1);
    return EntitiesRepository.toPropertiesDotNotation(_.chain(properties).zipObject(positiveProjectionValues).value());
  }

  private static toPropertiesDotNotation(object) {
    return _.mapKeys(object, (value, property: string) => property === 'gid' ? property : `properties.${property}`);
  }
}

class EntitiesRepositoryFactory extends VersionedModelRepositoryFactory<EntitiesRepository> {
  public constructor() {
    super(EntitiesRepository);
  }
}

const repositoryFactory = new EntitiesRepositoryFactory();
export { repositoryFactory as EntitiesRepositoryFactory };
