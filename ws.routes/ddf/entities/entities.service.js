'use strict';

const entitiesRepositoryFactory = require('../../../ws.repository/ddf/entities/entities.repository');

module.exports = {
  getEntities
};

function getEntities(pipe, cb) {
  const entitiesRepository = entitiesRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version);

  entitiesRepository
    .findEntityProperties(pipe.domainGid, {}, pipe.where, (error, entities) => {
      if (error) {
        return cb(error);
      }

      pipe.entities = entities;

      return cb(null, pipe);
    });
}
