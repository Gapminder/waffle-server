import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import { constants } from '../../ws.utils/constants';
import ErrnoException = NodeJS.ErrnoException;

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
  ParsedResource,
  DdfSchemaItem,
  SchemaField,
  ResourceSchema,
  Datapackage,
  DatapackageLanguage,
  DdfSchema,
  DatapackageResource
};

function loadDatapackage({folder, file = 'datapackage.json'}: any, done: Function): void {
  return fs.readFile(path.join(folder, file), 'utf-8', (error: ErrnoException, data: any) => {
    if (error) {
      return done(error);
    }

    const datapackage = JSON.parse(data);
    datapackage.resources = parseResources(datapackage.resources);
    return done(null, datapackage);
  });
}

function parseResources(resources: DatapackageResource[]): ParsedResource[] {
  return _.reduce(resources, (parsed: ParsedResource[], resource: DatapackageResource) => {
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

function getPrimaryKey(schema: ResourceSchema): string[] {
  return Array.isArray(schema.primaryKey) ? schema.primaryKey : [schema.primaryKey];
}

function isConceptsResource(primaryKey: string | string[]): boolean {
  return Array.isArray(primaryKey) && primaryKey.length === 1 && _.head(primaryKey) === 'concept';
}

function isDatapointsResource(primaryKey: string | string[]): boolean {
  return Array.isArray(primaryKey) && primaryKey.length > 1;
}

function isEntitiesResource(primaryKey: string | string[]): boolean {
  return Array.isArray(primaryKey) && primaryKey.length === 1 && _.head(primaryKey) !== 'concept';
}

function parseEntitiesResource(resource: DatapackageResource, primaryKey: string[] = getPrimaryKey(resource.schema)): ParsedEntityResource {
  const {entitySets, fields} = _.reduce(resource.schema.fields, (result: any, field: SchemaField) => {
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

function parseDatapointsResource(resource: DatapackageResource, primaryKey: string[] = getPrimaryKey(resource.schema)): ParsedDatapointResource {
  const indicators = _.reduce(resource.schema.fields, (result: any, field: SchemaField) => {
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
    indicators
  };
}

function parseConceptsResource(resource: DatapackageResource, primaryKey: string[] = getPrimaryKey(resource.schema)): ParsedConceptResource {
  return {
    type: constants.CONCEPTS,
    primaryKey,
    path: resource.path
  };
}

function toEntitySet(fieldName: string): string {
  if (!_.startsWith(fieldName, 'is--')) {
    return null;
  }
  return _.last(_.split(fieldName, 'is--'));
}

type ParsedResource = ParsedConceptResource | ParsedDatapointResource | ParsedEntityResource;

interface ParsedConceptResource {
  type: string;
  primaryKey: string[];
  path: string;
}

interface ParsedEntityResource {
  type: string;
  primaryKey: string[];
  path: string;
  fields: string[];
  concept: string;
  entitySets: string[];
}

interface ParsedDatapointResource {
  type: string;
  primaryKey: string[];
  path: string;
  dimensions: string[];
  indicators: string[];
}

interface SchemaField {
  name: string;
}

interface ResourceSchema {
  fields: SchemaField[];
  primaryKey: string | string[];
}

interface DatapackageResource {
  path: string;
  name?: string;
  schema: ResourceSchema;
}

interface DdfSchemaItem {
  primaryKey: string[];
  value: string;
  resources: string[];
}

interface DdfSchema {
  entities: DdfSchemaItem[];
  concepts: DdfSchemaItem[];
  datapoints: DdfSchemaItem[];
}

interface DatapackageLanguage {
  id: string;
  name: string;
}

interface Datapackage {
  name: string;
  title?: string;
  description?: string;
  author?: string;
  license?: string;
  language?: DatapackageLanguage;
  translations?: DatapackageLanguage[];
  resources: (ParsedConceptResource | ParsedDatapointResource | ParsedEntityResource)[];
  ddfSchema: DdfSchema;
}
