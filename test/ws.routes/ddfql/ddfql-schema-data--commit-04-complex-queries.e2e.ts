import * as e2eUtils from '../../e2e.utils';
import { e2eEnv } from '../../e2e.env';
import { config } from '../../../ws.config/config';

const INDEX_OF_INITIAL_COMMIT = 3;
const COMMIT_INDEX_TO_IMPORT = process.env.COMMIT_INDEX_TO_IMPORT || 0;

describe('Complex queries for Entities, Datapoints: JOIN', function() {
  if (COMMIT_INDEX_TO_IMPORT > INDEX_OF_INITIAL_COMMIT) {
    return;
  }

  before(() => {
    config.DEFAULT_DATASETS = e2eEnv.repo;
    config.DEFAULT_DATASETS_VERSION = e2eEnv[INDEX_OF_INITIAL_COMMIT];
  });

  describe('Entities complex queries', () => {
    it('should find entities by matching them using constraints on related entity - related entity conditions specified via JOIN', (done) => {
        const ddfql = {
        select: {
          key: ['company'],
          value: [
            'name',
            'country',
            'region'
          ]
        },
        from: 'entities',
        where: {
          $and: [
            {region: '$region'},
            {
              $or: [
                {name: 'Microsoft'},
                {name: 'Gapminder'}
              ]
            }
          ]
        },
        join: {
          $region: {
            key: 'region',
            where: {
              full_name_changed: 'The Americas, including north, south and central america'
            }
          }
        }
      };

        const expectedResponse = {
        headers: ['company', 'name', 'country', 'region'],
        rows: [
          [
            'mcrsft',
            'Microsoft',
            'United States of America',
            'america'
          ]
        ]
      };

        e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, expectedResponse, done);
    });
  });

  describe('Datapoints complex queries', () => {
    it('should fetch datapoint with dimensions constraints specified in JOIN', (done) => {
      const ddfql = {
        select: {
          key: ['company', 'project'],
          value: [
            'lines_of_code'
          ]
        },
        from: 'datapoints',
        where: {
          $and: [
            {company: '$company'},
            {project: '$project'},
            {lines_of_code: {$gte: 848547}}
          ]
        },
        join: {
          $company: {
            key: 'company',
            where: {
              $and: [
                {company: {$in: ['mcrsft', 'gap']}}
              ]
            }
          },
          $project: {
            key: 'project',
            where: {
              project: {$in: ['xbox', 'ws', 'vizabi']}
            }
          }
        },
        order_by: [{lines_of_code: 'asc'}]
      };

      const expectedResponse = {
        headers: ['company', 'project', 'lines_of_code'],
        rows: [
          ['mcrsft', 'xbox', 3985854],
          ['gap', 'vizabi', 4893993]
        ]
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, expectedResponse, done);
    });
  });

  describe('Concepts complex queries', () => {
    it('should fetch concepts using conditions specified in where', (done) => {
      const ddfql = {
        select: {
          key: ['concept'],
          value: [
            'concept_type', 'additional_column'
          ]
        },
        from: 'concepts',
        where: {
          $and: [
            {additional_column: {$in: ['new value and change concept', 'new row and column']}}
          ]
        },
        order_by: ['concept']
      };

      const expectedResponse = {
        headers: ['concept', 'concept_type', 'additional_column'],
        rows: [
          ['additional_column', 'string', 'new row and column'],
          ['full_name_changed', 'string', 'new value and change concept']
        ]
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, expectedResponse, done);
    });
  });
});
