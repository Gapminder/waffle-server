'use strict';
const _ = require('lodash');
const async = require('async');

const commonService = require('../../../ws.services/common.service');
const conceptsService = require('../concepts/concepts.service');
const entitiesRepositoryFactory = require('../../../ws.repository/ddf/entities/entities.repository');

module.exports = {
  getEntities,
  getConcepts,
  collectEntities
};

function getEntities(pipe, cb) {
  const entitiesRepository = entitiesRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version);

  entitiesRepository
    .findEntityProperties(pipe.domainGid, pipe.headers, pipe.where, (error, entities) => {
      if (error) {
        return cb(error);
      }

      pipe.entities = entities;

      return cb(null, pipe);
    });
}

function getConcepts(pipe, cb) {
  const _pipe = {
    dataset: pipe.dataset,
    version: pipe.version,
    headers: [],
    where: {
      concept: pipe.domainGid
    }
  };

  return conceptsService.getConcepts(_pipe, (err, result) => {
    pipe.concepts = result.concepts;

    return cb(err, pipe);
  });
}

function collectEntities(options, cb) {
  console.time('finish Entities stats');
  const pipe = options;

  async.waterfall([
    async.constant(pipe),
    commonService.findDefaultDatasetAndTransaction,
    getConcepts,
    getEntities
  ],  (error, result) => {
    console.timeEnd('finish Entities stats');

    return cb(error, result);
  });
}
