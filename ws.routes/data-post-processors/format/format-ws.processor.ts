import * as hi from 'highland';
import * as _ from 'lodash';
import * as ddfQueryUtils from '../../../ws.ddfql/ddf-query-utils';
import * as ddfImportUtils from '../../../ws.import/utils/import-ddf.utils';
import * as commonService from '../../../ws.services/common.service';
import { constants } from '../../../ws.utils/constants';
import {formatTime} from 'ddf-time-utils';

export {
  mapConceptToWsJson as mapConcepts,
  mapEntitiesToWsJson as mapEntities,
  mapDatapointsToWsJson as mapDatapoints,
  mapSchemaToWsJson as mapSchema
};

function mapSchemaToWsJson(data: any): any {
  const rows = _.map(data.schema, (schemaDoc: any) => _.reduce(data.headers, (schemaRow: any, header: string) => {
    schemaRow.push(schemaDoc[header]);
    return schemaRow;
  }, []));

  const headers = _.map(data.headers, (header: string) => data.aliases[header] ? data.aliases[header] : header);
  return {
    dataset: data.datasetName,
    version: data.datasetVersionCommit,
    headers,
    rows: sortRows(rows, data.query, headers)
  };
}

function mapConceptToWsJson(data: any): any {
  const uniqConceptProperties = _.chain(data.concepts)
    .flatMap((concept: any) => _.keys(concept.properties))
    .uniq()
    .value();

  const select = _.isEmpty(data.headers) ? uniqConceptProperties : data.headers;

  const rows = _.map(data.concepts, (concept: any) => {
    return _mapConceptPropertiesToWsJson(select, concept, data.language);
  });

  const result = {
    dataset: data.datasetName,
    version: data.datasetVersionCommit,
    headers: select,
    rows: sortRows(rows, data.query, data.headers)
  };

  if (data.language) {
    return _.extend(result, { language: data.language });
  }

  return result;
}

function _mapConceptPropertiesToWsJson(select: any, concept: any, language: string): any {
  const translatedConceptProperties = commonService.translateDocument(concept, language);
  return _.map(select, (property: string) => {
    return translatedConceptProperties[property];
  });
}

function mapEntitiesToWsJson(data: any): any {
  const uniqEntityProperties = _.chain(data.entities)
    .flatMap((entity: any) => _.keys(entity.properties))
    .uniq()
    .value();

  const select = _.isEmpty(data.headers) ? uniqEntityProperties : data.headers;

  const rows = _.map(data.entities, (entity: any) => {
    return _mapEntitiesPropertiesToWsJson(data.domainGid, select, entity, data.language);
  });

  const result = {
    dataset: data.datasetName,
    version: data.datasetVersionCommit,
    headers: select,
    rows: sortRows(rows, data.query, data.headers)
  };

  if (data.language) {
    return _.extend(result, { language: data.language });
  }

  return result;
}

function _mapEntitiesPropertiesToWsJson(entityDomainGid: any, select: any, entity: any, language: string): any {
  const flattenedEntity = _.extend({ [entityDomainGid]: entity.gid }, commonService.translateDocument(entity, language));

  return _.map(select, (property: string) => {
    return flattenedEntity[property];
  });
}

function mapDatapointsToWsJson(data: any): any {
  const selectedConceptsByOriginId = _.chain(data.concepts)
    .keyBy(constants.GID)
    .pick(data.headers)
    .mapKeys(constants.ORIGIN_ID)
    .value();

  const selectedConceptsOriginIds = _.keys(selectedConceptsByOriginId);

  const conceptsByOriginId = _.keyBy(data.concepts, constants.ORIGIN_ID);
  const entitiesByOriginId = _.keyBy(data.entities, constants.ORIGIN_ID);
  const timeConcepts = _.get(data, 'timeConcepts', {});

  const result = {
    dataset: data.datasetName,
    version: data.datasetVersionCommit,
    headers: data.headers,
    rows: []
  };

  if (data.language) {
    _.extend(result, { language: data.language });
  }

  let positionTimeConceptInHeader;
  const headerConceptsDictionary = _.reduce(data.headers, (dictionary: any, header: any, index: any) => {
    if (timeConcepts.hasOwnProperty(header)) {
      positionTimeConceptInHeader = index;
    }
    dictionary.set(header, index);
    return dictionary;
  }, new Map());

  return hi(data.datapoints)
    .map((datapoint: any) => {
      const context = {
        entitiesByOriginId,
        selectedConceptsByOriginId,
        selectedConceptsOriginIds,
        headerConceptsDictionary,
        headers: data.headers,
        positionTimeConceptInHeader
      };

      const newRow = createNewDatapointsRow(datapoint._id, context);

      _.each(datapoint.indicators, (indicator: any) => {
        const measureGid = conceptsByOriginId[indicator.measure][constants.GID];
        const measureIndex = headerConceptsDictionary.get(measureGid);
        const translatedDatapointProperties = commonService.translateDocument(indicator, data.language);
        const datapointValue = _.get(translatedDatapointProperties, measureGid);

        newRow[measureIndex] = coerceValue(datapointValue);
      });

      return newRow;
    })
    .collect()
    .map((unsortedRows: any[]) => {
      return _.extend(result, { rows: sortRows(unsortedRows, data.query, data.headers) });
    });
}

function createNewDatapointsRow(datapoint: any, externalContext: any): any {
  const {
    entitiesByOriginId,
    selectedConceptsByOriginId,
    selectedConceptsOriginIds,
    headerConceptsDictionary,
    headers,
    positionTimeConceptInHeader
  } = externalContext;
  const rowTemplate = _.times(headers.length, () => null);

  if (!_.isNil(positionTimeConceptInHeader)) {
    rowTemplate[positionTimeConceptInHeader] = formatTime(_.get(datapoint, 'time'));
  }

  return _.reduce(datapoint.dimensions, (row: any, dimension: any) => {
    const originEntity = entitiesByOriginId[dimension];
    const domainGid = _getGidOfSelectedConceptByEntity(selectedConceptsByOriginId, selectedConceptsOriginIds, originEntity);
    const domainIndex = headerConceptsDictionary.get(domainGid);

    row[domainIndex] = originEntity[constants.GID];

    return row;
  }, rowTemplate);
}

function _getGidOfSelectedConceptByEntity(selectedConceptsByOriginId: any, selectedConceptsOriginIds: any, entity: any): string {
  const conceptOriginIds = _.map(_.concat(entity.domain, entity.sets), _.toString);
  const originIdOfSelectedConcept = _.find(selectedConceptsOriginIds, (originId: any) => _.includes(conceptOriginIds, originId)) as string;
  return _.get(selectedConceptsByOriginId[originIdOfSelectedConcept], constants.GID) as string;
}

function coerceValue(datapointValue: any): any {
  const value = ddfImportUtils.toNumeric(datapointValue) || ddfImportUtils.toBoolean(datapointValue) || datapointValue;
  return _.isNil(value) ? null : value;
}

function sortRows(rows: any, query: any, headers: any): any {
  const ordering = ddfQueryUtils.convertOrderByForWsJson(_.get(query, 'order_by', []), headers);
  return _.isEmpty(ordering.columnsToSort) ? rows : _.orderBy(rows, ordering.columnsToSort, ordering.columnsSortDirections);
}
