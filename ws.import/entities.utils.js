'use strict';

const _ = require('lodash');
const logger = require('../ws.config/log');

module.exports = {
  parseFilename,
  getDomainAndSetsFromFilename
};

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
  const parsedFileName = _.replace(filename, /^ddf--(\w*)--|\.csv$/g, '');
  const parsedEntries = _.split(parsedFileName, '--');
  const domain = _.head(parsedEntries);
  const sets = _.tail(parsedEntries);

  return {
    domain,
    sets
  };
}
