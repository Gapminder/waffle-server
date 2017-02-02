import '../../../../ws.repository';

import {expect} from 'chai';
import * as sinon from 'sinon';
import {mapConcepts, mapEntities, mapDatapoints, mapSchema} from '../../../../ws.routes/data-post-processors/format/format-ws.processor';

describe('Format WS Processor', () => {

  it('should invoke map an empty array of datapoints by format-ws processor', sinon.test(function (done) {
    const data = {
      concepts: [],
      entities: [],
      datasetName: 'DatasetName',
      datasetVersionCommit: 'Version',
      headers: ['geo', 'time', 'population'],
      datapoints: []
    };
    const expectedData = {
      dataset: data.datasetName,
      version: data.datasetVersionCommit,
      headers: data.headers,
      rows: []
    };

    return mapDatapoints(data).toCallback((error, result) => {
      expect(result).to.be.deep.equal(expectedData);
      return done();
    });
  }));

  it('should invoke mapping a few datapoints by format-ws processor', sinon.test(function (done) {
    const data = {
      concepts: [
        {gid:'population', originId: 'C1'},
        {gid:'time', originId: 'C2'},
        {gid:'geo', originId: 'C3'},
        {gid:'country', domain: 'C3', originId: 'C4'},
        {gid:'population2', originId: 'C5'},
      ],
      entities: [
        {gid: 'usa', originId: 'E1', domain: 'C3', sets: ['C4']},
        {gid: 'ukraine', originId: 'E2', domain: 'C3', sets: ['C4']},
        {gid: '2000', originId: 'E3', domain: 'C2', sets: []},
        {gid: '1800', originId: 'E4', domain: 'C2', sets: []},
        {gid: '1900', originId: 'E5', domain: 'C2', sets: []},
        {gid: '2100', originId: 'E6', domain: 'C2', sets: []}
      ],
      datasetName: 'DatasetName',
      datasetVersionCommit: 'Version',
      headers: ['population', 'country', 'time', 'population2'],
      datapoints: [
        {properties: {population: '123'}, measure: 'C1', dimensions: ['E2', 'E3']},
        {properties: {population: '234'}, measure: 'C1', dimensions: ['E3', 'E1']},
        {properties: {population: '345'}, measure: 'C1', dimensions: ['E2', 'E4']},
        {properties: {population: '456'}, measure: 'C1', dimensions: ['E1', 'E4']},
        {properties: {population: '567'}, measure: 'C1', dimensions: ['E5', 'E1']},
        {properties: {population: '678'}, measure: 'C1', dimensions: ['E5', 'E2']},

        {properties: {population2: '456'}, measure: 'C5', dimensions: ['E1', 'E4']},
        {properties: {population2: '567'}, measure: 'C5', dimensions: ['E5', 'E1']},
        {properties: {population2: '234'}, measure: 'C5', dimensions: ['E3', 'E1']},
        {properties: {population2: '345'}, measure: 'C5', dimensions: ['E2', 'E4']},
        {properties: {population2: '678'}, measure: 'C5', dimensions: ['E6', 'E2']},
        {properties: {population2: '678'}, measure: 'C5', dimensions: ['E6', 'E1']},
      ],
      query: {}
    };
    const expectedData = {
      dataset: data.datasetName,
      version: data.datasetVersionCommit,
      headers: data.headers,
      rows: [
        [123, 'ukraine', '2000', null],
        [234, 'usa', '2000', 234],
        [345, 'ukraine', '1800', 345],
        [456, 'usa', '1800', 456],
        [567, 'usa', '1900', 567],
        [678, 'ukraine', '1900', null],
        [null, 'ukraine', '2100', 678],
        [null, 'usa', '2100', 678],
      ]
    };

    return mapDatapoints(data).toCallback((error, result) => {
      expect(result).to.be.deep.equal(expectedData);
      return done();
    });
  }));

  it('should invoke map a few datapoints by format-ws processor with ordering', sinon.test(function (done) {
    const data = {
      concepts: [
        {gid:'population', originId: 'C1'},
        {gid:'time', originId: 'C2'},
        {gid:'geo', originId: 'C3'},
        {gid:'country', domain: 'C3', originId: 'C4'},
        {gid:'population2', originId: 'C5'},
      ],
      entities: [
        {gid: 'usa', originId: 'E1', domain: 'C3', sets: ['C4']},
        {gid: 'ukraine', originId: 'E2', domain: 'C3', sets: ['C4']},
        {gid: '2000', originId: 'E3', domain: 'C2', sets: []},
        {gid: '1800', originId: 'E4', domain: 'C2', sets: []},
        {gid: '1900', originId: 'E5', domain: 'C2', sets: []},
        {gid: '2100', originId: 'E6', domain: 'C2', sets: []}
      ],
      datasetName: 'DatasetName',
      datasetVersionCommit: 'Version',
      headers: ['population', 'country', 'time', 'population2'],
      datapoints: [
        {properties: {population: '123'}, measure: 'C1', dimensions: ['E2', 'E3']},
        {properties: {population: '234'}, measure: 'C1', dimensions: ['E3', 'E1']},
        {properties: {population: '345'}, measure: 'C1', dimensions: ['E2', 'E4']},
        {properties: {population: '456'}, measure: 'C1', dimensions: ['E1', 'E4']},
        {properties: {population: '567'}, measure: 'C1', dimensions: ['E5', 'E1']},
        {properties: {population: '678'}, measure: 'C1', dimensions: ['E5', 'E2']},

        {properties: {population2: '456'}, measure: 'C5', dimensions: ['E1', 'E4']},
        {properties: {population2: '567'}, measure: 'C5', dimensions: ['E5', 'E1']},
        {properties: {population2: '234'}, measure: 'C5', dimensions: ['E3', 'E1']},
        {properties: {population2: '345'}, measure: 'C5', dimensions: ['E2', 'E4']},
        {properties: {population2: '678'}, measure: 'C5', dimensions: ['E6', 'E2']},
        {properties: {population2: '678'}, measure: 'C5', dimensions: ['E6', 'E1']},
      ],
      query: {
        order_by: [{"country": "asc"}, {"time": "desc"}]
      }
    };
    const expectedData = {
      dataset: data.datasetName,
      version: data.datasetVersionCommit,
      headers: data.headers,
      rows: [
        [null, 'ukraine', '2100', 678],
        [123, 'ukraine', '2000', null],
        [678, 'ukraine', '1900', null],
        [345, 'ukraine', '1800', 345],
        [null, 'usa', '2100', 678],
        [234, 'usa', '2000', 234],
        [567, 'usa', '1900', 567],
        [456, 'usa', '1800', 456]
      ]
    };

    return mapDatapoints(data).toCallback((error, result) => {
      expect(result).to.be.deep.equal(expectedData);
      return done();
    });
  }));

  it('should invoke map a few datapoints by format-ws processor with translations', sinon.test(function (done) {
    const data = {
      concepts: [
        {gid:'population', originId: 'C1'},
        {gid:'time', originId: 'C2'},
        {gid:'geo', originId: 'C3'},
        {gid:'country', domain: 'C3', originId: 'C4'},
        {gid:'population2', originId: 'C5'},
        {gid: 'name', originId: 'C6'}
      ],
      entities: [
        {gid: 'usa', originId: 'E1', domain: 'C3', sets: ['C4']},
        {gid: 'ukraine', originId: 'E2', domain: 'C3', sets: ['C4']},
        {gid: '2000', originId: 'E3', domain: 'C2', sets: []},
        {gid: '1800', originId: 'E4', domain: 'C2', sets: []},
        {gid: '1900', originId: 'E5', domain: 'C2', sets: []},
        {gid: '2100', originId: 'E6', domain: 'C2', sets: []}
      ],
      datasetName: 'DatasetName',
      language: 'nl-nl',
      datasetVersionCommit: 'Version',
      headers: ['population', 'country', 'time', 'name'],
      datapoints: [
        {properties: {population: '123'}, measure: 'C1', dimensions: ['E2', 'E3']},
        {properties: {population: '234'}, measure: 'C1', dimensions: ['E3', 'E1']},
        {properties: {population: '345'}, measure: 'C1', dimensions: ['E2', 'E4']},
        {properties: {population: '456'}, measure: 'C1', dimensions: ['E1', 'E4']},
        {properties: {population: '567'}, measure: 'C1', dimensions: ['E5', 'E1']},
        {properties: {population: '678'}, measure: 'C1', dimensions: ['E5', 'E2']},

        {properties: {name: 'Population'}, measure: 'C6', dimensions: ['E2', 'E3'], languages: {'nl-nl': {name: 'Bevolking'}}},
        {properties: {name: 'Population'}, measure: 'C6', dimensions: ['E3', 'E1'], languages: {'nl-nl': {name: 'Bevolking'}}},
        {properties: {name: 'Dimensions'}, measure: 'C6', dimensions: ['E2', 'E4'], languages: {'nl-nl': {name: 'Dimensies'}}},
        {properties: {name: null}, measure: 'C6', dimensions: ['E1', 'E4']},
      ],
      query: {}
    };

    const expectedData = {
      dataset: data.datasetName,
      version: data.datasetVersionCommit,
      headers: data.headers,
      rows: [
        [123, 'ukraine', '2000', 'Bevolking'],
        [234, 'usa', '2000', 'Bevolking'],
        [345, 'ukraine', '1800', 'Dimensies'],
        [456, 'usa', '1800', null],
        [567, 'usa', '1900', null],
        [678, 'ukraine', '1900', null],
      ],
      language: 'nl-nl'
    };

    return mapDatapoints(data).toCallback((error, result) => {
      expect(result).to.be.deep.equal(expectedData);
      return done();
    });
  }));
});
