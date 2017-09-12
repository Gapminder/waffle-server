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

  private static makePositiveProjectionFor(properties: any): any {
    const positiveProjectionValues = _.fill(new Array(_.size(properties)), 1);
    return EntitiesRepository.toPropertiesDotNotation(_.chain(properties).zipObject(positiveProjectionValues).value());
  }

  private static toPropertiesDotNotation(object: any): Dictionary<{}> {
    return _.mapKeys(object, (value: any, property: string) => property === 'gid' ? property : `${constants.PROPERTIES}.${property}`);
  }

  public constructor(versionQueryFragment: any, datasetId?: any, version?: any) {
    super(versionQueryFragment, datasetId, version);
  }

  protected _getModel(): any {
    return Entities;
  }

  public count(onCounted: Function): any {
    const countQuery = this._composeQuery();
    return Entities.count(countQuery, onCounted as any);
  }

  public rollback(transaction: any, onRolledback: Function): void {
    const {createdAt: versionToRollback, dataset} = transaction;

    return async.parallelLimit([
      (done: Function) => Entities.update({dataset, to: versionToRollback}, {$set: {to: constants.MAX_VERSION}}, {multi: true}).lean().exec(done),
      (done: (err: any) => void) => Entities.remove({dataset, from: versionToRollback}, done)
    ], constants.LIMIT_NUMBER_PROCESS, onRolledback as any);
  }

  public removeByDataset(datasetId: any, onRemove: AsyncResultArrayCallback<string, any>): any {
    return Entities.remove({dataset: datasetId}, onRemove);
  }

  public closeOneByQuery(closeQuery: any, done: Function): any {
    const query = this._composeQuery(closeQuery);
    return Entities.findOneAndUpdate(query, {$set: {to: this.version}}, {new: true}).lean().exec(done);
  }

  public findTargetForTranslation(params: any, done: Function): Promise<Object> {
    const {domain, sets, gid, sources} = params;
    const query = this._composeQuery({domain, sets, gid, sources});
    return Entities.findOne(query).lean().exec(done);
  }

  public removeTranslation({originId, language}: any, done: (err: any) => void): any {
    return Entities.findOneAndUpdate({originId}, {$unset: {[`languages.${language}`]: 1}}, {new: true}, done);
  }

  public addTranslation({id, language, translation}: any, done: (err: any) => void): any {
    return Entities.findOneAndUpdate({_id: id}, {$set: {[`languages.${language}`]: translation}}, {new: true}, done);
  }

  public findEntityPropertiesByQuery(entitiesQuery: any, onPropertiesFound: Function): Promise<Object> {
    const composedQuery = this._composeQuery(entitiesQuery);
    logger.debug({mongo: composedQuery}, 'Query to get entities according to ddfql');
    return Entities.find(composedQuery).lean().exec(onPropertiesFound);
  }

  public findAll(done?: Function): Promise<Object> {
    const composedQuery = this._composeQuery();
    return Entities.find(composedQuery).lean().exec(done);
  }

  public findEntityProperties(entityDomainGid: any, select: any, where: any, onPropertiesFound: Function): Promise<Object> {
    const conceptQuery = this._composeQuery({
      gid: entityDomainGid,
      [`${constants.PROPERTIES}.${constants.CONCEPT_TYPE}`]: {$in: constants.DEFAULT_ENTITY_GROUP_TYPES}
    });

    return Concepts.findOne(conceptQuery).lean().exec((error: string, concept: any) => {
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
      const whereClauseWithSubstitutedGid = _.mapKeys(normalizedWhereClause, (value: any, key: string) => {
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

  public addTranslationsForGivenProperties(properties: any, externalContext: any, done?: Function): Promise<any> {
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

    logger.debug('[Import:Entities] Add translations', query);

    return Entities.update(query, updateQuery).exec(done);
  }
}

class EntitiesRepositoryFactory extends VersionedModelRepositoryFactory<EntitiesRepository> {
  public constructor() {
    super(EntitiesRepository);
  }
}

const repositoryFactory = new EntitiesRepositoryFactory();
export { repositoryFactory as EntitiesRepositoryFactory };
