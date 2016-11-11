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
  return field.name.replace(/^is--/, '');
}

function getFieldsFromSchema(fields) {
  return _.chain(fields)
    .map(cutReservedPrefix)
    .uniq()
    .value();
}

function getEntitySetsFromSchema({fields, concepts}) {
  return _.reduce(fields, (result, field) => {
    const concept = _.get(concepts, field);
    const conceptType = _.get(concept, 'type');

    if (_.includes(constants.CONCEPT_TYPE_ENTITY_SET, conceptType)) {
      result.push(concept);
    }

    return result;
  }, []);
}

function parseDatapackageSchema(externalContext) {
  const {
    concepts,
    entitiesFile: {
      path: filename,
      schema: {
        fields,
        primaryKey
      }
    }
  } = externalContext;

  logger.info(`** parse schema file '${filename}'`);

  const conceptGid = _.first(primaryKey);
  const concept = _.get(concepts, conceptGid);
  const domain = _.get(concept, 'domain', concept);
  const context = {
    fields: getFieldsFromSchema(fields),
    concepts
  };
  const sets = getEntitySetsFromSchema(context);

  if (_.isEmpty(domain)) {
    return null;
  }

  logger.info(`** parsed domain: ${domain.gid}\n** parsed sets: ${_.map(sets, constants.GID)}`);

  return {domainOriginId: domain[constants.ORIGIN_ID], setOriginIds: _.map(sets, constants.ORIGIN_ID)};
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
