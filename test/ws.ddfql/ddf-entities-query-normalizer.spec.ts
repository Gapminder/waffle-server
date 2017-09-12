import 'mocha';

import { expect } from 'chai';

import * as ddfQueryNormalizer from '../../ws.ddfql/ddf-entities-query-normalizer';
import { constants } from '../../ws.utils/constants';

const concepts = [
  { gid: 'time', properties: { concept_type: 'time' } },
  { gid: 'quarter', properties: { concept_type: 'quarter' } },
  { gid: 'geo', originId: '17a3470d3a8c9b37009b9bf9', properties: { concept_type: constants.CONCEPT_TYPE_ENTITY_DOMAIN } },
  { gid: 'country', originId: '77a3470d3a8c9b37009b9bf9', properties: { concept_type: constants.CONCEPT_TYPE_ENTITY_SET } },
  { gid: 'company', originId: '87a3470d3a8c9b37009b9bf9', properties: { concept_type: constants.CONCEPT_TYPE_ENTITY_SET } },
  { gid: 'english_speaking', originId: '97a3470d3a8c9b37009b9bf9', properties: { concept_type: constants.CONCEPT_TYPE_ENTITY_SET } },
  { gid: 'world_4region', properties: { concept_type: constants.CONCEPT_TYPE_ENTITY_SET } },
  { gid: 'main_religion', properties: { concept_type: constants.CONCEPT_TYPE_ENTITY_SET } },
  { gid: 'landlocked', properties: { concept_type: constants.CONCEPT_TYPE_ENTITY_SET } },
  { gid: 'latitude', properties: { concept_type: constants.CONCEPT_TYPE_ENTITY_SET } },
  { gid: 'longitude', properties: { concept_type: constants.CONCEPT_TYPE_ENTITY_SET } },
  { gid: 'color' },
  { gid: 'name' },
  { gid: 'gwid' }
];

describe('ddf entities query normalizer', () => {
  it('should normalize order_by clause', () => {
    const ddfql = {
      select: {
        key: ['geo'],
        value: [
          'name', '_default', 'world_4region', 'landlocked'
        ]
      },
      from: 'entities',
      order_by: ['world_4region', 'name']
    };

    const normalizedDdfql = {
      select: {
        key: ['geo'],
        value: [
          'name', '_default', 'world_4region', 'landlocked'
        ]
      },
      from: 'entities',
      where: {
        $and: [
          {
            $or: [
              { domain: { $in: ['17a3470d3a8c9b37009b9bf9'] } },
              { sets: { $in: ['17a3470d3a8c9b37009b9bf9'] } }
            ]
          }
        ]
      },
      join: {},
      order_by: [{ world_4region: 'asc' }, { name: 'asc' }]
    };

    expect(ddfQueryNormalizer.normalizeEntities(ddfql, concepts)).to.deep.equal(normalizedDdfql);
  });

  it('should normalize entity_set in `select.key` clause', () => {
    const ddfql = {
      select: {
        key: ['country'],
        value: [
          'name', '_default', 'world_4region', 'landlocked'
        ]
      },
      from: 'entities',
      order_by: []
    };

    const normalizedDdfql = {
      select: {
        key: ['country'],
        value: [
          'name', '_default', 'world_4region', 'landlocked'
        ]
      },
      from: 'entities',
      where: {
        $and: [
          {
            $or: [
              { domain: { $in: ['77a3470d3a8c9b37009b9bf9'] } },
              { sets: { $in: ['77a3470d3a8c9b37009b9bf9'] } }
            ]
          }
        ]
      },
      join: {},
      order_by: []
    };

    expect(ddfQueryNormalizer.normalizeEntities(ddfql, concepts)).to.deep.equal(normalizedDdfql);
  });

  it('should normalize query to all entities from certain entity_set', () => {
    const ddfql = {
      select: {
        key: ['company']
      },
      from: 'entities'
    };

    const normalizedDdfql = {
      select: {
        key: ['company']
      },
      from: 'entities',
      where: {
        $and: [
          {
            $or: [
              { domain: { $in: ['87a3470d3a8c9b37009b9bf9'] } },
              { sets: { $in: ['87a3470d3a8c9b37009b9bf9'] } }
            ]
          }
        ]
      },
      join: {},
      order_by: []
    };

    expect(ddfQueryNormalizer.normalizeEntities(ddfql, concepts)).to.deep.equal(normalizedDdfql);
  });

  it('should normalize query for entity property with operator `.is--`', () => {
    const ddfql = {
      select: {
        key: ['company'],
        value: ['company', 'name', 'is--english_speaking']
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

    const normalizedDdfql = {
      select: {
        key: ['company'],
        value: ['company', 'name', 'is--english_speaking']
      },
      from: 'entities',
      where: {
        $and: [
          {
            $or: [
              { domain: { $in: ['87a3470d3a8c9b37009b9bf9'] } },
              { sets: { $in: ['87a3470d3a8c9b37009b9bf9'] } }
            ]
          },
          {
            $and: [
              {
                'properties.is--english_speaking': true
              }
            ]
          }
        ]
      },
      join: {},
      order_by: []
    };

    expect(ddfQueryNormalizer.normalizeEntities(ddfql, concepts)).to.deep.equal(normalizedDdfql);
  });

  it('should normalize complex query with joins', () => {
    const ddfql = {
      select: {
        key: ['geo'],
        value: [
          'name', '_default', 'world_4region'
        ]
      },
      from: 'entities',
      where: {
        $and: [
          { 'is--country': true },
          { landlocked: '$landlocked' },
          {
            $nor: [
              { latitude: { $gt: -10, $lt: 1 }, world_4region: '$world_4region' },
              { longitude: { $gt: 30, $lt: 70 }, main_religion: '$main_religion_2008' }
            ]
          }
        ]
      },
      join: {
        $landlocked: {
          key: 'landlocked',
          where: {
            $or: [
              { gwid: 'i271' },
              { name: 'Coastline' }
            ]
          }
        },
        $world_4region: {
          key: 'world_4region',
          where: {
            color: '#ff5872'
          }
        },
        $main_religion_2008: {
          key: 'main_religion',
          where: {
            main_religion: { $nin: ['eastern_religions'] }
          }
        }
      }
    };

    const normalizedDdfql = {
      select: {
        key: ['geo'],
        value: [
          'name', '_default', 'world_4region'
        ]
      },
      from: 'entities',
      where: {
        $and: [
          {
            $or: [
              { domain: { $in: ['17a3470d3a8c9b37009b9bf9'] } },
              { sets: { $in: ['17a3470d3a8c9b37009b9bf9'] } }
            ]
          },
          {
            $and: [
              { 'properties.is--country': true },
              { 'properties.landlocked': '$landlocked' },
              {
                $nor: [
                  { 'properties.latitude': { $gt: -10, $lt: 1 }, 'properties.world_4region': '$world_4region' },
                  {
                    'properties.longitude': { $gt: 30, $lt: 70 },
                    'properties.main_religion': '$main_religion_2008'
                  }
                ]
              }
            ]
          }
        ]
      },
      join: {
        $landlocked: {
          sets: 'landlocked',
          $or: [
            { 'properties.gwid': 'i271' },
            { 'properties.name': 'Coastline' }
          ]
        },
        $world_4region: {
          sets: 'world_4region',
          'properties.color': '#ff5872'
        },
        $main_religion_2008: {
          sets: 'main_religion',
          gid: { $nin: ['eastern_religions'] }
        }
      },
      order_by: []
    };

    expect(ddfQueryNormalizer.normalizeEntities(ddfql, concepts)).to.deep.equal(normalizedDdfql);
  });
});
