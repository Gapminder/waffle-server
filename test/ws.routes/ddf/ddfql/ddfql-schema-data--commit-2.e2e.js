'use strict';

const cliUtils = require('./../../../cli.utils.js');
const e2eUtils = require('./../../../e2e.utils');
const e2eEnv = require('./../../../e2e.env');

const fs = require('fs');
const expect = require('chai').expect;

const fixtureSchemaConcepts = require('./fixtures/commit-2--schema-concepts');
const fixtureSchemaEntities = require('./fixtures/commit-2--schema-entities');
const fixtureSchemaDatapoints = require('./fixtures/commit-2--schema-datapoints');
const fixtureSchemaDatapointsMinMax = require('./fixtures/commit-2--schema-datapoints--min-max.json');
const fixtureSchemaDatapointsAvg = require('./fixtures/commit-2--schema-datapoints--avg.json');

const fixtureDataConcepts = require('./fixtures/commit-2--data-concepts.json');
const fixtureDataEntities = require('./fixtures/commit-2--data-entities.json');
const fixtureDataEntitiesSpeakingEnglish = require('./fixtures/commit-2--data-entities-speakingenglish.json');
const fixtureDataEntitiesFoundation = require('./fixtures/commit-2--data-entities-foundation.json');
const fixtureDataEntitiesCompanySize = require('./fixtures/commit-2--data-entities-companysize.json');
const fixtureDataConceptsEntitySet = require('./fixtures/commit-2--data-concepts-etityset.json');
const fixtureDataConceptsMeasure = require('./fixtures/commit-2--data-concepts-measure.json');
const fixtureDataConceptsString = require('./fixtures/commit-2--data-concepts-string.json');

const fixtureDatapointsLinesOfCodeByCompanyAnno = require('./fixtures/commit-2--datapoints-linesofcode_by_company_anno.json');
const fixtureDatapointsCompanySizeByCompanyAnno = require('./fixtures/commit-2--datapoints-companysize_by_company_anno.json');
const fixtureDatapointsLinesOfCodeByCompanyProject = require('./fixtures/commit-2--datapoints-linesofcode_by_company_project.json');
const fixtureDatapointsLinesOfCodeByCompanyProjectAnno = require('./fixtures/commit-2--datapoints-linesofcode_by_company_project_anno.json');
const fixtureDatapointsNumUsersByCompanyProject = require('./fixtures/commit-2--datapoints-numusers_by_company_project.json');

const fixtureQueryOperatorsLinesOfCodeByCompanyAnnoWithCondition = require('./fixtures/commit-2--operators-linesofcode_by_company_anno.json');
const fixtureQueryOperatorsCompanySizeByCompanyAnnoWithCondition = require('./fixtures/commit-2--operators-companysize_by_company_anno.json');
const fixtureQueryOperatorsLinesOfCodeByCompanyProjectWithCondition = require('./fixtures/commit-2--operators-linesofcode_by_company_project.json');
const fixtureQueryOperatorsLinesOfCodeByCompanyProjectAnnoWithCondition = require('./fixtures/commit-2--operators-linesofcode_by_company_project_anno.json');
const fixtureQueryOperatorsNumUsersByCompanyProjectWithCondition = require('./fixtures/commit-2--operators-numusers_by_company_project.json');


describe("State Version 1 (2nd commit)", function() {

  before(done => {

    const secondIndexOfCommits = 1;

    cliUtils.getCommitByGithubUrl(e2eEnv.repo, secondIndexOfCommits, (error, commit) => {
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
          "key": ["company_size"],
          "value": ["company_size", "full_name_changed", "is--company_size", "full_name"]
        },
        "from": "entities",
        "where": {
          "$and": [
            {
              "is--company_size": true
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
            "company_size"
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
        "where": {}
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
            "company_size"
          ]
        },
        "from": "datapoints",
        "where": {
          "$and": [
            {"company_size": {"$eq": "small"}},
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
            {"project": {"$ne": "xbox", "$nin": ["office"], "$in": ["vizabi", "ws", "mic"]}}
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
            {"company": {"$nin": ["mic"]}},
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

});
