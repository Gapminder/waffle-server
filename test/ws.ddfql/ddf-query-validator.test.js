'use strict';

const chai = require('chai');
const ddfQueryValidator = require('../../ws.ddfql/ddf-query-validator');
const expect = chai.expect;
const concepts = [
  {gid: 'time', properties: {concept_type: 'time'}},
  {gid: 'quarter', properties: {concept_type: 'quarter'}},
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
  it('should return error message: Invalid DDFQL-query. Validation of Where Clause: contain \'.\'', () => {
    const ddfql = {
      "where": {
        "$and": [
          {
            ".is--english_speaking": true
          }
        ]
      }
    };

    const message = ddfQueryValidator.validateDdfQuery(ddfql, concepts).messages;
    const expectedMessage = 'Invalid DDFQL-query. Validation of Where Clause: contain \'.\' in';

    expect(message.toString()).to.contain(expectedMessage);
  });

  it('should return error message: Invalid DDFQL-query. Validation of Join Clause: does not contain \'$\'', () => {
    const ddfql = {
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
    const expectedMessage = 'Invalid DDFQL-query. Validation of Join Clause: does not contain \'$\' in ';

    expect(message.toString()).to.contain(expectedMessage);
  });

  it('should validate query without errors', () => {
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

  it('should return error message: Invalid DDFQL-query. Validation of Select Clause: does not contain \'key\'', () => {
    const ddfql = {
      "select": {
        "value": ["company", "name", "is--english_speaking"]
      },
    };

    const message = ddfQueryValidator.validateDdfQuery(ddfql, concepts).messages;
    const expectedMessage = 'Invalid DDFQL-query. Validation of Select Clause: does not contain \'key\'';

    expect(message.toString()).to.contain(expectedMessage);
  });

  it(`should return error message: Invalid DDFQL-query. Validation of Select Clause: \'value\' 
  contains more than 5 measures, please try again with less amount`, () => {
    const ddfql = {
      "select": {
        "key": ["company"],
        "value": ["company", "name", "english_speaking", "geo", "time", "landlocked"]
      },
      "from": "datapoints",
    };

    const message = ddfQueryValidator.validateDdfQuery(ddfql, concepts).messages;
    const expectedMessage = 'Invalid DDFQL-query. Validation of Select Clause: \'value\' contains more than 5 measures, please try again with less amount';

    expect(message.toString()).to.contain(expectedMessage);
  });

  it('should return error message: order_by should contain an array', () => {
    const ddfql = {
      "select": {
        "key": ["company"],
        "value": ["company", "name", "english_speaking", "geo"]
      },
      "from": "datapoints",
      "order_by": "life_expectancy",
    };

    const message = ddfQueryValidator.validateDdfQuery(ddfql, concepts).messages;
    const expectedMessage = 'Invalid DDFQL-query. Validation of order_by clause: order_by should contain an array.';

    expect(message.toString()).to.contain(expectedMessage);
  });

  it('should return error message: order_by should not contain empty values', () => {
    const ddfql = {
      "select": {
        "key": ["company"],
        "value": ["company", "name", "english_speaking", "geo"]
      },
      "from": "datapoints",
      "order_by": [,],
    };

    const message = ddfQueryValidator.validateDdfQuery(ddfql, concepts).messages[0];
    const expectedMessage = 'Invalid DDFQL-query. Validation of order_by clause: order_by should not contain empty values';

    expect(message.toString()).to.contain(expectedMessage);
  });

  it('should return error message: order_by cannot contain arrays as its elements', () => {
    const ddfql = {
      "select": {
        "key": ["company"],
        "value": ["company", "name", "english_speaking", "geo"]
      },
      "from": "datapoints",
      "order_by": [["",""]],
    };

    const message = ddfQueryValidator.validateDdfQuery(ddfql, concepts).messages;
    const expectedMessage1 = 'Invalid DDFQL-query. Validation of order_by clause: order_by cannot contain arrays as its elements';
    const expectedMessage2 = 'Invalid DDFQL-query. Validation of order_by clause: object in order_by clause should contain only one key. Was ["0","1"]';

    expect(message[0].toString()).to.contain(expectedMessage1);
    expect(message[1].toString()).to.contain(expectedMessage2);
  });

  it(`should return error message: object in order_by clause should contain only following sort directions: 
  "asc", "desc"`, () => {
    const ddfql = {
      "select": {
        "key": ["company"],
        "value": ["company", "name", "english_speaking", "geo"]
      },
      "from": "datapoints",
      "order_by": [{"": "asc"},{"": "top"}],
    };

    const message = ddfQueryValidator.validateDdfQuery(ddfql, concepts).messages;
    const expectedMessage1 = 'Invalid DDFQL-query. Validation of order_by clause: order_by clause should contain only properties from select.key and select.value.';
    const expectedMessage2 = 'Invalid DDFQL-query. Validation of order_by clause: object in order_by clause should contain only following sort directions: \'asc\', \'desc\'.';

    expect(message[0].toString()).to.contain(expectedMessage1);
    expect(message[1].toString()).to.contain(expectedMessage2);
  });

});
