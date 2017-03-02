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

function startConceptsCreation(externalContext, done) {

  logger.info('start process of updating concepts');

  const externalContextFrozen = Object.freeze(_.pick(externalContext, [
    'pathToDatasetDiff',
    'transaction',
    'dataset'
  ]));

  return updateConcepts(externalContextFrozen, (error) => {
    return done(error, externalContext);
  });
}

function updateConcepts(externalContext, done) {
  let removedProperties;

  return fileUtils.readTextFileByLineAsJsonStream(externalContext.pathToDatasetDiff)
    .map(changes => new ChangesDescriptor(changes))
    .filter(changesDescriptor => changesDescriptor.describes(constants.CONCEPTS))
    .map(changesDescriptor => {
      if (!removedProperties) {
        removedProperties = changesDescriptor.removedColumns;
      }
      return changesDescriptor;
    })
    .group(changesDescriptor => changesDescriptor.action)
    .stopOnError(error => {
      return done(error);
    })
    .toCallback((err, allChanges) => {
      const remove = _.map(allChanges.remove, '_object');
      const create = _.map(allChanges.create, '_object');
      const change = _.map(allChanges.change, '_object');
      const update = _.map(allChanges.update, '_object');

      return async.waterfall([
        async.constant({external: externalContext, internal: {}}),
        processRemovedConcepts(remove),
        processCreatedConcepts(create),
        processUpdatedConcepts(mergeConceptModifications(change, update), removedProperties)
      ], err => done(err, externalContext));
    });
}

function processRemovedConcepts(removedConcepts) {
  return (pipe, done) => {
    if (_.isEmpty(removedConcepts)) {
      return done(null, pipe);
    }

    const conceptsRepository = ConceptsRepositoryFactory.latestExceptCurrentVersion(
      pipe.external.dataset._id,
      pipe.external.transaction.createdAt
    );

    return async.eachLimit(removedConcepts, constants.LIMIT_NUMBER_PROCESS, (removedConcept, onConceptClosed) => {
      return conceptsRepository.closeByGid(getGid(removedConcept), onConceptClosed);
    }, error => {
      return done(error, pipe);
    });
  };
}

function processCreatedConcepts(createdConcepts) {
  return (pipe, done) => {
    return async.waterfall([
        async.constant(pipe),
        createConcepts(createdConcepts),
        getAllConcepts(),
        getDrillupsOfChangedConcepts(),
        populateConceptsDrillups(),
        getDomainsOfChangedConcepts(),
        populateConceptsDomains()
      ],
      error => {
        return done(error, pipe);
      });
  };
}

function processUpdatedConcepts(updatedConcepts, removedProperties) {
  return (externalContext, done) => {
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
      error => {
        return done(error, externalContext);
      });
  };
}

function createConcepts(conceptChanges) {
  return (pipe, done) => {
    if (_.isEmpty(conceptChanges)) {
      return done(null, pipe);
    }

    const datasetId = _.get(pipe, 'external.dataset._id', null);
    const version = _.get(pipe, 'external.transaction.createdAt', null);

    const concepts = _.map(conceptChanges, conceptChange => {
      return ddfMappers.mapDdfConceptsToWsModel(conceptChange, {datasetId, version});
    });

    const uniqConcepts = _.uniqBy(concepts, 'gid');

    if (uniqConcepts.length !== concepts.length) {
      return done('All concept gid\'s should be unique within the dataset!');
    }

    const chunkSize = 100;

    const conceptsRepository = ConceptsRepositoryFactory.versionAgnostic();

    return async.eachLimit(_.chunk(concepts, chunkSize), constants.LIMIT_NUMBER_PROCESS,
      (chunk, onConceptsChunkCreated) => {
        return conceptsRepository.create(chunk, onConceptsChunkCreated);
      }, error => {
        return done(error, pipe);
      });
  };
}

function getDrillupsOfChangedConcepts() {
  return (pipe, done) => {
    ConceptsRepositoryFactory
      .allOpenedInGivenVersion(pipe.external.dataset._id, pipe.external.transaction.createdAt)
      .findDistinctDrillups((error, drillUps) => {
        if (error) {
          return done(error);
        }

        pipe.internal.drillUps = _.compact(drillUps);
        return done(error, pipe);
      });
  };
}

function getDomainsOfChangedConcepts() {
  return (pipe, done) => {
    return ConceptsRepositoryFactory
      .allOpenedInGivenVersion(pipe.external.dataset._id, pipe.external.transaction.createdAt)
      .findDistinctDomains((error, domains) => {
        if (error) {
          return done(error);
        }

        pipe.internal.domains = _.compact(domains);
        return done(error, pipe);
      });
  };
}

function applyChangesToConcepts(changedConcepts) {
  return (pipe, done) => {
    const conceptsRepository = ConceptsRepositoryFactory
      .latestExceptCurrentVersion(pipe.external.dataset._id, pipe.external.transaction.createdAt);

    return async.forEachOfLimit(changedConcepts, constants.LIMIT_NUMBER_PROCESS, (changesToConcept, gid, onChangesApplied) => {
      conceptsRepository.closeByGid(gid, (error, originalConcept) => {
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
    }, error => {
      return done(error, pipe);
    });
  };
}

function applyUpdatesToConcepts(changedConcepts, removedProperties) {
  return (pipe, done) => {
    const conceptsRepository = ConceptsRepositoryFactory
      .latestExceptCurrentVersion(pipe.external.dataset._id, pipe.external.transaction.createdAt);

    return conceptsRepository.findAll((error, originalConcepts) => {
      if (error) {
        return done(error);
      }

      return async.eachLimit(originalConcepts, constants.LIMIT_NUMBER_PROCESS, (originalConcept: any, onUpdateApplied) => {
        conceptsRepository.closeById(originalConcept._id, (error, closedOriginalConcept) => {
          if (error) {
            return onUpdateApplied(error);
          }

          const updates = changedConcepts[closedOriginalConcept.gid];

          let updatedConcept = mergeConcepts(closedOriginalConcept, updates, pipe.external.transaction);
          updatedConcept = omitRemovedProperties(updatedConcept, removedProperties);
          updatedConcept.properties = omitRemovedProperties(updatedConcept.properties, removedProperties);

          return conceptsRepository.create(updatedConcept, onUpdateApplied);
        });
      }, error => {
        return done(error, pipe);
      });
    });
  };
}

function getAllConcepts() {
  return (pipe, done) => {
    return ConceptsRepositoryFactory.latestVersion(pipe.external.dataset._id, pipe.external.transaction.createdAt)
      .findAll((error, res) => {
        pipe.internal.concepts = _.keyBy(res, 'gid');
        return done(error, pipe);
      });
  };
}

function populateConceptsDrillups() {
  return (pipe, done) => {

    const conceptsRepository = ConceptsRepositoryFactory
      .allOpenedInGivenVersion(pipe.external.dataset._id, pipe.external.transaction.createdAt);

    return async.eachLimit(pipe.internal.drillUps, constants.LIMIT_NUMBER_PROCESS, (gid: string, onDrillupsPopulated) => {
      let concept = pipe.internal.concepts[gid];

      if (!concept) {
        return async.setImmediate(onDrillupsPopulated);
      }

      return conceptsRepository.addSubsetOfByGid({gid, parentConceptId: concept.originId}, onDrillupsPopulated);
    }, error => {
      return done(error, pipe);
    });
  };
}

function populateConceptsDomains() {
  return (pipe, done) => {
    const conceptsRepository = ConceptsRepositoryFactory
      .allOpenedInGivenVersion(pipe.external.dataset._id, pipe.external.transaction.createdAt);

    return async.eachLimit(pipe.internal.domains, constants.LIMIT_NUMBER_PROCESS, (gid: string, onDomainPopulated) => {
      let concept = pipe.internal.concepts[gid];

      if (!concept) {
        return async.setImmediate(onDomainPopulated);
      }

      return conceptsRepository.setDomainByGid({gid, domainConceptId: concept.originId}, onDomainPopulated);
    }, error => {
      return done(error, pipe);
    });
  };
}

// HELPERS -------------------------------------------------------------------------------------------------------------

function getGid(conceptChange) {
  return conceptChange[conceptChange.gid];
}

function mergeConcepts(originalConcept, changesToConcept, currentTransaction) {
  const originalConceptKeys = _.keys(originalConcept);
  let updatedConcept = _.mergeWith(originalConcept, changesToConcept, (originalValue, changedValue, property) => {
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
function mergeConceptModifications(conceptChanges, conceptUpdates) {
  return _.mapValues(_.groupBy(_.concat(conceptChanges, conceptUpdates), getGid), values => {
    return _.merge.apply(null, _.flatMap(values, value => value['data-update']));
  });
}

function omitRemovedProperties(concept, removedProperties) {
  return _.omitBy(concept, (value, property) => {
    return _.includes(removedProperties, property) && !ddfImportUtils.isPropertyReserved(property);
  });
}
