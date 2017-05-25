import * as cliUtils from '../../../cli.utils';
import * as e2eUtils from '../../../e2e.utils';
import {e2eEnv} from '../../../e2e.env';

import * as fixtureDatapointTranslationsPopularityAndMeetingTypeAndMethodology from './fixtures/commit-8--translations-datapoints-meeting_style-popular_appeal-methodology.json';
import * as fixtureDatapointTranslationsWithoutDimensionAnno from './fixtures/commit-8--translations-datapoints-meeting_style-popular_appeal-methodology-without-dimension-anno.json';

const INDEX_OF_EIGHTH_COMMIT = 7;
const COMMIT_INDEX_TO_IMPORT = process.env.COMMIT_INDEX_TO_IMPORT || 0;

describe("State Version 8 (8th commit)", function() {
  if (COMMIT_INDEX_TO_IMPORT) {
    return;
  }

  before(done => {
    cliUtils.getCommitByGithubUrl(e2eEnv.repo, INDEX_OF_EIGHTH_COMMIT, (error, commit) => {
      if (error) return done(error);

      cliUtils.setDefaultCommit(commit, done);
    });
  });

  describe('Translations', () => {

    it('should return all datapoints of popular_appeal & meeting_style & methodology indicators for language `nl-nl`', done => {
      const ddfql = {
        "language": "nl-nl",
        "select": {
          "key": ["anno", "project", "company"],
          "value": ["popular_appeal", "meeting_style", "methodology"]
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
          "value": ["popular_appeal", "meeting_style", "methodology"]
        },
        "from": "datapoints",
        "where": {}
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointTranslationsWithoutDimensionAnno, done);
    });

  });

});
