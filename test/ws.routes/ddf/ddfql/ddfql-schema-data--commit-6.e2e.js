'use strict';

const cliUtils = require('../../../cli.utils');
const e2eUtils = require('../../../e2e.utils');
const e2eEnv = require('../../../e2e.env');

const fs = require('fs');

const fixtureDatapointTranslationsPopularityAndMeetingTypeAndMethodology = require('./fixtures/commit-6--translations-datapoints-meeting_type-popularity-methodology.json');

const INDEX_OF_SIXTH_COMMIT = 5;

describe("State Version 5 (6th commit)", function() {

  before(done => {
    cliUtils.getCommitByGithubUrl(e2eEnv.repo, INDEX_OF_SIXTH_COMMIT, (error, commit) => {
      if (error) return done(error);

      cliUtils.setDefaultCommit(commit, done);
    });
  });

  describe('Translations', () => {

    it('should return all datapoints of popularity & meeting_type & methodology indicators for language `nl-nl`', done => {
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

  });

});
