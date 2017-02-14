import * as _ from 'lodash';
import {constants} from '../../ws.utils/constants';

const TIME_CONCEPT_TYPES = new Set(constants.TIME_CONCEPT_TYPES);

export {
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
