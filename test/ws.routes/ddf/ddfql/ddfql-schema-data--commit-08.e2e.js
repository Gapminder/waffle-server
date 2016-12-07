'use strict';

const cliUtils = require('../../../cli.utils');
const e2eUtils = require('../../../e2e.utils');
const e2eEnv = require('../../../e2e.env');

const fs = require('fs');

const fixtureDatapointTranslationsPopularityAndMeetingTypeAndMethodology = require('./fixtures/commit-8--translations-datapoints-meeting_type-popularity-methodology.json');
const fixtureDatapointTranslationsWithoutDimensionAnno = require('./fixtures/commit-8--translations-datapoints-meeting_type-popularity-methodology-without-dimension-anno.json');

const INDEX_OF_EIGHT_COMMIT = 7;
const COMMIT_INDEX_TO_IMPORT = process.env.COMMIT_INDEX_TO_IMPORT || 0;
if (COMMIT_INDEX_TO_IMPORT) {
  return;
}

describe("State Version 8 (8th commit)", function() {

  before(done => {
    cliUtils.getCommitByGithubUrl(e2eEnv.repo, INDEX_OF_EIGHT_COMMIT, (error, commit) => {
      if (error) return done(error);

      cliUtils.setDefaultCommit(commit, done);
    });
  });

  describe('Translations', () => {

    it('should return all datapoints without changes from previous version', done => {
      const ddfql = {
        "language": "nl-nl",
        "select": {
          "key": ["anno", "project", "company"],
          "value": ["popularity", "meeting_type", "methodology"]
        },
        "from": "datapoints",
        "where": {}
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointTranslationsPopularityAndMeetingTypeAndMethodology, done);
    });

    it('should return empty response for query without dimension anno', done => {
      const ddfql = {
        "language": "nl-nl",
        "select": {
          "key": ["project", "company"],
          "value": ["popularity", "meeting_type", "methodology"]
        },
        "from": "datapoints",
        "where": {}
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointTranslationsWithoutDimensionAnno, done);
    });

  });

});
