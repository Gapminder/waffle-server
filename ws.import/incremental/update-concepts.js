'use strict';

const _ = require('lodash');
const async = require('async');

const conceptsRepositoryFactory = require('../../ws.repository/ddf/concepts/concepts.repository');
const ddfImportUtils = require('../import-ddf.utils');
const constants = require('../../ws.utils/constants');
const ddfMappers = require('./../ddf-mappers');

module.exports = (pipe, done) => {
  if (!pipe.allChanges['ddf--concepts.csv']) {
    return done(null, pipe);
  }

  const conceptChanges = pipe.allChanges['ddf--concepts.csv'];
  const remove = conceptChanges.body.remove;
  const create = conceptChanges.body.create;
  const change = conceptChanges.body.change;
  const update = conceptChanges.body.update;
  const translate = conceptChanges.body.translate;
  const removedProperties = conceptChanges.header.remove;

  return async.waterfall([
    async.constant({external: pipe, internal: {}}),
    processRemovedConcepts(remove),
    processCreatedConcepts(create),
    processUpdatedConcepts(mergeConceptModifications(change, update, translate), removedProperties)
  ], error => {
    return done(error, pipe);
  });
};

function processRemovedConcepts(removedConcepts) {
  return (pipe, done) => {

    const conceptsRepository = conceptsRepositoryFactory.latestExceptCurrentVersion(
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
  return (pipe, done) => {
    const propsWereAddedToConcepts = _.isEmpty(removedProperties);

    let applyModificationsToConcepts;
    if (propsWereAddedToConcepts) {
      applyModificationsToConcepts = applyChangesToConcepts(updatedConcepts);
    } else {
      applyModificationsToConcepts = applyUpdatesToConcepts(updatedConcepts, removedProperties);
    }

    return async.waterfall([
        async.constant(pipe),
        applyModificationsToConcepts,
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

function createConcepts(conceptChanges) {
  return (pipe, done) => {

    const {external: {dataset: {_id: datasetId}, transaction: {createdAt: version}}} = pipe;

    const concepts = _.map(conceptChanges, conceptChange => {
      return ddfMappers.mapDdfConceptsToWsModel(conceptChange, {datasetId, version});
    });

    const uniqConcepts = _.uniqBy(concepts, 'gid');

    if (uniqConcepts.length !== concepts.length) {
      return done('All concept gid\'s should be unique within the dataset!');
    }

    const chunkSize = 100;

    const conceptsRepository = conceptsRepositoryFactory.versionAgnostic();

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
    conceptsRepositoryFactory
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
    return conceptsRepositoryFactory
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
    const conceptsRepository = conceptsRepositoryFactory
      .latestExceptCurrentVersion(pipe.external.dataset._id, pipe.external.transaction.createdAt);

    return async.forEachOfLimit(changedConcepts, constants.LIMIT_NUMBER_PROCESS, (changesToConcept, gid, onChangesApplied) => {
      conceptsRepository.closeByGid(gid, (error, originalConcept) => {
        if (error) {
          return onChangesApplied(error);
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
    const conceptsRepository = conceptsRepositoryFactory
      .latestExceptCurrentVersion(pipe.external.dataset._id, pipe.external.transaction.createdAt);

    return conceptsRepository.findAll((error, originalConcepts) => {
      if (error) {
        return done(error);
      }

      return async.eachLimit(originalConcepts, constants.LIMIT_NUMBER_PROCESS, (originalConcept, onUpdateApplied) => {
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

function  getAllConcepts() {
  return (pipe, done) => {
    return conceptsRepositoryFactory.latestVersion(pipe.external.dataset._id, pipe.external.transaction.createdAt)
      .findAll((error, res) => {
        pipe.internal.concepts = _.keyBy(res, 'gid');
        return done(error, pipe);
      });
  };
}

function populateConceptsDrillups() {
  return (pipe, done) => {

    const conceptsRepository = conceptsRepositoryFactory
      .allOpenedInGivenVersion(pipe.external.dataset._id, pipe.external.transaction.createdAt);

    return async.eachLimit(pipe.internal.drillUps, constants.LIMIT_NUMBER_PROCESS, (gid, onDrillupsPopulated) => {
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
    const conceptsRepository = conceptsRepositoryFactory
      .allOpenedInGivenVersion(pipe.external.dataset._id, pipe.external.transaction.createdAt);

    return async.eachLimit(pipe.internal.domains, constants.LIMIT_NUMBER_PROCESS, (gid, onDomainPopulated) => {
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
  let updatedConcept = _.mergeWith(originalConcept, changesToConcept, (originalValue, changedValue, property) => {
    if (property === 'concept') {
      originalConcept.gid = changedValue;
    }

    if (property === 'concept_type') {
      originalConcept.type = changedValue === 'time' ? 'entity_domain' : changedValue;
    }

    if (ddfImportUtils.isJson(changedValue)) {
      return JSON.parse(changedValue);
    }

    if (ddfImportUtils.isPropertyReserved(property)) {
      return originalValue;
    }
  });

  _.mergeWith(updatedConcept.properties, changesToConcept, (originalValue, changedValue) => {
    if (ddfImportUtils.isJson(changedValue)) {
      return JSON.parse(changedValue);
    }
  });

  updatedConcept = _.omit(updatedConcept, ['concept', 'drill_up', '_id', 'subsetOf', 'domain']);
  updatedConcept.from = currentTransaction.createdAt;
  updatedConcept.to = constants.MAX_VERSION;
  updatedConcept.transaction = currentTransaction._id;
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
