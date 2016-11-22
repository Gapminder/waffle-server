'use strict';

const _ = require('lodash');
const constants = require('../../ws.utils/constants');

const TIME_CONCEPT_TYPES = new Set(constants.TIME_CONCEPT_TYPES);

module.exports = {
  getTimeConceptGids,
  getTimeConcepts,
  isTimeConceptType
};

function getTimeConceptGids(concepts) {
  return _.map(getTimeConcepts(concepts), constants.GID);
}

function getTimeConcepts(concepts) {
  return _.chain(concepts)
    .filter(concept => isTimeConceptType(_.get(concept, 'properties.concept_type')))
    .value();
}

function isTimeConceptType(conceptType) {
  return TIME_CONCEPT_TYPES.has(conceptType);
}
