import * as e2eUtils from '../../e2e.utils';
import { e2eEnv } from '../../e2e.env';
import { config } from '../../../ws.config/config';

import * as fixtureSchemaConcepts from './fixtures/commit-4--schema-concepts.json';
import * as fixtureSchemaEntities from './fixtures/commit-4--schema-entities.json';
import * as fixtureSchemaDatapoints from './fixtures/commit-4--schema-datapoints.json';
import * as fixtureSchemaDatapointsMinMax from './fixtures/commit-4--schema-datapoints--min-max.json';
import * as fixtureSchemaDatapointsAvg from './fixtures/commit-4--schema-datapoints--avg.json';
import * as fixtureDataConcepts from './fixtures/commit-4--data-concepts.json';
import * as fixtureDataEntities from './fixtures/commit-4--data-entities.json';
import * as fixtureDataEntitiesSpeakingEnglish from './fixtures/commit-4--data-entities-speakingenglish.json';
import * as fixtureDataEntitiesFoundation from './fixtures/commit-4--data-entities-foundation.json';
import * as fixtureDataEntitiesCompanySize from './fixtures/commit-4--data-entities-companysize.json';
import * as fixtureDataConceptsEntitySet from './fixtures/commit-4--data-concepts-etityset.json';
import * as fixtureDataConceptsMeasure from './fixtures/commit-4--data-concepts-measure.json';
import * as fixtureDataConceptsString from './fixtures/commit-4--data-concepts-string.json';
import * as fixtureDatapointsLinesOfCodeByCompanyAnno
  from './fixtures/commit-4--datapoints-linesofcode_by_company_anno.json';
import * as fixtureDatapointsCompanySizeByCompanyAnno
  from './fixtures/commit-4--datapoints-companysize_by_company_anno.json';
import * as fixtureDatapointsLinesOfCodeByCompanyProject
  from './fixtures/commit-4--datapoints-linesofcode_by_company_project.json';
import * as fixtureDatapointsLinesOfCodeByCompanyProjectAnno
  from './fixtures/commit-4--datapoints-linesofcode_by_company_project_anno.json';
import * as fixtureQueryOperatorsLinesOfCodeByCompanyAnnoWithCondition
  from './fixtures/commit-4--operators-linesofcode_by_company_anno.json';
import * as fixtureQueryOperatorsCompanySizeByCompanyAnnoWithCondition
  from './fixtures/commit-4--operators-companysize_by_company_anno.json';
import * as fixtureQueryOperatorsLinesOfCodeByCompanyProjectWithCondition
  from './fixtures/commit-4--operators-linesofcode_by_company_project.json';
import * as fixtureQueryOperatorsLinesOfCodeByCompanyProjectAnnoWithCondition
  from './fixtures/commit-4--operators-linesofcode_by_company_project_anno.json';
import * as fixtureDatapointTranslationsCompanySize
  from './fixtures/commit-4--translations-datapoints-company_scale.json';
import * as fixtureEntityTranslationsCompanySize from './fixtures/commit-4--translations-entities-company_scale.json';
import * as fixtureEntityTranslationsRegion from './fixtures/commit-4--translations-entities-region.json';
import * as fixtureEntityTranslationsCompany from './fixtures/commit-4--translations-entities-company.json';
import * as fixtureConceptsTranslations from './fixtures/commit-4--translations-concepts.json';

const INDEX_OF_FOURTH_COMMIT = 3;
const COMMIT_INDEX_TO_IMPORT = process.env.COMMIT_INDEX_TO_IMPORT || 0;

describe('State Version 4 (4th commit)', function () {
  if (COMMIT_INDEX_TO_IMPORT > INDEX_OF_FOURTH_COMMIT) {
    return;
  }

  before(() => {
    config.DEFAULT_DATASETS = e2eEnv.repo;
    config.DEFAULT_DATASETS_VERSION = e2eEnv[ INDEX_OF_FOURTH_COMMIT ];
  });

  describe('Schema', function () {

    it('should return correct schema of concepts', (done) => {
      const ddfql = {
        select: {
          key: [ 'key', 'value' ]
        },
        from: 'concepts.schema'
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureSchemaConcepts, done);
    });

    it('should return correct schema of entities', (done) => {
      const ddfql = {
        select: {
          key: [ 'key', 'value' ]
        },
        from: 'entities.schema'
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureSchemaEntities, done);
    });

    it('should return correct schema of datapoints', (done) => {
      const ddfql = {
        select: {
          key: [ 'key', 'value' ]
        },
        from: 'datapoints.schema'
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureSchemaDatapoints, done);
    });

    it('should return correct Min/Max values for datapoints schema', (done) => {
      const ddfql = {
        select: {
          key: [ 'key', 'value' ],
          value: [ 'min(value)', 'max(value)' ]
        },
        from: 'datapoints.schema'
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureSchemaDatapointsMinMax, done);
    });

    it('should return correct Avg values for datapoints schema', (done) => {
      const ddfql = {
        select: {
          key: [ 'key', 'value' ],
          value: [ 'avg(value)' ]
        },
        from: 'datapoints.schema'
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureSchemaDatapointsAvg, done);
    });

  });

  describe('Concepts', function () {

    it('should return list of concepts with type entity_set', (done) => {
      const ddfql = {
        select: {
          key: [ 'concept' ],
          value: [ 'concept_type' ]
        },
        from: 'concepts',
        where: {
          $and: [
            {
              concept_type: {
                $eq: 'entity_set'
              }
            }
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDataConceptsEntitySet, done);
    });

    it('should return list of concepts with type measure', (done) => {
      const ddfql = {
        select: {
          key: [ 'concept' ],
          value: [ 'concept_type' ]
        },
        from: 'concepts',
        where: {
          $and: [
            {
              concept_type: {
                $eq: 'measure'
              }
            }
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDataConceptsMeasure, done);
    });

    it('should return list of concepts with type string', (done) => {
      const ddfql = {
        select: {
          key: [ 'concept' ],
          value: [ 'concept_type' ]
        },
        from: 'concepts',
        where: {
          $and: [
            {
              concept_type: {
                $eq: 'string'
              }
            }
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDataConceptsString, done);
    });

  });

  describe('Unconditional Queries', function () {

    it('should return list of all concepts', (done) => {
      const ddfql = {
        select: {
          key: [ 'concept', 'concept_type', 'domain', 'additional_column' ]
        },
        from: 'concepts'
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDataConcepts, done);
    });

    it('should return list of all entities', (done) => {
      const ddfql = {
        select: {
          key: [ 'company' ]
        },
        from: 'entities'
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDataEntities, done);
    });

    it('should return list of entities that are part of english_speaking entityset', (done) => {
      const ddfql = {
        select: {
          key: [ 'company' ],
          value: [ 'company', 'name', 'is--english_speaking', 'additional_column' ]
        },
        from: 'entities',
        where: {
          $and: [
            {
              'is--english_speaking': true
            }
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDataEntitiesSpeakingEnglish, done);
    });

    it('should return list of entities that are part of foundation etitiyset', (done) => {
      const ddfql = {
        select: {
          key: [ 'company' ],
          value: [ 'company', 'is--foundation' ]
        },
        from: 'entities',
        where: {
          $and: [
            {
              'is--foundation': true
            }
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDataEntitiesFoundation, done);
    });

    it('should return list of entities that are part of company_size entityset', (done) => {
      const ddfql = {
        select: {
          key: [ 'company_scale' ],
          value: [ 'company_scale', 'full_name_changed', 'is--company_scale', 'full_name', 'company_size' ]
        },
        from: 'entities',
        where: {
          $and: [
            {
              'is--company_scale': true
            }
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDataEntitiesCompanySize, done);
    });

  });

  describe('Datapoints', function () {

    it('should return correct list of values for company_size by company and anno', (done) => {

      const ddfql = {
        select: {
          key: [ 'company', 'anno' ],
          value: [
            'company_scale'
          ]
        },
        from: 'datapoints',
        where: {}
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsCompanySizeByCompanyAnno, done);

    });

    it('should return correct list of values for lines_of_code by company and anno', (done) => {

      const ddfql = {
        select: {
          key: [ 'company', 'anno' ],
          value: [
            'lines_of_code'
          ]
        },
        from: 'datapoints',
        where: {}
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsLinesOfCodeByCompanyAnno, done);

    });

    it('should return correct list of values for lines_of_code by company and project', (done) => {

      const ddfql = {
        select: {
          key: [ 'company', 'project' ],
          value: [ 'lines_of_code' ]
        },
        from: 'datapoints',
        where: {}
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsLinesOfCodeByCompanyProject, done);

    });

    it('should return correct list of values for lines_of_code by company, project and anno', (done) => {

      const ddfql = {
        select: {
          key: [ 'company', 'project', 'anno' ],
          value: [ 'lines_of_code' ]
        },
        from: 'datapoints',
        where: {}
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsLinesOfCodeByCompanyProjectAnno, done);

    });

    it('should return correct list of values for num_users by company and project', (done) => {

      const ddfql = {
        select: {
          key: [ 'company', 'project' ],
          value: [ 'num_users' ]
        },
        from: 'datapoints',
        where: {}
      };

      const expectedError = 'You choose select column(s) \'num_users\' which aren\'t present in choosen dataset';
      e2eUtils.sendDdfqlRequestAndExpectError(ddfql, expectedError, done);
    });

  });

  describe('Datapoints by Conditions', function () {

    it('should return filtered list of values for company_size by company and anno according to conditions', (done) => {

      const ddfql = {
        select: {
          key: [ 'company', 'anno' ],
          value: [
            'company_scale'
          ]
        },
        from: 'datapoints',
        where: {
          $and: [
            { company_scale: { $eq: 'small' } },
            { anno: { $lt: 2016 } }
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureQueryOperatorsCompanySizeByCompanyAnnoWithCondition, done);

    });

    it('should return filtered list of values for lines_of_code by company and anno according to conditions', (done) => {

      const ddfql = {
        select: {
          key: [ 'company', 'anno' ],
          value: [
            'lines_of_code'
          ]
        },
        from: 'datapoints',
        where: {
          $and: [
            { lines_of_code: { $gt: 50000 } },
            { anno: { $gt: 2014, $lt: 2016 } }
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureQueryOperatorsLinesOfCodeByCompanyAnnoWithCondition, done);

    });

    it('should return filtered list of values for lines_of_code by company and project according to conditions', (done) => {

      const ddfql = {
        select: {
          key: [ 'company', 'project' ],
          value: [ 'lines_of_code' ]
        },
        from: 'datapoints',
        where: {
          $and: [
            { project: { $ne: 'xbox', $nin: [ 'office' ], $in: [ 'vizabi', 'ws', 'mcrsft' ] } }
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureQueryOperatorsLinesOfCodeByCompanyProjectWithCondition, done);

    });

    it('should return filtered list of values for lines_of_code by company, project and anno according to conditions', (done) => {

      const ddfql = {
        select: {
          key: [ 'company', 'project', 'anno' ],
          value: [ 'lines_of_code' ]
        },
        from: 'datapoints',
        where: {
          $and: [
            { project: { $ne: 'ws' } },
            { company: { $nin: [ 'mcrsft' ] } },
            { lines_of_code: { $gt: 450000 } }
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureQueryOperatorsLinesOfCodeByCompanyProjectAnnoWithCondition, done);

    });

    it('should return filtered list of values for num_users by company and project according to conditions', (done) => {

      const ddfql = {
        select: {
          key: [ 'company', 'project' ],
          value: [ 'num_users' ]
        },
        from: 'datapoints',
        where: {
          $and: [
            { company: { $nin: [ 'gap' ] } },
            { project: { $ne: 'ws' } },
            { num_users: { $gt: 4 } }
          ]
        }
      };

      const expectedError = 'You choose select column(s) \'num_users\' which aren\'t present in choosen dataset';
      e2eUtils.sendDdfqlRequestAndExpectError(ddfql, expectedError, done);
    });

  });

  describe('Translations', () => {

    it('should return list of all concepts for language `nl-nl`', (done) => {
      const ddfql = {
        language: 'nl-nl',
        select: {
          key: [ 'concept' ],
          value: [ 'additional_column' ]
        },
        from: 'concepts'
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureConceptsTranslations, done);
    });

    it('should return list of all entities of company entity_domain for language `nl-nl` where it\'s possible', (done) => {
      const ddfql = {
        language: 'nl-nl',
        select: {
          key: [ 'company' ],
          value: [ 'name', 'country', 'full_name_changed', 'additional_column' ]
        },
        from: 'entities'
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureEntityTranslationsCompany, done);
    });

    it('should return list of all entities of region entity_domain for language `nl-nl` where it\'s possible', (done) => {
      const ddfql = {
        language: 'nl-nl',
        select: {
          key: [ 'region' ],
          value: [ 'full_name_changed' ]
        },
        from: 'entities',
        where: {}
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureEntityTranslationsRegion, done);
    });

    it('should return list of entities that are part of company_scale entity_set', (done) => {
      const ddfql = {
        language: 'nl-nl',
        select: {
          key: [ 'company_scale' ],
          value: [ 'full_name_changed', 'is--company_scale' ]
        },
        from: 'entities',
        where: {
          $and: [
            {
              'is--company_scale': true
            }
          ]
        }
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureEntityTranslationsCompanySize, done);
    });

    it('should return all datapoints of company_scale indicator for language `nl-nl`', (done) => {
      const ddfql = {
        language: 'nl-nl',
        select: {
          key: [ 'company', 'anno' ],
          value: [ 'company_scale' ]
        },
        from: 'datapoints',
        where: {}
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointTranslationsCompanySize, done);
    });

  });

});
