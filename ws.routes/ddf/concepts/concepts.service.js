'use strict';

const conceptsRepositoryFactory = require('../../../ws.repository/ddf/concepts/concepts.repository');

module.exports = {
  getConcepts
};

function getConcepts(pipe, cb) {
  const conceptsRepository = conceptsRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version);

  conceptsRepository
    .findConceptProperties(pipe.headers, pipe.where, (error, concepts) => {
      if (error) {
        return cb(error);
      }

      pipe.concepts = concepts;

      return cb(null, pipe);
    });
}
