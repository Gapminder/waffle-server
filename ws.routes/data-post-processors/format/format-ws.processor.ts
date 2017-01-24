import * as _ from 'lodash';
import {constants} from '../../../ws.utils/constants';
import * as ddfQueryUtils from '../../../ws.ddfql/ddf-query-utils';
import * as commonService from '../../../ws.services/common.service';
import * as ddfImportUtils from '../../../ws.import/utils/import-ddf.utils';

const DATAPOINT_KEY_SEPARATOR = ':';

export {
  mapConceptToWsJson as mapConcepts,
  mapEntitiesToWsJson as mapEntities,
  mapDatapointsToWsJson as mapDatapoints,
  mapSchemaToWsJson as mapSchema
};

function mapSchemaToWsJson(data) {
  const rows = _.map(data.schema, schemaDoc => _.reduce(data.headers, (schemaRow, header: string) => {
    schemaRow.push(schemaDoc[header]);
    return schemaRow;
  }, []));

  const headers = _.map(data.headers, (header: string) => data.aliases[header] ? data.aliases[header] : header);
  return { dataset: data.datasetName, version: data.datasetVersionCommit, headers, rows: sortRows(rows, data.query, headers)};
}

function mapConceptToWsJson(data) {
  const uniqConceptProperties = _.chain(data.concepts)
    .flatMap(concept => _.keys(concept.properties))
    .uniq()
    .value();

  const select = _.isEmpty(data.headers) ? uniqConceptProperties : data.headers;

  const rows = _.map(data.concepts, concept => {
    return _mapConceptPropertiesToWsJson(select, concept, data.language);
  });

  const result = {
    dataset: data.datasetName,
    version: data.datasetVersionCommit,
    headers: select,
    rows: sortRows(rows, data.query, data.headers)
  };

  if (data.language) {
    return _.extend(result, {language: data.language});
  }

  return result;
}

function _mapConceptPropertiesToWsJson(select, concept, language) {
  const translatedConceptProperties = commonService.translateDocument(concept, language);
  return _.map(select, (property: string) => {
    return translatedConceptProperties[property];
  });
}

function mapEntitiesToWsJson(data) {
  const uniqEntityProperties = _.chain(data.entities)
    .flatMap(entity => _.keys(entity.properties))
    .uniq()
    .value();

  const select = _.isEmpty(data.headers) ? uniqEntityProperties : data.headers;

  const rows = _.map(data.entities, (entity) => {
    return _mapEntitiesPropertiesToWsJson(data.domainGid, select, entity, data.language);
  });

  const result = {
    dataset: data.datasetName,
    version: data.datasetVersionCommit,
    headers: select,
    rows: sortRows(rows, data.query, data.headers)
  };

  if (data.language) {
    return _.extend(result, {language: data.language});
  }

  return result;
}

function _mapEntitiesPropertiesToWsJson(entityDomainGid, select, entity, language) {
  const translatedEntityProperties = commonService.translateDocument(entity, language);
  const entityWithGidNamedAfterDomain = __mapGidToEntityDomainGid(entityDomainGid, entity);
  const flattenedEntity = _.extend(entityWithGidNamedAfterDomain, translatedEntityProperties);

  return _.map(select, (property: string) => {
    return flattenedEntity[property];
  });
}

function __mapGidToEntityDomainGid(entityDomainGid, object) {
  return _.mapKeys(object, (value, property) => {
    if (property === constants.GID) {
      return entityDomainGid;
    }

    return property;
  });
}

function mapDatapointsToWsJson(data) {
  const selectedConceptsByOriginId = _.chain(data.concepts)
    .keyBy(constants.GID)
    .pick(data.headers)
    .mapKeys(constants.ORIGIN_ID)
    .value();

  const selectedConceptsOriginIds = _.keys(selectedConceptsByOriginId);

  const conceptsByOriginId = _.keyBy(data.concepts, constants.ORIGIN_ID);
  const entitiesByOriginId = _.keyBy(data.entities, constants.ORIGIN_ID);

  const rows = _.chain(data.datapoints)
    .reduce((result, datapoint: any) => {
      const partialRow = {};
      const datapointKeyParts = [];
      const translatedDatapointProperties = commonService.translateDocument(datapoint, data.language);

      _.each(datapoint.dimensions, (dimension) => {
        const originEntity = entitiesByOriginId[dimension];
        const domainGid = _getGidOfSelectedConceptByEntity(selectedConceptsByOriginId, selectedConceptsOriginIds, originEntity);

        partialRow[domainGid] = originEntity[constants.GID];
        datapointKeyParts.push(originEntity[constants.GID]);
      });

      const datapointKey = datapointKeyParts.join(DATAPOINT_KEY_SEPARATOR);
      const measureGid = conceptsByOriginId[datapoint.measure][constants.GID];
      const datapointValue = _.get(translatedDatapointProperties, measureGid);
      partialRow[measureGid] = ddfImportUtils.toNumeric(datapointValue) || ddfImportUtils.toBoolean(datapointValue) || datapointValue;

      if (_.isNil(result[datapointKey])) {
        result[datapointKey] = {};
      }
      result[datapointKey] = _.extend(result[datapointKey], partialRow);
      return result;
    }, {})
    .map(row => {
      return _.map(data.headers, (column: string) => coerceValue(row[column]))
    })
    .value();

  const result = {
    dataset: data.datasetName,
    version: data.datasetVersionCommit,
    headers: data.headers,
    rows: sortRows(rows, data.query, data.headers)
  };

  if (data.language) {
    return _.extend(result, {language: data.language});
  }

  return result;
}

function _getGidOfSelectedConceptByEntity(selectedConceptsByOriginId, selectedConceptsOriginIds, entity): string {
  const conceptOriginIds = _.map(_.concat(entity.domain, entity.sets), _.toString);
  const originIdOfSelectedConcept = _.find(selectedConceptsOriginIds, originId => _.includes(conceptOriginIds, originId)) as string;
  return _.get(selectedConceptsByOriginId[originIdOfSelectedConcept], constants.GID) as string;
}

function coerceValue(value) {
  return _.isNil(value) ? null : value;
}

function sortRows(rows, query, headers) {
  const ordering = ddfQueryUtils.convertOrderByForWsJson(_.get(query, 'order_by', []), headers);
  return _.isEmpty(ordering.columnsToSort) ? rows : _.orderBy(rows, ordering.columnsToSort, ordering.columnsSortDirections);
}
