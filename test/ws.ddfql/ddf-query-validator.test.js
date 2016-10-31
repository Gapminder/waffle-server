/**
 * Created by tvaleriy on 10/25/16.
 */
'use strict';

const chai = require('chai');
const ddfQueryValidator = require('./../../ws.ddfql/ddf-query-validator');
const expect = chai.expect;
const concepts = [
  {gid: 'time', properties: {concept_type: 'time'}},
  {gid: 'quarter', properties: {concept_type: 'time'}},
  {gid: 'geo', originId: "17a3470d3a8c9b37009b9bf9", properties: {concept_type: 'entity_domain'}},
  {gid: 'country', originId: "77a3470d3a8c9b37009b9bf9", properties: {concept_type: 'entity_set'}},
  {gid: 'company', originId: "87a3470d3a8c9b37009b9bf9", properties: {concept_type: 'entity_set'}},
  {gid: 'english_speaking', originId: "97a3470d3a8c9b37009b9bf9", properties: {concept_type: 'entity_set'}},
  {gid: 'world_4region', properties: {concept_type: 'entity_set'}},
  {gid: 'main_religion', properties: {concept_type: 'entity_set'}},
  {gid: 'landlocked', properties: {concept_type: 'entity_set'}},
  {gid: 'latitude', properties: {concept_type: 'measure'}},
  {gid: 'longitude', properties: {concept_type: 'measure'}},
  {gid: 'color'},
  {gid: 'name'},
  {gid: 'gwid'}
];

describe('ddf query validator', () => {
  it('Should return error message: Invalid DDFQL-query. Validation of Where Clause: contain \'.\'', () => {
    const ddfql = {
      "select": {
        "key": ["company"],
        "value": ["company", "name", "is--english_speaking"]
      },
      "from": "entities",
      "where": {
        "$and": [
          {
            ".is--english_speaking": true
          }
        ]
      }
    };
    const message = ddfQueryValidator.validateDdfQuery(ddfql, concepts).messages;
    expect(message.toString()).to.contain('Invalid DDFQL-query. Validation of Where Clause: contain \'.\' in');
  });
  it('Should return error message: Invalid DDFQL-query. Validation of Join Clause: does not contain \'$\'', () => {
    const ddfql = {
      "select": {
        "key": ["company"],
        "value": ["company", "name", "is--english_speaking"]
      },
      "from": "entities",
      "where": {
        "$and": [
          {
            "$or":[
              {"domain": {"$in": ["17a3470d3a8c9b37009b9bf9"]}},
              {"sets": {"$in": ["17a3470d3a8c9b37009b9bf9"]}}
            ]
          }
        ]
      },
      "join": {
        "geo": {
          key: "geo",
          where: {
            "is--country": true,
            "latitude": { "$lte": 0 },
          }
        }
      },
    };
    const message = ddfQueryValidator.validateDdfQuery(ddfql, concepts).messages;
    expect(message.toString()).to.contain('Invalid DDFQL-query. Validation of Join Clause: does not contain \'$\' in ');
  });
  it('This query should be validated as valid:true', () => {
    const ddfql = {
      "select": {
        "key": ["company"],
        "value": ["company", "name", "is--english_speaking"]
      },
      "from": "entities",
      "where": {
        "$and": [
          {
            "$or":[
              {"domain": {"$in": ["17a3470d3a8c9b37009b9bf9"]}},
              {"sets": {"$in": ["17a3470d3a8c9b37009b9bf9"]}}
            ]
          }
        ]
      },
      "join": {
        "$geo": {
          key: "geo",
          where: {
            "is--country": true,
            "latitude": { "$lte": 0 },
          }
        }
      },
    };
    const message = ddfQueryValidator.validateDdfQuery(ddfql, concepts);
    expect(message.valid).to.be.true;
  });
  it('Should return error message: Invalid DDFQL-query. Validation of Select Clause: does not contain \'key\'', () => {
    const ddfql = {
      "select": {
        "value": ["company", "name", "is--english_speaking"]
      },
      "from": "entities",
      "where": {
        "$and": [
          {
            "$or":[
              {"domain": {"$in": ["17a3470d3a8c9b37009b9bf9"]}},
              {"sets": {"$in": ["17a3470d3a8c9b37009b9bf9"]}}
            ]
          }
        ]
      },
      "join": {
        "$geo": {
          key: "geo",
          where: {
            "is--country": true,
            "latitude": { "$lte": 0 },
          }
        }
      },
    };
    const message = ddfQueryValidator.validateDdfQuery(ddfql, concepts).messages;
    expect(message.toString()).to.contain('Invalid DDFQL-query. Validation of Select Clause: does not contain \'key\'');
  });
  it('Should return error message: Invalid DDFQL-query. Validation of Select Clause: \'value\' ' +
    'contains more than 5 measures, please try again with less amount', () => {
    const ddfql = {
      "select": {
        "key": ["company"],
        "value": ["company", "name", "english_speaking", "geo", "time", "landlocked"]
      },
      "from": "datapoints",
      "where": {
        "$and": [
          {
            "$or":[
              {"domain": {"$in": ["17a3470d3a8c9b37009b9bf9"]}},
              {"sets": {"$in": ["17a3470d3a8c9b37009b9bf9"]}}
            ]
          }
        ]
      },
      "join": {
        "$geo": {
          key: "geo",
          where: {
            "is--country": true,
            "latitude": { "$lte": 0 },
          }
        }
      },
    };
    const message = ddfQueryValidator.validateDdfQuery(ddfql, concepts).messages;
    expect(message.toString()).to.contain('Invalid DDFQL-query. Validation of Select Clause: \'value\' ' +
      'contains more than 5 measures, please try again with less amount');
  });
});
