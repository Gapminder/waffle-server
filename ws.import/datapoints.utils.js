'use strict';

const _ = require('lodash');

const logger = require('../ws.config/log');

module.exports = {
  parseFilename,
  segregateEntities
};

function parseFilename(filename, externalContext) {
  logger.info(`** parse filename '${filename}'`);

  const parseFilename = common.getMeasureDimensionFromFilename(filename);
  const measureGids = parseFilename.measures;
  const dimensionGids = parseFilename.dimensions;

  const measures = _.merge(_.pick(externalContext.previousConcepts, measureGids), _.pick(externalContext.concepts, measureGids));
  const dimensions = _.merge(_.pick(externalContext.previousConcepts, dimensionGids), _.pick(externalContext.concepts, dimensionGids));

  if (_.isEmpty(measures)) {
    throw Error(`file '${filename}' doesn't have any measure.`);
  }

  if (_.isEmpty(dimensions)) {
    throw Error(`file '${filename}' doesn't have any dimensions.`);
  }

  logger.info(`** parsed measures: ${_.keys(measures)}`);
  logger.info(`** parsed dimensions: ${_.keys(dimensions)}`);

  return {measures, dimensions};
}

function segregateEntities(entities) {
  //FIXME: Segregation is a workaround for issue related to having same gid in couple entity files
  return _.reduce(entities, (result, entity) => {
    if (_.isEmpty(entity.sets)) {
      const domain = entity.domain;
      result.byDomain[`${entity.gid}-${_.get(domain, 'originId', domain)}`] = entity;
    } else {
      const set = _.head(entity.sets);
      result.bySet[`${entity.gid}-${_.get(set, 'originId', set)}`] = entity;
    }

    result.byGid[entity.gid] = entity;
    return result;
  }, {bySet: {}, byDomain: {}, byGid: {}});
}
