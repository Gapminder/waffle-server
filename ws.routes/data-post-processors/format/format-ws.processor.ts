import * as _ from 'lodash';
import * as hi from 'highland';
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
  const flattenedEntity = _.extend({[entityDomainGid]: entity.gid}, commonService.translateDocument(entity, language));

  return _.map(select, (property: string) => {
    return flattenedEntity[property];
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

  const result = {
    dataset: data.datasetName,
    version: data.datasetVersionCommit,
    headers: data.headers,
    rows: []
  };

  if (data.language) {
    _.extend(result, {language: data.language});
  }

  const dimensionsDictionary = new Map();

  const headerConceptsDictionary = _.reduce(data.headers, (dictionary, header, index) => {
    dictionary.set(header, index);
    return dictionary;
  }, new Map());

  return hi(data.datapoints)
    .reduce(result, (result, datapoint: any) => {
      const rows = result.rows;
      const sortedDimensions = _.chain(datapoint.dimensions)
        .sortBy((value) => value.toString())
        .join('.')
        .value();
      if (!dimensionsDictionary.has(sortedDimensions)) {
        dimensionsDictionary.set(sortedDimensions, rows.length);
      }

      const rowIndex = dimensionsDictionary.get(sortedDimensions);
      const translatedDatapointProperties = commonService.translateDocument(datapoint, data.language);

      if (!Array.isArray(rows[rowIndex])) {
        const context = {entitiesByOriginId, selectedConceptsByOriginId, selectedConceptsOriginIds, headerConceptsDictionary, headers: data.headers};
        const newRow = createNewDatapointsRow(datapoint, context);
        rows.push(newRow);
      }

      const measureGid = conceptsByOriginId[datapoint.measure][constants.GID];
      const measureIndex = headerConceptsDictionary.get(measureGid);
      const datapointValue = _.get(translatedDatapointProperties, measureGid);

      rows[rowIndex][measureIndex] = coerceValue(datapointValue);

      return result;
    })
    .map((result) => {
      return _.extend(result, {rows: sortRows(result.rows, data.query, result.headers)});
    });
}

function createNewDatapointsRow(datapoint, externalContext) {
  const {entitiesByOriginId, selectedConceptsByOriginId, selectedConceptsOriginIds, headerConceptsDictionary, headers} = externalContext;
  const rowTemplate = _.times(headers.length, () => null);

  return _.reduce(datapoint.dimensions, (row, dimension: any) => {
    const originEntity = entitiesByOriginId[dimension];
    const domainGid = _getGidOfSelectedConceptByEntity(selectedConceptsByOriginId, selectedConceptsOriginIds, originEntity);
    const domainIndex = headerConceptsDictionary.get(domainGid);
    row[domainIndex] = originEntity[constants.GID];
    return row;
  }, rowTemplate);
}

function _getGidOfSelectedConceptByEntity(selectedConceptsByOriginId, selectedConceptsOriginIds, entity): string {
  const conceptOriginIds = _.map(_.concat(entity.domain, entity.sets), _.toString);
  const originIdOfSelectedConcept = _.find(selectedConceptsOriginIds, originId => _.includes(conceptOriginIds, originId)) as string;
  return _.get(selectedConceptsByOriginId[originIdOfSelectedConcept], constants.GID) as string;
}

function coerceValue(datapointValue) {
  const value = ddfImportUtils.toNumeric(datapointValue) || ddfImportUtils.toBoolean(datapointValue) || datapointValue;
  return _.isNil(value) ? null : value;
}

function sortRows(rows, query, headers) {
  const ordering = ddfQueryUtils.convertOrderByForWsJson(_.get(query, 'order_by', []), headers);
  return _.isEmpty(ordering.columnsToSort) ? rows : _.orderBy(rows, ordering.columnsToSort, ordering.columnsSortDirections);
}
