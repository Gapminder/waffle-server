import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import {constants} from '../../ws.utils/constants';

export {
  loadDatapackage,
  parseEntitiesResource,
  parseDatapointsResource,
  parseConceptsResource,
  isConceptsResource,
  isDatapointsResource,
  isEntitiesResource,
  ParsedConceptResource,
  ParsedEntityResource,
  ParsedDatapointResource,
  ParsedResource
};

function loadDatapackage({folder, file = 'datapackage.json'}, done) {
  return fs.readFile(path.join(folder, file), 'utf-8', (error, data) => {
    if (error) {
      return done(error);
    }

    const datapackage = JSON.parse(data);
    datapackage.resources = parseResources(datapackage.resources);
    return done(null, datapackage);
  });
}

function parseResources(resources) {
  return _.reduce(resources, (parsed, resource: any) => {
    const primaryKey = getPrimaryKey(resource.schema);
    if (isDatapointsResource(primaryKey)) {
      parsed.push(parseDatapointsResource(resource, primaryKey));
    }

    if (isEntitiesResource(primaryKey)) {
      parsed.push(parseEntitiesResource(resource, primaryKey));
    }

    if (isConceptsResource(primaryKey)) {
      parsed.push(parseConceptsResource(resource, primaryKey));
    }

    return parsed;
  }, []);
}

function getPrimaryKey(schema) {
  return Array.isArray(schema.primaryKey) ? schema.primaryKey : [schema.primaryKey];
}

function isConceptsResource(primaryKey) {
  return Array.isArray(primaryKey) && primaryKey.length === 1 && _.head(primaryKey) === 'concept';
}

function isDatapointsResource(primaryKey) {
  return Array.isArray(primaryKey) && primaryKey.length > 1;
}

function isEntitiesResource(primaryKey) {
  return Array.isArray(primaryKey) && primaryKey.length === 1 && _.head(primaryKey) !== 'concept';
}

function parseEntitiesResource(resource, primaryKey = getPrimaryKey(resource.schema)): ParsedEntityResource {
  const {entitySets, fields} = _.reduce(resource.schema.fields, (result, field: any) => {
    result.fields.push(field.name);

    const entitySet = toEntitySet(field.name);
    if (entitySet) {
      result.entitySets.push(entitySet);
    }
    return result;
  }, {entitySets: [], fields: []});

  return {
    type: constants.ENTITIES,
    primaryKey,
    path: resource.path,
    fields,
    concept: _.first(primaryKey),
    entitySets
  } as ParsedEntityResource;
}

function parseDatapointsResource(resource, primaryKey = getPrimaryKey(resource.schema)): ParsedDatapointResource {
  const indicators = _.reduce(resource.schema.fields, (result, field: any) => {
    if (!_.includes(primaryKey, field.name)) {
      result.push(field.name);
    }
    return result;
  }, []);

  return {
    type: constants.DATAPOINTS,
    primaryKey,
    path: resource.path,
    dimensions: primaryKey,
    indicators,
  };
}

function parseConceptsResource(resource, primaryKey = getPrimaryKey(resource.schema)): ParsedConceptResource {
  return {
    type: constants.CONCEPTS,
    primaryKey,
    path: resource.path
  };
}

function toEntitySet(fieldName) {
  if (!_.startsWith(fieldName, 'is--')) {
    return null;
  }
  return _.last(_.split(fieldName, 'is--'));
}

interface ParsedResource {
  type: string;
  primaryKey: string[];
  path: string;
}

interface ParsedConceptResource extends ParsedResource {
}

interface ParsedEntityResource extends ParsedResource {
  fields: string[];
  concept: string;
  entitySets: string[]
}

interface ParsedDatapointResource extends ParsedResource {
  dimensions: string[];
  indicators: string[];
}
