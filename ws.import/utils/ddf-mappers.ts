import * as _ from 'lodash';
import {constants} from '../../ws.utils/constants';
import * as ddfImportUtils from './import-ddf.utils';
import * as conceptsUtils from './concepts.utils';
import { logger } from '../../ws.config/log';
import * as ddfQueryUtils from '../../ws.ddfql/ddf-query-utils';
const JSON_COLUMNS = ['color', 'scales', 'drill_up'];

export {
  mapDdfEntityToWsModel,
  mapDdfConceptsToWsModel,
  mapDdfEntityFoundInDatapointToWsModel,
  mapDdfDataPointToWsModel,
  transformEntityProperties,
  transformConceptProperties
};

function mapDdfEntityToWsModel(entry: any, context: any): any {
    const transformedEntry = transformEntityProperties(entry, context.concepts);
    const gid = _.get(transformedEntry, context.entitySet.gid, null);

    if (!gid) {
      logger.error(transformedEntry, context.entitySet.gid, 'Gid was not found!!!');
    }

    const domainOriginId = _.get(context, 'entityDomain.originId', context.entityDomain);

    const newSource = context.filename ? [context.filename] : [];
    const combinedSources = _.union(context.sources, newSource);

    return {
      gid,
      sources: combinedSources,
      properties: transformedEntry,
      parsedProperties: ddfImportUtils.parseProperties(context.entityDomain, gid, transformedEntry, context.timeConcepts),

      originId: _.get(context, 'originId', null),
      languages: transformTranslations(context.languages, (translation: any) => transformEntityProperties(translation, context.concepts)),

      domain: domainOriginId,
      sets: context.entitySetsOriginIds,

      from: context.version,
      dataset: context.datasetId
    };
}

function mapDdfDataPointToWsModel(entry: any, context: any): any {
    const dimensions = _.chain(entry)
      .pick(_.keys(context.dimensions))
      .reduce((result: any, entityGid: string, conceptGid: any) => {
        const key = `${entityGid}-${context.concepts[conceptGid].originId}`;
        const entity =
          context.entities.byDomain[key]
          || context.entities.bySet[key]
          || context.entities.byGid[entityGid]
          || context.entities.foundInDatapointsByGid[entityGid];

        result.push(entity.originId);
        return result;
      }, [])
      .value();

    return _.chain(entry)
      .pick(_.keys(context.measures))
      .map((datapointValue: any, measureGid: any) => {
        const datapointValueAsNumber = ddfImportUtils.toNumeric(datapointValue);
        return {
          value: _.isNil(datapointValueAsNumber) ? datapointValue : datapointValueAsNumber,
          measure: context.measures[measureGid].originId,
          dimensions,
          dimensionsConcepts: context.dimensionsConcepts,

          properties: entry,
          originId: entry.originId,
          languages: _.get(context, 'languages', {}),

          isNumeric: !_.isNil(datapointValueAsNumber),
          from: context.version,
          to: constants.MAX_VERSION,
          dataset: context.datasetId,
          sources: [context.filename]
        };
      })
      .value();
}

function mapDdfEntityFoundInDatapointToWsModel(datapoint: any, context: any): any {
  const gid = _.get(datapoint, context.concept.gid, null);

  if (!gid) {
    logger.error(datapoint, context.concept.gid, 'Gid was not found!!!');
  }

  return {
    gid: String(gid),
    sources: [context.filename],
    properties: datapoint,
    parsedProperties: ddfImportUtils.parseProperties(context.concept, gid, datapoint, context.timeConcepts),

    domain: context.domain.originId,
    sets: context.concept.type === 'entity_set' ? [context.concept.originId] : [],
    drillups: [],

    from: context.version,
    dataset: context.datasetId
  };
}

function mapDdfConceptsToWsModel(entry: any, context: any): void {
  const transformedEntry = transformConceptProperties(entry);

  if (!transformedEntry.concept) {
    logger.error(transformedEntry, 'Gid was not found!!!');
  }

  const concept: any = {
    gid: transformedEntry.concept,

    title: transformedEntry.name || transformedEntry.title,
    type: conceptsUtils.isTimeConceptType(transformedEntry.concept_type) ? 'entity_domain' : transformedEntry.concept_type,

    properties: transformedEntry,

    domain: _.get(context, 'domain', null),

    languages: transformTranslations(context.languages, transformConceptProperties),

    subsetOf: [],

    from: context.version,
    to: constants.MAX_VERSION,
    dataset: context.datasetId,
    originId: _.get(context, 'originId', null)
  };

  if (context.filename) {
    concept.sources = [context.filename];
  }

  return concept;
}

function transformTranslations(translationsByLang: any, transform: any): any {
  return _.reduce(translationsByLang, (result: any, translation: any, lang: string) => {
    result[lang] = transform(translation);
    return result;
  }, {});
}

function transformEntityProperties(object: any, concepts: any): any {
  return _.transform(object, (result: any, value: any, key: any) => {
    const conceptGid = ddfQueryUtils.cutPrefixByDashes(key);
    const concept = concepts[conceptGid];
    const conceptType = _.get(concept, 'type', null);

    const isEntitySetWithIsOperator = conceptType === constants.CONCEPT_TYPE_ENTITY_SET && _.startsWith(key, constants.IS_OPERATOR);

    if (conceptType === constants.CONCEPT_TYPE_BOOLEAN || isEntitySetWithIsOperator) {
      const ddfBool = ddfImportUtils.toBoolean(value);
      if (!_.isNil(ddfBool)) {
        result[key] = ddfBool;
        return;
      }
    }

    if (conceptType === constants.CONCEPT_TYPE_MEASURE) {
      const ddfNumeric = ddfImportUtils.toNumeric(value);
      if (!_.isNil(ddfNumeric)) {
        result[key] = ddfNumeric;
        return;
      }
    }

    result[key] = String(value);
  }, {});
}

function transformConceptProperties(object: Object): any {
  return _.transform(object, (result: any, value: any, key: any) => {
    if (_.isNil(value) || value === '') {
      result[key] = null;
    } else if (isJsonColumn(key) && _.isString(value)) {
      result[key] = ddfImportUtils.isJson(value) ? JSON.parse(value) : null;
    } else if (_.isObjectLike(value)) {
      result[key] = value;
    } else {
      result[key] = String(value);
    }
  }, {});
}

function isJsonColumn(column: any): boolean {
  return _.includes(JSON_COLUMNS, column);
}
