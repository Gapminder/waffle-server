import * as e2eUtils from '../../e2e.utils';
import { e2eEnv } from '../../e2e.env';

import * as fixtureSchemaSortingValueAsc from './fixtures/commit-1--schema-sorting-asc-value.json';
import * as fixtureSchemaSortingValueDesc from './fixtures/commit-1--schema-sorting-desc.json';

import * as fixtureConceptsSortingConceptAsc from './fixtures/commit-1--concepts-sorting-asc-concept.json';
import * as fixtureConceptsSortingConceptAscAndConceptTypeDesc from './fixtures/commit-1--concepts-sorting-asc-concept-and-desc-concept_type.json';
import * as fixtureConceptsSortingConceptTypeDesc from './fixtures/commit-1--concepts-sorting-desc-concept_type.json';

import * as fixtureDatapointsSortingCompanyAsc from './fixtures/commit-1--datapoints-sorting-asc-company.json';
import * as fixtureDatapointsSortingCompanySizeDesc from './fixtures/commit-1--datapoints-sorting-desc-company_size.json';
import * as fixtureDatapointsSortingAnnoDescAndCompanySizeAsc from './fixtures/commit-1--datapoints-sorting-desc-anno-and-asc-company_size.json';

import * as fixtureEntitiesSortingRegionAsc from './fixtures/commit-1--entities-sorting-asc-region.json';
import * as fixtureEntitiesSortingRegionDesc from './fixtures/commit-1--entities-sorting-desc-region.json';
import * as fixtureEntitiesSortingRegionAscAndFullNameDesc from './fixtures/commit-1--entities-sorting-asc-region-and-desc-full_name.json';
import { config } from '../../../ws.config/config';

const INDEX_OF_INITIAL_COMMIT = 0;
const COMMIT_INDEX_TO_IMPORT = process.env.COMMIT_INDEX_TO_IMPORT || 0;

describe('Initial State, Version 1 (1st commit) - Sorting in DDFQL', function() {
  if (COMMIT_INDEX_TO_IMPORT > INDEX_OF_INITIAL_COMMIT) {
    return;
  }

  before(() => {
    config.DEFAULT_DATASETS = e2eEnv.repo;
    config.DEFAULT_DATASETS_VERSION = e2eEnv[INDEX_OF_INITIAL_COMMIT];
  });

  describe('Schema sorting', function() {
    it('should sort schema data by key:value:asc', (done) => {
      const ddfql = {
        select: {
          key: ['key', 'value'],
          value: ['avg(value)']
        },
        from: 'datapoints.schema',
        order_by: [{value: 'asc'}]
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureSchemaSortingValueAsc, done, {sort: false});
    });

    it('should sort schema data by key:value:asc - simplified notion', (done) => {
      const ddfql = {
        select: {
          key: ['key', 'value'],
          value: ['avg(value)']
        },
        from: 'datapoints.schema',
        order_by: ['value']
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureSchemaSortingValueAsc, done, {sort: false});
    });

    it('should sort schema data by select:value:desc', (done) => {
      const ddfql = {
        select: {
          key: ['key', 'value'],
          value: ['avg(value)']
        },
        from: 'datapoints.schema',
        order_by: [{value: 'desc'}]
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureSchemaSortingValueDesc, done, {sort: false});
    });
  });

  describe('Concepts sorting', function() {
    it('should sort concepts by key', (done) => {
      const ddfql = {
        select: {
          key: ['concept'],
          value: ['concept_type']
        },
        from: 'concepts',
        order_by: [{concept: 'asc'}]
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureConceptsSortingConceptAsc, done, {sort: false});
    });

    it('should sort concepts by key: simplified notion', (done) => {
      const ddfql = {
        select: {
          key: ['concept'],
          value: ['concept_type']
        },
        from: 'concepts',
        order_by: ['concept']
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureConceptsSortingConceptAsc, done, {sort: false});
    });

    it('should sort concepts by key:asc and value:desc', (done) => {
      const ddfql = {
        select: {
          key: ['concept'],
          value: ['concept_type']
        },
        from: 'concepts',
        order_by: [{concept: 'asc'}, {concept_type: 'desc'}]
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureConceptsSortingConceptAscAndConceptTypeDesc, done, {sort: false});
    });

    it('should sort concepts by value:desc', (done) => {
      const ddfql = {
        select: {
          key: ['concept'],
          value: ['concept_type']
        },
        from: 'concepts',
        order_by: [{concept_type: 'desc'}]
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureConceptsSortingConceptTypeDesc, done, {sort: false});
    });
  });

  describe('Datapoints sorting', function() {
    it('should sort datapoints by key:company:asc and key:anno:asc', (done) => {
      const ddfql = {
        select: {
          key: ['company', 'anno'],
          value: [
            'company_size'
          ]
        },
        from: 'datapoints',
        order_by: [{company: 'asc'}, {anno: 'asc'}]
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsSortingCompanyAsc, done, {sort: false});
    });

    it('should sort datapoints by key:company:asc and key:anno:asc - simplified notion', (done) => {
      const ddfql = {
        select: {
          key: ['company', 'anno'],
          value: [
            'company_size'
          ]
        },
        from: 'datapoints',
        order_by: ['company', 'anno']
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsSortingCompanyAsc, done, {sort: false});
    });

    it('should sort datapoints by value:company_size:desc and key:anno:asc', (done) => {
      const ddfql = {
        select: {
          key: ['company', 'anno'],
          value: [
            'company_size'
          ]
        },
        from: 'datapoints',
        order_by: [{company_size: 'desc'}, 'anno']
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsSortingCompanySizeDesc, done, {sort: false});
    });

    it('should sort datapoints by key:anno:desc and value:company_size:asc', (done) => {
      const ddfql = {
        select: {
          key: ['company', 'anno'],
          value: [
            'company_size'
          ]
        },
        from: 'datapoints',
        order_by: [{anno: 'desc'}, 'company_size']
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureDatapointsSortingAnnoDescAndCompanySizeAsc, done, {sort: false});
    });
  });

  describe('Entities sorting', function() {
    it('should sort entities by select:key:region:asc', (done) => {
      const ddfql = {
        select: {
          key: ['region'],
          value: ['full_name']
        },
        from: 'entities',
        order_by: [{region: 'asc'}]
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureEntitiesSortingRegionAsc, done, {sort: false});
    });

    it('should sort entities by select:key:region:asc - simplified notion', (done) => {
      const ddfql = {
        select: {
          key: ['region'],
          value: ['full_name']
        },
        from: 'entities',
        order_by: ['region']
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureEntitiesSortingRegionAsc, done, {sort: false});
    });

    it('should sort entities by select:key:region:desc', (done) => {
      const ddfql = {
        select: {
          key: ['region'],
          value: ['full_name']
        },
        from: 'entities',
        order_by: [{region: 'desc'}]
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureEntitiesSortingRegionDesc, done, {sort: false});
    });

    it('should sort entities by select:key:region:asc and select:key:full_name:desc', (done) => {
      const ddfql = {
        select: {
          key: ['region'],
          value: ['full_name']
        },
        from: 'entities',
        order_by: [{region: 'asc'}, {full_name: 'desc'}]
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, fixtureEntitiesSortingRegionAscAndFullNameDesc, done, {sort: false});
    });
  });
});
