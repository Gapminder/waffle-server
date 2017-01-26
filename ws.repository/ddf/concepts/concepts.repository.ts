import * as _ from 'lodash';
import * as async from 'async';
import { model } from 'mongoose';

import { VersionedModelRepository } from '../../versioned-model-repository';
import { VersionedModelRepositoryFactory } from '../../versioned-model-repository-factory';
import { constants } from '../../../ws.utils/constants';

const Concepts = model('Concepts');

export class ConceptsRepository extends VersionedModelRepository {
  public constructor(versionQueryFragment, datasetId?, version?) {
    super(versionQueryFragment, datasetId, version);
  }

  protected _getModel(): any {
    return Concepts;
  }

  public findConceptsByQuery(conceptsQuery, onPropertiesFound) {
    const composedQuery = this._composeQuery(conceptsQuery);
    return Concepts.find(composedQuery).lean().exec(onPropertiesFound);
  }

  public findConceptProperties(select, where, onPropertiesFound) {
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

  public addSubsetOfByGid({gid, parentConceptId}, done) {
    const query = this._composeQuery({'properties.drill_up': gid});
    return Concepts.update(query, {$addToSet: {'subsetOf': parentConceptId}}, {multi: true}, done);
  }

  public setDomainByGid({gid, domainConceptId}, done) {
    const query = this._composeQuery({'properties.domain': gid});
    return Concepts.update(query, {$set: {'domain': domainConceptId}}, {multi: true}, done);
  }

  public findDistinctDrillups(done) {
    const query = this._composeQuery();
    return Concepts.distinct('properties.drill_up', query).lean().exec(done);
  }

  public findDistinctDomains(done) {
    const query = this._composeQuery();
    return Concepts.distinct('properties.domain', query).lean().exec(done);
  }

  public closeByGid(gid, onClosed) {
    const query = this._composeQuery({gid});
    return Concepts.findOneAndUpdate(query, {$set: {to: this.version}}, {'new': false}).lean().exec(onClosed);
  }

  public closeOneByQuery(closingQuery, onClosed) {
    const query = this._composeQuery(closingQuery);
    return Concepts.findOneAndUpdate(query, {$set: {to: this.version}}, {'new': false}).lean().exec(onClosed);
  }

  public closeById(conceptId, onClosed) {
    const query = this._composeQuery({_id: conceptId});
    return Concepts.findOneAndUpdate(query, {$set: {to: this.version}}, {'new': false}).lean().exec(onClosed);
  }

  public count(onCounted) {
    const countQuery = this._composeQuery();
    return Concepts.count(countQuery, onCounted);
  }

  public rollback(transaction, onRolledback) {
    const {createdAt: versionToRollback} = transaction;

    return async.parallelLimit([
      done => Concepts.update({to: versionToRollback}, {$set: {to: constants.MAX_VERSION}}, {multi: true}).lean().exec(done),
      done => Concepts.remove({from: versionToRollback}, done)
    ], constants.LIMIT_NUMBER_PROCESS, onRolledback);
  };

  public removeByDataset(datasetId, onRemove) {
    return Concepts.remove({dataset: datasetId}, onRemove);
  }

  public findAllPopulated(done) {
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

  public findAll(onFound) {
    const countQuery = this._composeQuery();
    return Concepts.find(countQuery).lean().exec(onFound);
  }

  public findByGid(gid, onFound) {
    const query = this._composeQuery({gid});
    return Concepts.findOne(query).lean().exec(onFound);
  }

  public findTargetForTranslation(params, done) {
    return this.findByGid(params.gid, done);
  }

  public removeTranslation({originId, language}, done) {
    return Concepts.findOneAndUpdate({originId}, {$unset: {[`languages.${language}`]: 1}}, {'new': true}, done);
  }

  public addTranslation({id, language, translation}, done) {
    return Concepts.findOneAndUpdate({_id: id}, {$set: {[`languages.${language}`]: translation}}, {'new': true}, done);
  }

  public addTranslationsForGivenProperties(properties, externalContext, done?) {
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

  //TODO: Move this in utils that should be common across all repositories
  private static makePositiveProjectionFor(properties): any {
    const positiveProjectionValues = _.fill(new Array(_.size(properties)), 1);
    return ConceptsRepository.prefixWithProperties(_.zipObject(properties, positiveProjectionValues));
  }

  private static prefixWithProperties(object) {
    return _.mapKeys(object, (value, property) => `properties.${property}`);
  }
}

class ConceptsRepositoryFactory extends VersionedModelRepositoryFactory<ConceptsRepository> {
  public constructor() {
    super(ConceptsRepository);
  }
}

const repositoryFactory = new ConceptsRepositoryFactory();
export { repositoryFactory as ConceptsRepositoryFactory };
