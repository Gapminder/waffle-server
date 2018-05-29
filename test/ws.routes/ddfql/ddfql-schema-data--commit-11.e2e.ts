import * as e2eUtils from '../../e2e.utils';
import {e2eEnv} from '../../e2e.env';
import { config } from '../../../ws.config/config';

import * as fixtureDatapointsWithCorrectNlTranslations
  from './fixtures/commit-11--datapoints-with_correct_nl_nl_translations.json';
import * as fixtureDatapointsWithCorrectRuTranslations
  from './fixtures/commit-11--datapoints-with_correct_ru_ru_translations.json';
import * as fixtureEntitiesWithCorrectNlTranslations
  from './fixtures/commit-11--entities-with_correct_nl_nl_translations.json';
import * as fixtureEntitiesWithCorrectRuTranslations
  from './fixtures/commit-11--entities-with_correct_ru_ru_translations.json';
import * as fixtureConceptsWithCorrectNlTranslations
  from './fixtures/commit-11--concepts-with_correct_nl_nl_translations.json';
import * as fixtureConceptsWithCorrectRuTranslations
  from './fixtures/commit-11--concepts-with_correct_ru_ru_translations.json';

const INDEX_OF_TENTH_COMMIT = 10;
const COMMIT_INDEX_TO_IMPORT = process.env.COMMIT_INDEX_TO_IMPORT || 0;

describe('State Version 11 (11th commit)', function() {
  if (COMMIT_INDEX_TO_IMPORT) {
    return;
  }

  before(() => {
    config.DEFAULT_DATASETS = e2eEnv.repo;
    config.DEFAULT_DATASETS_VERSION = e2eEnv[INDEX_OF_TENTH_COMMIT];
  });

  it('should return datapoints with correct nl-nl translations', (done: Function) => {
    const ddfql = {
      language: 'nl-nl',
      select: {
        key: ['project', 'company'],
        value: ['popular_appeal', 'meeting_style', 'methodology']
      },
      from: 'datapoints',
      where: {},
      order_by: ['project', 'company']
    };

    e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsWithCorrectNlTranslations, done);
  });

  it('should return datapoints with correct ru-ru translations', (done: Function) => {
    const ddfql = {
      language: 'ru-ru',
      select: {
        key: ['project', 'company'],
        value: ['popular_appeal', 'meeting_style', 'methodology']
      },
      from: 'datapoints',
      where: {},
      order_by: ['project', 'company']
    };

    e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsWithCorrectRuTranslations, done);
  });

  it('should return entities with correct nl-nl translations', (done: Function) => {
    const ddfql = {
      language: 'nl-nl',
      select: {
        key: ['company'],
        value: ['country', 'region']
      },
      from: 'entities',
      where: {},
      order_by: ['company', 'country']
    };

    e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureEntitiesWithCorrectNlTranslations, done);
  });

  it('should return entities with correct ru-ru translations', (done: Function) => {
    const ddfql = {
      language: 'ru-ru',
      select: {
        key: ['company'],
        value: ['country', 'region']
      },
      from: 'entities',
      where: {},
      order_by: ['company', 'country']
    };

    e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureEntitiesWithCorrectRuTranslations, done);
  });

  it('should return concepts with correct nl-nl translations', (done: Function) => {
    const ddfql = {
      language: 'nl-nl',
      select: {
        key: ['concept'],
        value: ['concept_type', 'additional_column']
      },
      from: 'concepts',
      where: {},
      order_by: ['concept']
    };

    e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureConceptsWithCorrectNlTranslations, done);
  });

  it('should return concepts with correct ru-ru translations', (done: Function) => {
    const ddfql = {
      language: 'ru-ru',
      select: {
        key: ['concept'],
        value: ['concept_type', 'additional_column']
      },
      from: 'concepts',
      where: {},
      order_by: ['concept']
    };

    e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureConceptsWithCorrectRuTranslations, done);
  });
});
