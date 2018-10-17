import * as e2eUtils from '../../e2e.utils';
import { e2eEnv } from '../../e2e.env';
import { config } from '../../../ws.config/config';

const INDEX_OF_INITIAL_COMMIT = 0;
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
              full_name: 'The Americas, including north, south and central america'
            }
          }
        }
      };

        const expectedResponse = {
        headers: ['company', 'name', 'country', 'region'],
        rows: [
          [
            'mic',
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
            'num_users'
          ]
        },
        from: 'datapoints',
        where: {
          $and: [
            {company: '$company'},
            {project: '$project'},
            {num_users: {$in: [4, 6, 8567]}}
          ]
        },
        join: {
          $company: {
            key: 'company',
            where: {
              $and: [
                {company: {$in: ['mic', 'gap']}}
              ]
            }
          },
          $project: {
            key: 'project',
            where: {
              project: {$in: ['xbox', 'ws']}
            }
          }
        },
        order_by: ['geo', {project: 'asc'}]
      };

      const expectedResponse = {
        headers: ['company', 'project', 'num_users'],
        rows: [
          ['mic', 'xbox', 6],
          ['gap', 'ws', 8567]
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
            'concept_type', 'domain'
          ]
        },
        from: 'concepts',
        where: {
          $and: [
            {concept_type: {$ne: 'entity_set'}},
            {concept_type: {$in: ['time', 'string']}}
          ]
        },
        order_by: ['concept']
      };

      const expectedResponse = {
        headers: ['concept', 'concept_type', 'domain'],
        rows: [
          ['anno', 'time', null],
          ['domain', 'string', null],
          ['full_name', 'string', null],
          ['country', 'string', null],
          ['name', 'string', null]
        ]
      };

      e2eUtils.sendDdfqlRequestAndVerifyResponse(ddfql, expectedResponse, done);
    });
  });
});
