'use strict';

const ConceptsRepositoryFactory = require('../../../ws.repository/ddf/concepts/concepts.repository');

module.exports = {
  getConcepts
};

function getConcepts(pipe, cb) {
  const ConceptsRepository = new ConceptsRepositoryFactory({
    datasetId: pipe.dataset._id,
    version: pipe.version
  });

  ConceptsRepository
    .currentVersion()
    .findConceptProperties({}, pipe.where, (error, concepts) => {
      if (error) {
        return cb(error);
      }

      pipe.concepts = concepts;

      return cb(null, pipe);
    });
}
