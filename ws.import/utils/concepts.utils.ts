import * as _ from 'lodash';
import {constants} from '../../ws.utils/constants';

const TIME_CONCEPT_TYPES = new Set(constants.TIME_CONCEPT_TYPES);

export {
  getTimeConceptGids,
  getTimeConcepts,
  isTimeConceptType,
  getEntitySetConceptGids
};

function getTimeConceptGids(concepts: any): any[] {
  return _.map(getTimeConcepts(concepts), constants.GID);
}

function getEntitySetConceptGids(concepts: any): any[] {
  return _.map(getEntitySetConcepts(concepts), constants.GID);
}

function getTimeConcepts(concepts: any): any[] {
  return _.chain(concepts)
    .filter((concept: any) => isTimeConceptType(_.get(concept, 'properties.concept_type')))
    .value();
}

function getEntitySetConcepts(concepts: any): any[] {
  return _.chain(concepts)
    .filter((concept: any) => _.get(concept, 'properties.concept_type') === constants.CONCEPT_TYPE_ENTITY_SET)
    .value();
}

function isTimeConceptType(conceptType: any): boolean {
  return TIME_CONCEPT_TYPES.has(conceptType);
}
