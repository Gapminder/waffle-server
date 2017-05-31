import * as _ from 'lodash';
import * as async from 'async';
import {ChangesDescriptor} from '../utils/changes-descriptor';
import {ConceptsRepositoryFactory} from '../../ws.repository/ddf/concepts/concepts.repository';
import * as ddfImportUtils from '../utils/import-ddf.utils';
import * as conceptsUtils from '../utils/concepts.utils';
import {constants} from '../../ws.utils/constants';
import * as fileUtils from '../../ws.utils/file';
import * as ddfMappers from '../utils/ddf-mappers';
import {logger} from '../../ws.config/log';

export {
  startConceptsCreation as updateConcepts
};

function startConceptsCreation(externalContext: any, done: Function): void {

  logger.info('start process of updating concepts');

  const externalContextFrozen = Object.freeze(_.pick(externalContext, [
    'pathToDatasetDiff',
    'transaction',
    'dataset'
  ]));

  return updateConcepts(externalContextFrozen, (error: string) => {
    return done(error, externalContext);
  });
}

function updateConcepts(externalContext: any, done: Function): void {
  let removedProperties;

  return fileUtils.readTextFileByLineAsJsonStream(externalContext.pathToDatasetDiff)
    .map((changes: any) => new ChangesDescriptor(changes))
    .filter((changesDescriptor: ChangesDescriptor) => changesDescriptor.describes(constants.CONCEPTS))
    .map((changesDescriptor: ChangesDescriptor) => {
      if (!removedProperties) {
        removedProperties = changesDescriptor.removedColumns;
      }
      return changesDescriptor;
    })
    .group((changesDescriptor: ChangesDescriptor) => changesDescriptor.action)
    .stopOnError((error: string) => {
      return done(error);
    })
    .toCallback((err: string, allChanges: any) => {
      const remove = _.map(allChanges.remove, '_object');
      const create = _.map(allChanges.create, '_object');
      const change = _.map(allChanges.change, '_object');
      const update = _.map(allChanges.update, '_object');

      return async.waterfall([
        async.constant({external: externalContext, internal: {}}),
        processRemovedConcepts(remove),
        processCreatedConcepts(create),
        processUpdatedConcepts(mergeConceptModifications(change, update), removedProperties)
      ], (error: string) => done(error, externalContext));
    });
}

function processRemovedConcepts(removedConcepts: any): any {
  return (pipe: any, done: Function) => {
    if (_.isEmpty(removedConcepts)) {
      return done(null, pipe);
    }

    const conceptsRepository = ConceptsRepositoryFactory.latestExceptCurrentVersion(
      pipe.external.dataset._id,
      pipe.external.transaction.createdAt
    );

    return async.eachLimit(removedConcepts, constants.LIMIT_NUMBER_PROCESS, (removedConcept: any, onConceptClosed: any) => {
      return conceptsRepository.closeByGid(getGid(removedConcept), onConceptClosed);
    }, (error: string) => {
      return done(error, pipe);
    });
  };
}

function processCreatedConcepts(createdConcepts: any): any {
  return (pipe: any, done: Function) => {
    return async.waterfall([
        async.constant(pipe),
        createConcepts(createdConcepts),
        getAllConcepts(),
        getDrillupsOfChangedConcepts(),
        populateConceptsDrillups(),
        getDomainsOfChangedConcepts(),
        populateConceptsDomains()
      ],
      (error: string) => {
        return done(error, pipe);
      });
  };
}

function processUpdatedConcepts(updatedConcepts: any, removedProperties: any): any {
  return (externalContext: any, done: Function) => {
    if (_.isEmpty(updatedConcepts) && _.isEmpty(removedProperties)) {
      return done(null, externalContext);
    }

    const propsWereAddedToConcepts = _.isEmpty(removedProperties);

    let applyModificationsToConcepts;
    if (propsWereAddedToConcepts) {
      applyModificationsToConcepts = applyChangesToConcepts(updatedConcepts);
    } else {
      applyModificationsToConcepts = applyUpdatesToConcepts(updatedConcepts, removedProperties);
    }

    return async.waterfall([
        async.constant(externalContext),
        applyModificationsToConcepts,
        getAllConcepts(),
        getDrillupsOfChangedConcepts(),
        populateConceptsDrillups(),
        getDomainsOfChangedConcepts(),
        populateConceptsDomains()
      ],
      (error: string) => {
        return done(error, externalContext);
      });
  };
}

function createConcepts(conceptChanges: any): any {
  return (pipe: any, done: Function) => {
    if (_.isEmpty(conceptChanges)) {
      return done(null, pipe);
    }

    const datasetId = _.get(pipe, 'external.dataset._id', null);
    const version = _.get(pipe, 'external.transaction.createdAt', null);

    const concepts = _.map(conceptChanges, (conceptChange: any) => {
      return ddfMappers.mapDdfConceptsToWsModel(conceptChange, {datasetId, version});
    });

    const uniqConcepts = _.uniqBy(concepts, 'gid');

    if (uniqConcepts.length !== concepts.length) {
      return done('All concept gid\'s should be unique within the dataset!');
    }

    const chunkSize = 100;

    const conceptsRepository = ConceptsRepositoryFactory.versionAgnostic();

    return async.eachLimit(_.chunk(concepts, chunkSize), constants.LIMIT_NUMBER_PROCESS,
      (chunk: any, onConceptsChunkCreated: Function) => {
        return conceptsRepository.create(chunk, onConceptsChunkCreated);
      }, (error: string) => {
        return done(error, pipe);
      });
  };
}

function getDrillupsOfChangedConcepts(): any {
  return (pipe: any, done: Function) => {
    ConceptsRepositoryFactory
      .allOpenedInGivenVersion(pipe.external.dataset._id, pipe.external.transaction.createdAt)
      .findDistinctDrillups((error: string, drillUps: any) => {
        if (error) {
          return done(error);
        }

        pipe.internal.drillUps = _.compact(drillUps);
        return done(error, pipe);
      });
  };
}

function getDomainsOfChangedConcepts(): any {
  return (pipe: any, done: Function) => {
    return ConceptsRepositoryFactory
      .allOpenedInGivenVersion(pipe.external.dataset._id, pipe.external.transaction.createdAt)
      .findDistinctDomains((error: string, domains: any) => {
        if (error) {
          return done(error);
        }

        pipe.internal.domains = _.compact(domains);
        return done(error, pipe);
      });
  };
}

function applyChangesToConcepts(changedConcepts: any): any {
  return (pipe: any, done: Function) => {
    const conceptsRepository = ConceptsRepositoryFactory
      .latestExceptCurrentVersion(pipe.external.dataset._id, pipe.external.transaction.createdAt);

    return async.forEachOfLimit(changedConcepts, constants.LIMIT_NUMBER_PROCESS, (changesToConcept: any, gid: any, onChangesApplied: Function) => {
      conceptsRepository.closeByGid(gid, (error: string, originalConcept: any) => {
        if (error) {
          return onChangesApplied(error);
        }

        if (!originalConcept) {
          logger.debug(`There is no original concept with gid '${gid}' in db`);
          return onChangesApplied();
        }

        const updatedConcept = mergeConcepts(originalConcept, changesToConcept, pipe.external.transaction);
        return conceptsRepository.create(updatedConcept, onChangesApplied);
      });
    }, (error: string) => {
      return done(error, pipe);
    });
  };
}

function applyUpdatesToConcepts(changedConcepts: any, removedProperties: any): any {
  return (pipe: any, done: Function) => {
    const conceptsRepository = ConceptsRepositoryFactory
      .latestExceptCurrentVersion(pipe.external.dataset._id, pipe.external.transaction.createdAt);

    return conceptsRepository.findAll((error: string, originalConcepts: any) => {
      if (error) {
        return done(error);
      }

      return async.eachLimit(originalConcepts, constants.LIMIT_NUMBER_PROCESS, (originalConcept: any, onUpdateApplied: Function) => {
        conceptsRepository.closeById(originalConcept._id, (err: string, closedOriginalConcept: any) => {
          if (err) {
            return onUpdateApplied(err);
          }

          const updates = changedConcepts[closedOriginalConcept.gid];

          let updatedConcept = mergeConcepts(closedOriginalConcept, updates, pipe.external.transaction);
          updatedConcept = omitRemovedProperties(updatedConcept, removedProperties);
          updatedConcept.properties = omitRemovedProperties(updatedConcept.properties, removedProperties);

          return conceptsRepository.create(updatedConcept, onUpdateApplied);
        });
      }, (err: string) => {
        return done(err, pipe);
      });
    });
  };
}

function getAllConcepts(): any {
  return (pipe: any, done: Function) => {
    return ConceptsRepositoryFactory.latestVersion(pipe.external.dataset._id, pipe.external.transaction.createdAt)
      .findAll((error: string, res: any) => {
        pipe.internal.concepts = _.keyBy(res, 'gid');
        return done(error, pipe);
      });
  };
}

function populateConceptsDrillups(): any {
  return (pipe: any, done: Function) => {

    const conceptsRepository = ConceptsRepositoryFactory
      .allOpenedInGivenVersion(pipe.external.dataset._id, pipe.external.transaction.createdAt);

    return async.eachLimit(pipe.internal.drillUps, constants.LIMIT_NUMBER_PROCESS, (gid: string, onDrillupsPopulated: (err: any) => void) => {
      let concept = pipe.internal.concepts[gid];

      if (!concept) {
        return async.setImmediate(onDrillupsPopulated);
      }

      return conceptsRepository.addSubsetOfByGid({gid, parentConceptId: concept.originId}, onDrillupsPopulated);
    }, (error: string) => {
      return done(error, pipe);
    });
  };
}

function populateConceptsDomains(): any {
  return (pipe: any, done: Function) => {
    const conceptsRepository = ConceptsRepositoryFactory
      .allOpenedInGivenVersion(pipe.external.dataset._id, pipe.external.transaction.createdAt);

    return async.eachLimit(pipe.internal.domains, constants.LIMIT_NUMBER_PROCESS, (gid: string, onDomainPopulated: (err: any) => void) => {
      let concept = pipe.internal.concepts[gid];

      if (!concept) {
        return async.setImmediate(onDomainPopulated);
      }

      return conceptsRepository.setDomainByGid({gid, domainConceptId: concept.originId}, onDomainPopulated);
    }, (error: string) => {
      return done(error, pipe);
    });
  };
}

// HELPERS -------------------------------------------------------------------------------------------------------------

function getGid(conceptChange: any): any {
  return conceptChange[conceptChange.gid];
}

function mergeConcepts(originalConcept: any, changesToConcept: any, currentTransaction: any): any {
  const originalConceptKeys = _.keys(originalConcept);
  let updatedConcept = _.mergeWith(originalConcept, changesToConcept, (originalValue: any, changedValue: any, property: any) => {
    if (property === 'concept') {
      originalConcept.gid = changedValue;
    }

    if (property === 'concept_type') {
      originalConcept.type = conceptsUtils.isTimeConceptType(changedValue) ? 'entity_domain' : changedValue;
    }

    if (ddfImportUtils.isJson(changedValue)) {
      return JSON.parse(changedValue);
    }

    if (ddfImportUtils.isPropertyReserved(property)) {
      return originalValue;
    }
  });

  _.merge(updatedConcept.properties, ddfMappers.transformConceptProperties(changesToConcept));

  updatedConcept = _.chain(updatedConcept)
    .omit(['concept', 'drill_up', '_id', 'subsetOf', 'domain', 'transaction'])
    .pick(originalConceptKeys)
    .value();
  updatedConcept.from = currentTransaction.createdAt;
  updatedConcept.to = constants.MAX_VERSION;
  return updatedConcept;
}

/**
 *
 * @param conceptChanges - changes to row's cells in ddf--concept.csv
 * @param conceptUpdates - structural changes in ddf--concept.csv - e.g. new column was added, etc.
 * @returns {Object} object keys of which are concept gids and values are objects with updated properties (cells)
 */
function mergeConceptModifications(conceptChanges: any, conceptUpdates: any): any {
  return _.mapValues(_.groupBy(_.concat(conceptChanges, conceptUpdates), getGid), (values: any) => {
    return _.merge.apply(null, _.flatMap(values, (value: any) => value['data-update']));
  });
}

function omitRemovedProperties(concept: any, removedProperties: any): any {
  return _.omitBy(concept, (value: any, property: any) => {
    return _.includes(removedProperties, property) && !ddfImportUtils.isPropertyReserved(property);
  });
}
