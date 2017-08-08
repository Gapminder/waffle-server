import * as _ from 'lodash';
import * as async from 'async';
import { model } from 'mongoose';

import { VersionedModelRepository } from '../../versioned-model-repository';
import { VersionedModelRepositoryFactory } from '../../versioned-model-repository-factory';
import { constants } from '../../../ws.utils/constants';
import { logger } from '../../../ws.config/log';

const Concepts = model('Concepts');

export class ConceptsRepository extends VersionedModelRepository {

  // TODO: Move this in utils that should be common across all repositories
  private static makePositiveProjectionFor(properties: any): any {
    const positiveProjectionValues = _.fill(new Array(_.size(properties)), 1);
    return ConceptsRepository.prefixWithProperties(_.zipObject(properties, positiveProjectionValues));
  }

  private static prefixWithProperties(object: any): any {
    return _.mapKeys(object, (value: any, property: any) => `${constants.PROPERTIES}.${property}`);
  }

  public constructor(versionQueryFragment: any, datasetId?: any, version?: any) {
    super(versionQueryFragment, datasetId, version);
  }

  protected _getModel(): any {
    return Concepts;
  }

  public findConceptsByQuery(conceptsQuery: any, onPropertiesFound: Function): Promise<Object> {
    const composedQuery = this._composeQuery(conceptsQuery);

    logger.debug({mongo: composedQuery});
    return Concepts.find(composedQuery).lean().exec(onPropertiesFound);
  }

  public findConceptProperties(select: any, where: any, onPropertiesFound: Function): Promise<Object> {
    const projection = ConceptsRepository.makePositiveProjectionFor(select);
    if (!_.isEmpty(projection)) {
      projection.gid = 1;
      projection.originId = 1;
      projection[`${constants.PROPERTIES}.${constants.CONCEPT_TYPE}`] = 1;
    }

    const normalizedWhereClause = this._normalizeWhereClause(where);
    const conceptQuery = this._composeQuery(ConceptsRepository.prefixWithProperties(normalizedWhereClause));

    return Concepts.find(conceptQuery, projection).lean().exec(onPropertiesFound);
  }

  public addSubsetOfByGid({gid, parentConceptId}: any, done: (err: any) => void): any {
    const query = this._composeQuery({[`${constants.PROPERTIES}.drill_up`]: gid});
    return Concepts.update(query, {$addToSet: {subsetOf: parentConceptId}}, {multi: true}, done);
  }

  public setDomainByGid({gid, domainConceptId}: any, done: (err: any) => void): any {
    const query = this._composeQuery({[`${constants.PROPERTIES}.domain`]: gid});
    return Concepts.update(query, {$set: {domain: domainConceptId}}, {multi: true}, done);
  }

  public findDistinctDrillups(done: Function): Promise<Object> {
    const query = this._composeQuery();
    return Concepts.distinct(`${constants.PROPERTIES}.drill_up`, query).lean().exec(done);
  }

  public findDistinctDomains(done: Function): Promise<Object> {
    const query = this._composeQuery();
    return Concepts.distinct(`${constants.PROPERTIES}.domain`, query).lean().exec(done);
  }

  public closeByGid(gid: any, onClosed: Function): any {
    const query = this._composeQuery({gid});
    return Concepts.findOneAndUpdate(query, {$set: {to: this.version}}, {new: false}).lean().exec(onClosed);
  }

  public closeOneByQuery(closingQuery: any, onClosed: Function): Promise<Object> {
    const query = this._composeQuery(closingQuery);
    return Concepts.findOneAndUpdate(query, {$set: {to: this.version}}, {new: false}).lean().exec(onClosed);
  }

  public closeById(conceptId: any, onClosed: Function): Promise<Object> {
    const query = this._composeQuery({_id: conceptId});
    return Concepts.findOneAndUpdate(query, {$set: {to: this.version}}, {new: false}).lean().exec(onClosed);
  }

  public count(onCounted: (err: any, count: number) => void): any {
    const countQuery = this._composeQuery();
    return Concepts.count(countQuery, onCounted);
  }

  public rollback(transaction: any, onRolledback: (err: any) => void): any {
    const {createdAt: versionToRollback, dataset} = transaction;

    return async.parallelLimit([
      (done: Function) => Concepts.update({dataset, to: versionToRollback}, {$set: {to: constants.MAX_VERSION}}, {multi: true}).lean().exec(done),
      (done: (err: any) => void) => Concepts.remove({dataset, from: versionToRollback}, done)
    ], constants.LIMIT_NUMBER_PROCESS, onRolledback);
  }

  public removeByDataset(datasetId: any, onRemove: AsyncResultArrayCallback<string, any>): any {
    return Concepts.remove({dataset: datasetId}, onRemove);
  }

  public findAllPopulated(done: Function): any {
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
  }

  public findAll(onFound: Function): Promise<Object> {
    const countQuery = this._composeQuery();
    return Concepts.find(countQuery).lean().exec(onFound);
  }

  public findByGid(gid: any, onFound: Function): Promise<Object> {
    const query = this._composeQuery({gid});
    return Concepts.findOne(query).lean().exec(onFound);
  }

  public findTargetForTranslation(params: any, done: Function): Promise<Object> {
    return this.findByGid(params.gid, done);
  }

  public removeTranslation({originId, language}: any, done: (err: any) => void): any {
    return Concepts.findOneAndUpdate({originId}, {$unset: {[`languages.${language}`]: 1}}, {new: true}, done);
  }

  public addTranslation({id, language, translation}: any, done: (err: any) => void): any {
    return Concepts.findOneAndUpdate({_id: id}, {$set: {[`languages.${language}`]: translation}}, {new: true}, done);
  }

  public addTranslationsForGivenProperties(properties: any, externalContext: any, done?: Function): Promise<Object> {
    const {language} = externalContext;

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
  }
}

/* tslint:disable-next-line:max-classes-per-file */
class ConceptsRepositoryFactory extends VersionedModelRepositoryFactory<ConceptsRepository> {
  public constructor() {
    super(ConceptsRepository);
  }
}

const repositoryFactory = new ConceptsRepositoryFactory();
export { repositoryFactory as ConceptsRepositoryFactory };
