'use strict';

const EntitiesRepositoryFactory = require('../../../ws.repository/ddf/entities/entities.repository');

module.exports = {
  getEntities
};

function getEntities(pipe, cb) {
  const EntitiesRepository = new EntitiesRepositoryFactory({
    datasetId: pipe.dataset._id,
    version: pipe.version
  });

  EntitiesRepository
    .currentVersion()
    .findEntityProperties(pipe.domainGid, {}, pipe.where, (error, entities) => {
      if (error) {
        return cb(error);
      }

      pipe.entities = entities;

      return cb(null, pipe);
    });
}
