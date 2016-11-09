'use strict';

const _ = require('lodash');
const logger = require('../ws.config/log');
const constants = require('../ws.utils/constants');

module.exports = {
  parseFilename,
  getDomainAndSetsFromFilename,
  parseDatapackageSchema
};

function cutReservedPrefix(field) {
  return field.name.replace(/^is--\./, '');
}

function getFieldsFromSchema(entitiesFile) {
  return _.chain(entitiesFile)
    .get('schema.fields')
    .map(cutReservedPrefix)
    .compact()
    .value();
}

function getEntitySetsFromSchema(entitiesFile, concepts) {
  const fields = getFieldsFromSchema(entitiesFile);

  return _.chain(concepts)
    .pick(fields)
    .filter(concept => _.includes(constants.CONCEPT_TYPE_ENTITY_SET, concept.type))
    .value();
}

function parseDatapackageSchema(entitiesFile, externalContext) {
  logger.info(`** parse schema file '${entitiesFile.name}'`);
  const primaryKey = _.get(entitiesFile, 'schema.primaryKey.0');
  const concept = _.get(externalContext, `concepts.${primaryKey}`);
  const domain = _.get(concept, 'domain', concept);
  const sets = getEntitySetsFromSchema(entitiesFile, externalContext.concepts);

  if (_.isEmpty(domain)) {
    throw Error(`file '${entitiesFile.name}' doesn't have any domain.`);
  }

  logger.info(`** parsed domain: ${domain.gid}\n** parsed sets: ${_.map(sets, constants.GID)}`);

  return {domain, sets};
}

function parseFilename(filename, externalContext) {
  logger.info(`** parse filename '${filename}'`);

  const {domain: domainGid, sets: setGids} = getDomainAndSetsFromFilename(filename);
  const domains = _.pick(externalContext.concepts, [domainGid]);
  const sets = _.pick(externalContext.concepts, setGids);

  if (_.isEmpty(domains)) {
    throw Error(`file '${filename}' doesn't have any domain.`);
  }

  logger.info(`** parsed domain: ${_.keys(domains)}`, `** parsed set: ${_.keys(sets)}`);

  return {domains, sets};
}

function getDomainAndSetsFromFilename(filename) {
  const parsedFileName = _.replace(filename, /^ddf--(\w*)--/g, '');
  const parsedEntries = _.split(parsedFileName, '--');
  const domain = _.head(parsedEntries);
  const sets = _.tail(parsedEntries);

  return {
    domain,
    sets
  };
}
