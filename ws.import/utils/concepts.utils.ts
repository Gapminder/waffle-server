import * as _ from 'lodash';
import { constants } from '../../ws.utils/constants';

const TIME_CONCEPT_TYPES = new Set(constants.TIME_CONCEPT_TYPES);

export {
  getTimeConceptOriginIds,
  getTimeConceptGids,
  getTimeConcepts,
  isTimeConceptType,
  getSortedDimensionConceptGids
};

function getTimeConceptOriginIds(concepts: any): any[] {
  return _.map(getTimeConcepts(concepts), constants.ORIGIN_ID);
}

function getTimeConceptGids(concepts: any): any[] {
  return _.map(getTimeConcepts(concepts), constants.GID);
}

function getTimeConcepts(concepts: any): any[] {
  return _.chain(concepts)
    .filter((concept: any) => isTimeConceptType(_.get(concept, `${constants.PROPERTIES}.${constants.CONCEPT_TYPE}`)))
    .value();
}

function isTimeConceptType(conceptType: any): boolean {
  return TIME_CONCEPT_TYPES.has(conceptType);
}

function getSortedDimensionConceptGids(conceptGids: string[], concepts: any[]): any {
  return _.chain(conceptGids)
    .map((conceptGid: string) => ({domain: _.get(concepts[conceptGid], 'domain.gid', null), gid: conceptGid}))
    .sortBy(['domain', 'gid'])
    .map('gid')
    .value();
}
