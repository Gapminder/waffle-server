'use strict';

const cliUtils = require('../../../cli.utils');
const e2eUtils = require('../../../e2e.utils');
const e2eEnv = require('../../../e2e.env');

const fs = require('fs');
const expect = require('chai').expect;

const fixtureSchemaConcepts = require('./fixtures/commit-4--schema-concepts');
const fixtureSchemaEntities = require('./fixtures/commit-4--schema-entities');
const fixtureSchemaDatapoints = require('./fixtures/commit-4--schema-datapoints');
const fixtureSchemaDatapointsMinMax = require('./fixtures/commit-4--schema-datapoints--min-max.json');
const fixtureSchemaDatapointsAvg = require('./fixtures/commit-4--schema-datapoints--avg.json');

const fixtureDataConcepts = require('./fixtures/commit-4--data-concepts.json');
const fixtureDataEntities = require('./fixtures/commit-4--data-entities.json');
const fixtureDataEntitiesSpeakingEnglish = require('./fixtures/commit-4--data-entities-speakingenglish.json');
const fixtureDataEntitiesFoundation = require('./fixtures/commit-4--data-entities-foundation.json');
const fixtureDataEntitiesCompanySize = require('./fixtures/commit-4--data-entities-companysize.json');
const fixtureDataConceptsEntitySet = require('./fixtures/commit-4--data-concepts-etityset.json');
const fixtureDataConceptsMeasure = require('./fixtures/commit-4--data-concepts-measure.json');
const fixtureDataConceptsString = require('./fixtures/commit-4--data-concepts-string.json');

const fixtureDatapointsLinesOfCodeByCompanyAnno = require('./fixtures/commit-4--datapoints-linesofcode_by_company_anno.json');
const fixtureDatapointsCompanySizeByCompanyAnno = require('./fixtures/commit-4--datapoints-companysize_by_company_anno.json');
const fixtureDatapointsLinesOfCodeByCompanyProject = require('./fixtures/commit-4--datapoints-linesofcode_by_company_project.json');
const fixtureDatapointsLinesOfCodeByCompanyProjectAnno = require('./fixtures/commit-4--datapoints-linesofcode_by_company_project_anno.json');
const fixtureDatapointsNumUsersByCompanyProject = require('./fixtures/commit-4--datapoints-numusers_by_company_project.json');

const fixtureQueryOperatorsLinesOfCodeByCompanyAnnoWithCondition = require('./fixtures/commit-4--operators-linesofcode_by_company_anno.json');
const fixtureQueryOperatorsCompanySizeByCompanyAnnoWithCondition = require('./fixtures/commit-4--operators-companysize_by_company_anno.json');
const fixtureQueryOperatorsLinesOfCodeByCompanyProjectWithCondition = require('./fixtures/commit-4--operators-linesofcode_by_company_project.json');
const fixtureQueryOperatorsLinesOfCodeByCompanyProjectAnnoWithCondition = require('./fixtures/commit-4--operators-linesofcode_by_company_project_anno.json');
const fixtureQueryOperatorsNumUsersByCompanyProjectWithCondition = require('./fixtures/commit-4--operators-numusers_by_company_project.json');

const fixtureDatapointTranslationsCompanySize = require('./fixtures/commit-4--translations-datapoints-company_scale.json');
const fixtureEntityTranslationsCompanySize = require('./fixtures/commit-4--translations-entities-company_scale.json');
const fixtureEntityTranslationsRegion = require('./fixtures/commit-4--translations-entities-region.json');
const fixtureEntityTranslationsCompany = require('./fixtures/commit-4--translations-entities-company.json');
const fixtureConceptsTranslations = require('./fixtures/commit-4--translations-concepts.json');

describe("State Version 3 (4th commit)", function() {

  before(done => {

    const INDEX_OF_FOURTH_COMMIT = 3;

    cliUtils.getCommitByGithubUrl(e2eEnv.repo, INDEX_OF_FOURTH_COMMIT, (error, commit) => {
      if (error) return done(error);

      cliUtils.setDefaultCommit(commit, done);
    });
  });

  describe("Schema", function() {

    it('should return correct schema of concepts', done => {
      const ddfql = {
        "select": {
          "key": ["key", "value"]
        },
        "from": "concepts.schema"
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureSchemaConcepts, done);
    });

    it('should return correct schema of entities', done => {
      const ddfql = {
        "select": {
          "key": ["key", "value"]
        },
        "from": "entities.schema"
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureSchemaEntities, done);
    });

    it('should return correct schema of datapoints', done => {
      const ddfql = {
        "select": {
          "key": ["key", "value"]
        },
        "from": "datapoints.schema"
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureSchemaDatapoints, done);
    });

    it('should return correct Min/Max values for datapoints schema', done => {
      const ddfql = {
        "select": {
          "key": ["key", "value"],
          "value": ["min(value)", "max(value)"]
        },
        "from": "datapoints.schema"
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureSchemaDatapointsMinMax, done);
    });

    it('should return correct Avg values for datapoints schema', done => {
      const ddfql = {
        "select": {
          "key": ["key", "value"],
          "value": ["avg(value)"]
        },
        "from": "datapoints.schema"
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureSchemaDatapointsAvg, done);
    });

  });

  describe("Concepts", function() {

    it('should return list of concepts with type entity_set', done => {
      const ddfql = {
        "select": {
          "key": ["concept"],
          "value": ["concept_type"]
        },
        "from": "concepts",
        "where": {
          "$and": [
            {
              "concept_type": {
                "$eq": "entity_set"
              }
            }
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDataConceptsEntitySet, done);
    });

    it('should return list of concepts with type measure', done => {
      const ddfql = {
        "select": {
          "key": ["concept"],
          "value": ["concept_type"]
        },
        "from": "concepts",
        "where": {
          "$and": [
            {
              "concept_type": {
                "$eq": "measure"
              }
            }
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDataConceptsMeasure, done);
    });

    it('should return list of concepts with type string', done => {
      const ddfql = {
        "select": {
          "key": ["concept"],
          "value": ["concept_type"]
        },
        "from": "concepts",
        "where": {
          "$and": [
            {
              "concept_type": {
                "$eq": "string"
              }
            }
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDataConceptsString, done);
    });

  });

  describe("Unconditional Queries", function() {

    it('should return list of all concepts', done => {
      const ddfql = {
        "select": {
          "key": ["concept", "concept_type", "domain", "additional_column"]
        },
        "from": "concepts"
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDataConcepts, done);
    });

    it('should return list of all entities', done => {
      const ddfql = {
        "select": {
          "key": ["company"]
        },
        "from": "entities"
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDataEntities, done);
    });

    it('should return list of entities that are part of english_speaking entityset', done => {
      const ddfql = {
        "select": {
          "key": ["company"],
          "value": ["company", "name", "is--english_speaking", "additional_column"]
        },
        "from": "entities",
        "where": {
          "$and": [
            {
              "is--english_speaking": true
            }
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDataEntitiesSpeakingEnglish, done);
    });

    it('should return list of entities that are part of foundation etitiyset', done => {
      const ddfql = {
        "select": {
          "key": ["company"],
          "value": ["company", "is--foundation"]
        },
        "from": "entities",
        "where": {
          "$and": [
            {
              "is--foundation": true
            }
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDataEntitiesFoundation, done);
    });

    it('should return list of entities that are part of company_size entityset', done => {
      const ddfql = {
        "select": {
          "key": ["company_scale"],
          "value": ["company_scale", "full_name_changed", "is--company_scale", "full_name", "company_size"]
        },
        "from": "entities",
        "where": {
          "$and": [
            {
              "is--company_scale": true
            }
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDataEntitiesCompanySize, done);
    });

  });

  describe("Datapoints", function() {

    it('should return correct list of values for company_size by company and anno', done => {

      const ddfql = {
        "select": {
          "key": ["company", "anno"],
          "value": [
            "company_scale"
          ]
        },
        "from": "datapoints",
        "where": {}
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsCompanySizeByCompanyAnno, done);

    });

    it('should return correct list of values for lines_of_code by company and anno', done => {

      const ddfql = {
        "select": {
          "key": ["company", "anno"],
          "value": [
            "lines_of_code"
          ]
        },
        "from": "datapoints",
        "where": {}
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsLinesOfCodeByCompanyAnno, done);

    });

    it('should return correct list of values for lines_of_code by company and project', done => {

      const ddfql = {
        "select": {
          "key": ["company", "project"],
          "value": ["lines_of_code"]
        },
        "from": "datapoints",
        "where": {}
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsLinesOfCodeByCompanyProject, done);

    });

    it('should return correct list of values for lines_of_code by company, project and anno', done => {

      const ddfql = {
        "select": {
          "key": ["company", "project", "anno"],
          "value": ["lines_of_code"]
        },
        "from": "datapoints",
        "where": {}
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsLinesOfCodeByCompanyProjectAnno, done);

    });

    it('should return correct list of values for num_users by company and project', done => {

      const ddfql = {
        "select": {
          "key": ["company", "project"],
          "value": ["num_users"]
        },
        "from": "datapoints",
        "where": {
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsNumUsersByCompanyProject, done);
    });

  });

  describe("Datapoints by Conditions", function() {

    it('should return filtered list of values for company_size by company and anno according to conditions', done => {

      const ddfql = {
        "select": {
          "key": ["company", "anno"],
          "value": [
            "company_scale"
          ]
        },
        "from": "datapoints",
        "where": {
          "$and": [
            {"company_scale": {"$eq": "small"}},
            {"anno": {"$lt": 2016}}
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureQueryOperatorsCompanySizeByCompanyAnnoWithCondition, done);

    });

    it('should return filtered list of values for lines_of_code by company and anno according to conditions', done => {

      const ddfql = {
        "select": {
          "key": ["company", "anno"],
          "value": [
            "lines_of_code"
          ]
        },
        "from": "datapoints",
        "where": {
          "$and": [
            {"lines_of_code": {"$gt": 50000}},
            {"anno": {"$gt": 2014, "$lt": 2016}}
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureQueryOperatorsLinesOfCodeByCompanyAnnoWithCondition, done);

    });

    it('should return filtered list of values for lines_of_code by company and project according to conditions', done => {

      const ddfql = {
        "select": {
          "key": ["company", "project"],
          "value": ["lines_of_code"]
        },
        "from": "datapoints",
        "where": {
          "$and": [
            {"project": {"$ne": "xbox", "$nin": ["office"], "$in": ["vizabi", "ws", "mcrsft"]}}
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureQueryOperatorsLinesOfCodeByCompanyProjectWithCondition, done);

    });

    it('should return filtered list of values for lines_of_code by company, project and anno according to conditions', done => {

      const ddfql = {
        "select": {
          "key": ["company", "project", "anno"],
          "value": ["lines_of_code"]
        },
        "from": "datapoints",
        "where": {
          "$and": [
            {"project": {"$ne": "ws"}},
            {"company": {"$nin": ["mcrsft"]}},
            {"lines_of_code": {"$gt": 450000}}
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureQueryOperatorsLinesOfCodeByCompanyProjectAnnoWithCondition, done);

    });

    it('should return filtered list of values for num_users by company and project according to conditions', done => {

      const ddfql = {
        "select": {
          "key": ["company", "project"],
          "value": ["num_users"]
        },
        "from": "datapoints",
        "where": {
          "$and": [
            {"company": {"$nin": ["gap"]}},
            {"project": {"$ne": "ws"}},
            {"num_users": {"$gt": 4}}
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureQueryOperatorsNumUsersByCompanyProjectWithCondition, done);
    });

  });

  describe('Translations', () => {

    it('should return list of all concepts for language `nl-nl`', done => {
      const ddfql = {
        "language": "nl-nl",
        "select": {
          "key": ["concept"],
          "value": ["additional_column"]
        },
        "from": "concepts"
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureConceptsTranslations, done);
    });

    it('should return list of all entities of company entity_domain for language `nl-nl` where it\'s possible', done => {
      const ddfql = {
        "language": "nl-nl",
        "select": {
          "key": ["company"],
          "value": ["name", "country", "full_name_changed", "additional_column"]
        },
        "from": "entities"
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureEntityTranslationsCompany, done);
    });

    it('should return list of all entities of region entity_domain for language `nl-nl` where it\'s possible', done => {
      const ddfql = {
        "language": "nl-nl",
        "select": {
          "key": ["region"],
          "value": ["full_name_changed"]
        },
        "from": "entities",
        "where": {}
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureEntityTranslationsRegion, done);
    });

    it('should return list of entities that are part of company_scale entity_set', done => {
      const ddfql = {
        "language": "nl-nl",
        "select": {
          "key": ["company_scale"],
          "value": ["full_name_changed", "is--company_scale"]
        },
        "from": "entities",
        "where": {
          "$and": [
            {
              "is--company_scale": true
            }
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureEntityTranslationsCompanySize, done);
    });

    xit('should return all datapoints of company_scale indicator for language `nl-nl`', done => {
      const ddfql = {
        "language": "nl-nl",
        "select": {
          "key": ["company", "anno"],
          "value": ["company_scale"]
        },
        "from": "datapoints",
        "where": {}
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointTranslationsCompanySize, done);
    });

  });

});
