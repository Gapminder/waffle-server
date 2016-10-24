'use strict';

const _ = require('lodash');
const logger = require('../ws.config/log');

module.exports = {
  parseFilename,
  getDomainAndSetsFromFilename
};

function parseFilename(filename, externalContext) {
  logger.info(`** parse filename '${filename}'`);

  const parsedFilename = getDomainAndSetsFromFilename(filename);
  const domainGids = [parsedFilename.domain];
  const setGids = parsedFilename.sets;
  const domains = _.pick(externalContext.concepts, domainGids);
  const sets = _.pick(externalContext.concepts, setGids);

  if (_.isEmpty(domains)) {
    throw Error(`file '${filename}' doesn't have any domain.`);
  }

  logger.info(`** parsed domain: ${_.keys(domains)}`);
  logger.info(`** parsed set: ${_.keys(sets)}`);

  return {domains, sets};
}

function getDomainAndSetsFromFilename(filename) {
  const parsedFileName = filename.replace(/^ddf--(\w*)--|\.csv$/g, '')
  const parsedEntries = parsedFileName.split('--');
  const domain = _.first(parsedEntries);
  const sets = _.tail(parsedEntries);

  return {
    domain,
    sets
  };
}
