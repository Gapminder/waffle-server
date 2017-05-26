import * as _ from 'lodash';
import * as async from 'async';
import { model } from 'mongoose';

import { VersionedModelRepository } from '../../versioned-model-repository';
import { VersionedModelRepositoryFactory } from '../../versioned-model-repository-factory';
import { constants } from '../../../ws.utils/constants';

const Concepts = model('Concepts');

export class ConceptsRepository extends VersionedModelRepository {

  // TODO: Move this in utils that should be common across all repositories
  private static makePositiveProjectionFor(properties: any): any {
    const positiveProjectionValues = _.fill(new Array(_.size(properties)), 1);
    return ConceptsRepository.prefixWithProperties(_.zipObject(properties, positiveProjectionValues));
  }

  private static prefixWithProperties(object: any): any {
    return _.mapKeys(object, (value: any, property: any) => `properties.${property}`);
  }

  public constructor(versionQueryFragment: any, datasetId?: any, version?: any) {
    super(versionQueryFragment, datasetId, version);
  }

  protected _getModel(): any {
    return Concepts;
  }

  public findConceptsByQuery(conceptsQuery: any, onPropertiesFound: any): Promise<Object> {
    const composedQuery = this._composeQuery(conceptsQuery);
    return Concepts.find(composedQuery).lean().exec(onPropertiesFound);
  }

  public findConceptProperties(select: any, where: any, onPropertiesFound: any): Promise<Object> {
    const projection = ConceptsRepository.makePositiveProjectionFor(select);
    if (!_.isEmpty(projection)) {
      projection.gid = 1;
      projection.originId = 1;
      projection['properties.concept_type'] = 1;
    }

    const normalizedWhereClause = this._normalizeWhereClause(where);
    const conceptQuery = this._composeQuery(ConceptsRepository.prefixWithProperties(normalizedWhereClause));

    return Concepts.find(conceptQuery, projection).lean().exec(onPropertiesFound);
  }

  public addSubsetOfByGid({gid, parentConceptId}: any, done: any): any {
    const query = this._composeQuery({'properties.drill_up': gid});
    return Concepts.update(query, {$addToSet: {subsetOf: parentConceptId}}, {multi: true}, done);
  }

  public setDomainByGid({gid, domainConceptId}: any, done: any): any {
    const query = this._composeQuery({'properties.domain': gid});
    return Concepts.update(query, {$set: {domain: domainConceptId}}, {multi: true}, done);
  }

  public findDistinctDrillups(done: Function): Promise<Object> {
    const query = this._composeQuery();
    return Concepts.distinct('properties.drill_up', query).lean().exec(done);
  }

  public findDistinctDomains(done: Function): Promise<Object> {
    const query = this._composeQuery();
    return Concepts.distinct('properties.domain', query).lean().exec(done);
  }

  public closeByGid(gid: any, onClosed: any): any {
    const query = this._composeQuery({gid});
    return Concepts.findOneAndUpdate(query, {$set: {to: this.version}}, {new: false}).lean().exec(onClosed);
  }

  public closeOneByQuery(closingQuery: any, onClosed: any): Promise<Object> {
    const query = this._composeQuery(closingQuery);
    return Concepts.findOneAndUpdate(query, {$set: {to: this.version}}, {new: false}).lean().exec(onClosed);
  }

  public closeById(conceptId: any, onClosed: any): Promise<Object> {
    const query = this._composeQuery({_id: conceptId});
    return Concepts.findOneAndUpdate(query, {$set: {to: this.version}}, {new: false}).lean().exec(onClosed);
  }

  public count(onCounted: any): any {
    const countQuery = this._composeQuery();
    return Concepts.count(countQuery, onCounted);
  }

  public rollback(transaction: any, onRolledback: any): any {
    const {createdAt: versionToRollback, dataset} = transaction;

    return async.parallelLimit([
      (done: Function) => Concepts.update({dataset, to: versionToRollback}, {$set: {to: constants.MAX_VERSION}}, {multi: true}).lean().exec(done),
      (done: any) => Concepts.remove({dataset, from: versionToRollback}, done)
    ], constants.LIMIT_NUMBER_PROCESS, onRolledback);
  }

  public removeByDataset(datasetId: any, onRemove: any): any {
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

  public findAll(onFound: any): Promise<Object> {
    const countQuery = this._composeQuery();
    return Concepts.find(countQuery).lean().exec(onFound);
  }

  public findByGid(gid: any, onFound: any): Promise<Object> {
    const query = this._composeQuery({gid});
    return Concepts.findOne(query).lean().exec(onFound);
  }

  public findTargetForTranslation(params: any, done: Function): Promise<Object> {
    return this.findByGid(params.gid, done);
  }

  public removeTranslation({originId, language}: any, done: any): any {
    return Concepts.findOneAndUpdate({originId}, {$unset: {[`languages.${language}`]: 1}}, {new: true}, done);
  }

  public addTranslation({id, language, translation}: any, done: any): any {
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
