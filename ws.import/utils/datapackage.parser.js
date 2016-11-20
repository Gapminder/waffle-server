'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');

module.exports = {
  loadDatapackage,
  parseEntitiesResource,
  parseDatapointsResource,
  parseConceptsResource
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
  return _.reduce(resources, (parsed, resource) => {
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
  return primaryKey.length === 1 && _.head(primaryKey) === 'concept';
}

function isDatapointsResource(primaryKey) {
  return primaryKey.length > 1;
}

function isEntitiesResource(primaryKey) {
  return primaryKey.length === 1 && _.head(primaryKey) !== 'concept';
}

function parseEntitiesResource(resource, primaryKey = getPrimaryKey(resource.schema)) {
  const {entitySets, fields} = _.reduce(resource.schema.fields, (result, field) => {
    result.fields.push(field.name);

    const entitySet = toEntitySet(field.name);
    if (entitySet) {
      result.entitySets.push(entitySet);
    }
    return result;
  }, {entitySets: [], fields: []});

  return {
    type: 'entities',
    primaryKey,
    path: resource.path,
    fields,
    concept: _.first(primaryKey),
    entitySets
  };
}

function parseDatapointsResource(resource, primaryKey = getPrimaryKey(resource.schema)) {
  const indicators = _.reduce(resource.schema.fields, (result, field) => {
    if (!_.includes(primaryKey, field.name)) {
      result.push(field.name);
    }
    return result;
  }, []);

  return {
    type: 'datapoints',
    primaryKey,
    path: resource.path,
    dimensions: primaryKey,
    indicators,
  };
}

function parseConceptsResource(resource, primaryKey = getPrimaryKey(resource.schema)) {
  return {
    type: 'concepts',
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
