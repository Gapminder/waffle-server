import 'mocha';

import { expect } from 'chai';

import * as ddfQueryNormalizer from '../../ws.ddfql/ddf-concepts-query-normalizer';
import { constants } from '../../ws.utils/constants';

const concepts = [
  { gid: 'time', properties: { concept_type: 'time' } },
  { gid: 'quarter', properties: { concept_type: 'quarter' } },
  { gid: 'geo', properties: { concept_type: constants.CONCEPT_TYPE_ENTITY_DOMAIN } },
  { gid: 'country', properties: { concept_type: constants.CONCEPT_TYPE_ENTITY_SET } },
  { gid: 'color' }
];

describe('ddf concepts query normalizer', () => {
  it('should normalize order_by clause', () => {
    const ddfql = {
      select: {
        key: ['concept'],
        value: [
          'concept', 'concept_type', 'domain'
        ]
      },
      from: 'concepts',
      order_by: ['concept_type', 'concept']
    };

    const normalizedDdfql = {
      select: {
        key: ['concept'],
        value: [
          'concept', 'concept_type', 'domain'
        ]
      },
      from: 'concepts',
      where: {},
      join: {},
      order_by: [{ concept_type: 'asc' }, { concept: 'asc' }]
    };

    expect(ddfQueryNormalizer.normalizeConcepts(ddfql, concepts)).to.deep.equal(normalizedDdfql);
  });

  it('should normalize where clause if concept property is contained in collection Concepts', () => {
    const ddfql = {
      select: {
        key: ['concept'],
        value: [
          'concept_type', 'name', 'unit', 'color'
        ]
      },
      from: 'concepts',
      where: {
        $and: [
          { concept_type: { $not: constants.CONCEPT_TYPE_ENTITY_SET } },
          { 'color.palette._default': { $exists: true } },
          { type: constants.CONCEPT_TYPE_ENTITY_DOMAIN }
        ]
      }
    };

    const normalizedDdfql = {
      select: {
        key: ['concept'],
        value: [
          'concept_type', 'name', 'unit', 'color'
        ]
      },
      from: 'concepts',
      where: {
        $and: [
          { 'properties.concept_type': { $not: constants.CONCEPT_TYPE_ENTITY_SET } },
          { 'properties.color.palette._default': { $exists: true } },
          { type: constants.CONCEPT_TYPE_ENTITY_DOMAIN }
        ]
      },
      join: {},
      order_by: []
    };

    expect(ddfQueryNormalizer.normalizeConcepts(ddfql, concepts)).to.deep.equal(normalizedDdfql);
  });

  it('should normalize where clause without concepts (concept_type and concept are special properties)', () => {
    const ddfql = {
      select: {
        key: ['concept'],
        value: [
          'concept_type', 'name', 'unit', 'color'
        ]
      },
      from: 'concepts',
      where: {
        $and: [
          { concept_type: { $not: constants.CONCEPT_TYPE_ENTITY_SET } },
          { 'color.palette._default': { $exists: true } },
          { type: constants.CONCEPT_TYPE_ENTITY_DOMAIN }
        ]
      }
    };

    const normalizedDdfql = {
      select: {
        key: ['concept'],
        value: [
          'concept_type', 'name', 'unit', 'color'
        ]
      },
      from: 'concepts',
      where: {
        $and: [
          { 'properties.concept_type': { $not: constants.CONCEPT_TYPE_ENTITY_SET } },
          { 'color.palette._default': { $exists: true } },
          { type: constants.CONCEPT_TYPE_ENTITY_DOMAIN }
        ]
      },
      join: {},
      order_by: []
    };

    expect(ddfQueryNormalizer.normalizeConcepts(ddfql, undefined)).to.deep.equal(normalizedDdfql);
  });
});
