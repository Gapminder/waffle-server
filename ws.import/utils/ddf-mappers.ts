import * as _ from 'lodash';
import {constants} from '../../ws.utils/constants';
import * as ddfImportUtils from './import-ddf.utils';
import * as conceptsUtils from './concepts.utils';

const JSON_COLUMNS = ['color', 'scales', 'drill_up'];

export {
  mapDdfEntityToWsModel,
  mapDdfConceptsToWsModel,
  mapDdfEntityFoundInDatapointToWsModel,
  mapDdfDataPointToWsModel,
  transformEntityProperties,
  transformConceptProperties
};

function mapDdfEntityToWsModel(entry, context) {
    const transformedEntry = transformEntityProperties(entry, context.concepts);
    const gid = transformedEntry[context.entitySet.gid];

    const domainOriginId = _.get(context, 'entityDomain.originId', context.entityDomain);

    const newSource = context.filename ? [context.filename] : [];
    const combinedSources = _.union(context.sources, newSource);

    return {
      gid: gid,
      sources: combinedSources,
      properties: transformedEntry,
      parsedProperties: ddfImportUtils.parseProperties(context.entityDomain, gid, transformedEntry, context.timeConcepts),

      originId: _.get(context, 'originId', null),
      languages: transformTranslations(context.languages, translation => transformEntityProperties(translation, context.concepts)),

      domain: domainOriginId,
      sets: context.entitySetsOriginIds,

      from: context.version,
      dataset: context.datasetId
    };
}

function mapDdfDataPointToWsModel(entry, context) {
    const dimensions = _.chain(entry)
      .pick(_.keys(context.dimensions))
      .reduce((result, entityGid: string, conceptGid) => {
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
      .map((datapointValue, measureGid) => {
        const datapointValueAsNumber = ddfImportUtils.toNumeric(datapointValue);
        return {
          value: _.isNil(datapointValueAsNumber) ? datapointValue : datapointValueAsNumber,
          measure: context.measures[measureGid].originId,
          dimensions: dimensions,
          dimensionsConcepts: context.dimensionsConcepts,

          properties: entry,
          originId: entry.originId,
          languages: _.get(context, 'languages', {}),

          isNumeric: !_.isNil(datapointValueAsNumber),
          from: context.version,
          dataset: context.datasetId,
          sources: [context.filename]
        };
      })
      .value();
}

function mapDdfEntityFoundInDatapointToWsModel(datapoint, context) {
  const gid = datapoint[context.concept.gid];
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

function mapDdfConceptsToWsModel(entry, context: any) {
  const transformedEntry = transformConceptProperties(entry);

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

function transformTranslations(translationsByLang, transform) {
  return _.reduce(translationsByLang, (result, translation, lang) => {
    result[lang] = transform(translation);
    return result;
  }, {});
}

function transformEntityProperties(object, concepts) {
  return _.transform(object, (result, value, key) => {
    const ddfBool = ddfImportUtils.toBoolean(value);
    if (!_.isNil(ddfBool)) {
      result[key] = ddfBool;
      return;
    }

    const concept = concepts[key];
    if (concept && concept.type === 'measure') {
      const ddfNumeric = ddfImportUtils.toNumeric(value);
      if (!_.isNil(ddfNumeric)) {
        result[key] = ddfNumeric;
        return;
      }
    }

    result[key] = String(value);
  }, {});
}

function transformConceptProperties(object): any {
  return _.transform(object, (result, value, key) => {
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

function isJsonColumn(column) {
  return _.includes(JSON_COLUMNS, column);
}
