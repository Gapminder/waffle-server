import 'mocha';

import {expect} from 'chai';

import * as ddfQueryNormalizer from '../../ws.ddfql/ddf-concepts-query-normalizer';

const concepts = [
  {gid: 'time', properties: {concept_type: 'time'}},
  {gid: 'quarter', properties: {concept_type: 'quarter'}},
  {gid: 'geo', properties: {concept_type: 'entity_domain'}},
  {gid: 'country', properties: {concept_type: 'entity_set'}},
  {gid: 'color'}
];

describe('ddf concepts query normalizer', () => {
  it('should normalize order_by clause', () => {
    const ddfql = {
      "select": {
        "key": ["concept"],
        "value": [
          "concept", "concept_type", "domain"
        ]
      },
      "from": "concepts",
      "order_by": ["concept_type", "concept"]
    };

    const normalizedDdfql = {
      "select": {
        "key": ["concept"],
        "value": [
          "concept", "concept_type", "domain"
        ]
      },
      "from": "concepts",
      "where": {},
      "join": {},
      "order_by": [{"concept_type": "asc"}, {"concept": "asc"}]
    };

    expect(ddfQueryNormalizer.normalizeConcepts(ddfql, concepts)).to.deep.equal(normalizedDdfql);
  });

  it('should normalize where clause if concept property is contained in collection Concepts', () => {
    const ddfql = {
      "select": {
        "key": ["concept"],
        "value": [
          "concept_type", "name", "unit","color"
        ]
      },
      "from": "concepts",
      "where": {
        "$and": [
          {"concept_type": {"$not": "entity_set"}},
          {"color.palette._default": {"$exists": true}},
          {"type": "entity_domain"}
        ]
      }
    };

    const normalizedDdfql = {
      "select": {
        "key": ["concept"],
        "value": [
          "concept_type", "name", "unit","color"
        ]
      },
      "from": "concepts",
      "where": {
        "$and": [
          {"properties.concept_type": {"$not": "entity_set"}},
          {"properties.color.palette._default": {"$exists": true}},
          {"type": "entity_domain"}
        ]
      },
      "join": {},
      "order_by": []
    };

    expect(ddfQueryNormalizer.normalizeConcepts(ddfql, concepts)).to.deep.equal(normalizedDdfql);
  });

  it('should normalize where clause without concepts (concept_type and concept are special properties)', () => {
    const ddfql = {
      "select": {
        "key": ["concept"],
        "value": [
          "concept_type", "name", "unit","color"
        ]
      },
      "from": "concepts",
      "where": {
        "$and": [
          {"concept_type": {"$not": "entity_set"}},
          {"color.palette._default": {"$exists": true}},
          {"type": "entity_domain"}
        ]
      }
    };

    const normalizedDdfql = {
      "select": {
        "key": ["concept"],
        "value": [
          "concept_type", "name", "unit","color"
        ]
      },
      "from": "concepts",
      "where": {
        "$and": [
          {"properties.concept_type": {"$not": "entity_set"}},
          {"color.palette._default": {"$exists": true}},
          {"type": "entity_domain"}
        ]
      },
      join: {},
      "order_by": []
    };

    expect(ddfQueryNormalizer.normalizeConcepts(ddfql, undefined)).to.deep.equal(normalizedDdfql);
  });
});
