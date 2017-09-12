import {expect} from 'chai';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import '../../../../ws.repository';
import {
  mapConcepts,
  mapDatapoints,
  mapEntities,
  mapSchema
} from '../../../../ws.routes/data-post-processors/format/format-ws.processor';

import * as commonService from '../../../../ws.services/common.service';

const sandbox = sinonTest.configureTest(sinon);

describe('Format WS Processor', () => {
  describe('Datapoints formatting', () => {
    it('should invoke map an empty array of datapoints by format-ws processor', sandbox(function (done: Function) {
      const data = {
        timeConcepts: {},
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

    it('should invoke mapping a few datapoints by format-ws processor', sandbox(function (done: Function): void {
      const data = {
        timeConcepts: {
          time: {gid: 'time', originId: 'C2'}
        },
        concepts: [
          {gid: 'population', originId: 'C1'},
          {gid: 'time', originId: 'C2'},
          {gid: 'geo', originId: 'C3'},
          {gid: 'country', domain: 'C3', originId: 'C4'},
          {gid: 'population2', originId: 'C5'}
        ],
        entities: [
          {gid: 'usa', originId: 'E1', domain: 'C3', sets: ['C4']},
          {gid: 'ukraine', originId: 'E2', domain: 'C3', sets: ['C4']},
          {gid: '2000', parsedProperties: {time: {millis: 946684800000, timeType: 'YEAR_TYPE'}}, originId: 'E3', domain: 'C2', sets: []},
          {gid: '1800', parsedProperties: {time: {millis: -5364662400000, timeType: 'YEAR_TYPE'}}, originId: 'E4', domain: 'C2', sets: []},
          {gid: '1900', parsedProperties: {time: {millis: -2208988800000, timeType: 'YEAR_TYPE'}}, originId: 'E5', domain: 'C2', sets: []},
          {gid: '2100', parsedProperties: {time: {millis: 4102444800000, timeType: 'YEAR_TYPE'}}, originId: 'E6', domain: 'C2', sets: []}
        ],
        datasetName: 'DatasetName',
        datasetVersionCommit: 'Version',
        headers: ['population', 'country', 'time', 'population2'],
        datapoints: [
          {indicators: [{properties: {population: '123'}, measure: 'C1'}], _id: {dimensions: ['E2'], time: {millis: 946684800000, timeType: 'YEAR_TYPE'}}},
          {indicators: [{properties: {population: '234'}, measure: 'C1'}, {properties: {population2: '234'}, measure: 'C5'}], _id: {dimensions: ['E1'], time: {millis: 946684800000, timeType: 'YEAR_TYPE'}}},
          {indicators: [{properties: {population: '345'}, measure: 'C1'}, {properties: {population2: '345'}, measure: 'C5'}], _id: {dimensions: ['E2'], time: {millis: -5364662400000, timeType: 'YEAR_TYPE'}}},
          {indicators: [{properties: {population: '456'}, measure: 'C1'}, {properties: {population2: '456'}, measure: 'C5'}], _id: {dimensions: ['E1'], time: {millis: -5364662400000, timeType: 'YEAR_TYPE'}}},
          {indicators: [{properties: {population2: '567'}, measure: 'C5'}, {properties: {population: '567'}, measure: 'C1'}], _id: {dimensions: ['E1'], time: {millis: -2208988800000, timeType: 'YEAR_TYPE'}}},
          {indicators: [{properties: {population: '678'}, measure: 'C1'}], _id: {dimensions: ['E2'], time: {millis: -2208988800000, timeType: 'YEAR_TYPE'}}},
          {indicators: [{properties: {population2: '678'}, measure: 'C5'}], _id: {dimensions: ['E2'], time: {millis: 4102444800000, timeType: 'YEAR_TYPE'}}},
          {indicators: [{properties: {population2: '678'}, measure: 'C5'}], _id: {dimensions: ['E1'], time: {millis: 4102444800000, timeType: 'YEAR_TYPE'}}}
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
          [null, 'usa', '2100', 678]
        ]
      };

      return mapDatapoints(data).toCallback((error, result) => {
        expect(error).to.not.exist;
        expect(result).to.be.deep.equal(expectedData);
        return done();
      });
    }));

    it('should invoke map a few datapoints by format-ws processor with ordering', sandbox(function (done: Function) {
      const data = {
        timeConcepts: {
          time: {gid: 'time', originId: 'C2'}
        },
        concepts: [
          {gid: 'population', originId: 'C1'},
          {gid: 'time', originId: 'C2'},
          {gid: 'geo', originId: 'C3'},
          {gid: 'country', domain: 'C3', originId: 'C4'},
          {gid: 'population2', originId: 'C5'}
        ],
        entities: [
          {gid: 'usa', originId: 'E1', domain: 'C3', sets: ['C4']},
          {gid: 'ukraine', originId: 'E2', domain: 'C3', sets: ['C4']},
          {gid: '2000', parsedProperties: {time: {millis: 946684800000, timeType: 'YEAR_TYPE'}}, originId: 'E3', domain: 'C2', sets: []},
          {gid: '1800', parsedProperties: {time: {millis: -5364662400000, timeType: 'YEAR_TYPE'}}, originId: 'E4', domain: 'C2', sets: []},
          {gid: '1900', parsedProperties: {time: {millis: -2208988800000, timeType: 'YEAR_TYPE'}}, originId: 'E5', domain: 'C2', sets: []},
          {gid: '2100', parsedProperties: {time: {millis: 4102444800000, timeType: 'YEAR_TYPE'}}, originId: 'E6', domain: 'C2', sets: []}
        ],
        datasetName: 'DatasetName',
        datasetVersionCommit: 'Version',
        headers: ['population', 'country', 'time', 'population2'],
        datapoints: [
          {indicators: [{properties: {population: '123'}, measure: 'C1'}], _id: {dimensions: ['E2'], time: {millis: 946684800000, timeType: 'YEAR_TYPE'}}},
          {indicators: [{properties: {population2: '234'}, measure: 'C5'}, {properties: {population: '234'}, measure: 'C1'}], _id: {dimensions: ['E1'], time: {millis: 946684800000, timeType: 'YEAR_TYPE'}}},
          {indicators: [{properties: {population2: '345'}, measure: 'C5'}, {properties: {population: '345'}, measure: 'C1'}], _id: {dimensions: ['E2'], time: {millis: -5364662400000, timeType: 'YEAR_TYPE'}}},
          {indicators: [{properties: {population2: '456'}, measure: 'C5'}, {properties: {population: '456'}, measure: 'C1'}], _id: {dimensions: ['E1'], time: {millis: -5364662400000, timeType: 'YEAR_TYPE'}}},
          {indicators: [{properties: {population: '567'}, measure: 'C1'}, {properties: {population2: '567'}, measure: 'C5'}], _id: {dimensions: ['E1'], time: {millis: -2208988800000, timeType: 'YEAR_TYPE'}}},
          {indicators: [{properties: {population: '678'}, measure: 'C1'}], _id: {dimensions: ['E2'], time: {millis: -2208988800000, timeType: 'YEAR_TYPE'}}},
          {indicators: [{properties: {population2: '678'}, measure: 'C5'}], _id: {dimensions: ['E2'], time: {millis: 4102444800000, timeType: 'YEAR_TYPE'}}},
          {indicators: [{properties: {population2: '678'}, measure: 'C5'}], _id: {dimensions: ['E1'], time: {millis: 4102444800000, timeType: 'YEAR_TYPE'}}}
        ],
        query: {
          order_by: [{country: 'asc'}, {time: 'desc'}]
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

    it('should invoke map a few datapoints by format-ws processor with translations', sandbox(function (done: Function) {
      const data = {
        timeConcepts: {
          time: {gid: 'time', originId: 'C2'}
        },
        concepts: [
          {gid: 'population', originId: 'C1'},
          {gid: 'time', originId: 'C2'},
          {gid: 'geo', originId: 'C3'},
          {gid: 'country', domain: 'C3', originId: 'C4'},
          {gid: 'population2', originId: 'C5'},
          {gid: 'name', originId: 'C6'}
        ],
        entities: [
          {gid: 'usa', originId: 'E1', domain: 'C3', sets: ['C4']},
          {gid: 'ukraine', originId: 'E2', domain: 'C3', sets: ['C4']},
          {gid: '2000', parsedProperties: {time: {millis: 946684800000, timeType: 'YEAR_TYPE'}}, originId: 'E3', domain: 'C2', sets: []},
          {gid: '1800', parsedProperties: {time: {millis: -5364662400000, timeType: 'YEAR_TYPE'}}, originId: 'E4', domain: 'C2', sets: []},
          {gid: '1900', parsedProperties: {time: {millis: -2208988800000, timeType: 'YEAR_TYPE'}}, originId: 'E5', domain: 'C2', sets: []},
          {gid: '2100', parsedProperties: {time: {millis: 4102444800000, timeType: 'YEAR_TYPE'}}, originId: 'E6', domain: 'C2', sets: []}
        ],
        datasetName: 'DatasetName',
        language: 'nl-nl',
        datasetVersionCommit: 'Version',
        headers: ['population', 'country', 'time', 'name'],
        datapoints: [
          {indicators: [{properties: {population: '123'}, measure: 'C1'}, {properties: { name: 'Population' }, measure: 'C6', languages: {'nl-nl': {name: 'Bevolking'}}}], _id: {dimensions: ['E2'], time: {millis: 946684800000, timeType: 'YEAR_TYPE'}}},
          {indicators: [{properties: { name: 'Population' }, measure: 'C6', languages: {'nl-nl': {name: 'Bevolking'}}}, {properties: {population: '234'}, measure: 'C1'}], _id: {dimensions: ['E1'], time: {millis: 946684800000, timeType: 'YEAR_TYPE'}}},
          {indicators: [{properties: {population: '345'}, measure: 'C1'}, {properties: { name: 'Dimensions' }, measure: 'C6', languages: {'nl-nl': {name: 'Dimensies'}}}], _id: {dimensions: ['E2'], time: {millis: -5364662400000, timeType: 'YEAR_TYPE'}}},
          {indicators: [{properties: { name: null }, measure: 'C6'}, {properties: {population: '456'}, measure: 'C1'}], _id: {dimensions: ['E1'], time: {millis: -5364662400000, timeType: 'YEAR_TYPE'}}},
          {indicators: [{properties: {population: '567'}, measure: 'C1'}], _id: {dimensions: ['E1'], time: {millis: -2208988800000, timeType: 'YEAR_TYPE'}}},
          {indicators: [{properties: {population: '678'}, measure: 'C1'}], _id: {dimensions: ['E2'], time: {millis: -2208988800000, timeType: 'YEAR_TYPE'}}}
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
          [678, 'ukraine', '1900', null]
        ],
        language: 'nl-nl'
      };

      return mapDatapoints(data).toCallback((error, result) => {
        expect(result).to.be.deep.equal(expectedData);
        return done();
      });
    }));
  });

  describe('Concepts formatting', () => {
    it('should format concept in WS-JSON: empty input', () => {
      const result = mapConcepts({
        concepts: [],
        headers: [],
        language: '',
        datasetName: '',
        datasetVersionCommit: '',
        query: ''
      });

      expect(result).to.deep.equal({
        dataset: '',
        headers: [],
        rows: [],
        version: ''
      });
    });

    it('should format concept in WS-JSON', sandbox(function (): void {
      const concept1 = {
        gid: 'name',
        properties: {
          url: 'https://...',
          name: 'name',
          description: 'it is a name of the concept'
        }
      };

      const concept2 = {
        gid: 'geo',
        properties: {
          url: 'https://geo...',
          name: 'Geo',
          description: 'anything on Earth'
        }
      };

      const result = mapConcepts({
        concepts: [
          concept1,
          concept2
        ],
        headers: ['name', 'description', 'url'],
        datasetName: '',
        datasetVersionCommit: '',
        query: ''
      });

      const expectedResponse = {
        dataset: '',
        headers: [
          'name',
          'description',
          'url'
        ],
        rows: [
          [
            'name',
            'it is a name of the concept',
            'https://...'
          ],
          [
            'Geo',
            'anything on Earth',
            'https://geo...'
          ]
        ],
        version: ''
      };

      expect(result).to.deep.equal(expectedResponse);
    }));

    it('should format concept in WS-JSON: should translate given concepts according to given lang', sandbox(function (): void {
      const translateDocumentStub = this.stub(commonService, 'translateDocument').callsFake((concept, lang) => {
        return concept.properties;
      });

      const concept1 = {
        gid: 'name',
        properties: {
          url: 'https://...',
          name: 'name',
          description: 'it is a name of the concept'
        }
      };

      const concept2 = {
        gid: 'geo',
        properties: {
          url: 'https://geo...',
          name: 'Geo',
          description: 'anything on Earth'
        }
      };

      const result = mapConcepts({
        concepts: [
          concept1,
          concept2
        ],
        headers: ['name', 'description', 'url'],
        language: 'ar-SA',
        datasetName: '',
        datasetVersionCommit: '',
        query: ''
      });

      const expectedResponse = {
        dataset: '',
        headers: [
          'name',
          'description',
          'url'
        ],
        rows: [
          [
            'name',
            'it is a name of the concept',
            'https://...'
          ],
          [
            'Geo',
            'anything on Earth',
            'https://geo...'
          ]
        ],
        version: '',
        language: 'ar-SA'
      };

      expect(result).to.deep.equal(expectedResponse);
      sinon.assert.calledTwice(translateDocumentStub);
      sinon.assert.calledWith(translateDocumentStub, concept1, 'ar-SA');
      sinon.assert.calledWith(translateDocumentStub, concept2, 'ar-SA');
    }));

    it('should format concept in WS-JSON: response contains dataset and version from which data is gathered', () => {
      const result = mapConcepts({
        concepts: [],
        headers: ['name', 'description', 'url'],
        language: '',
        datasetName: 'bla/bla',
        datasetVersionCommit: 'a1a1a1a1',
        query: ''
      });

      const expectedResponse = {
        dataset: 'bla/bla',
        version: 'a1a1a1a1',
        headers: [
          'name',
          'description',
          'url'
        ],
        rows: []
      };

      expect(result).to.deep.equal(expectedResponse);
    });

    it('should format concept in WS-JSON: response should contain a lang requested', () => {
      const result = mapConcepts({
        concepts: [],
        headers: ['name', 'description', 'url'],
        language: 'ar-SA'
      });

      const expectedResponse = {
        language: 'ar-SA',
        version: undefined,
        dataset: undefined,
        headers: [
          'name',
          'description',
          'url'
        ],
        rows: []
      };

      expect(result).to.deep.equal(expectedResponse);
    });

    it('should format concept in WS-JSON: response should contain a lang requested', () => {
      const result = mapConcepts({
        concepts: [],
        headers: ['name', 'description', 'url'],
        language: 'ar-SA'
      });

      const expectedResponse = {
        language: 'ar-SA',
        version: undefined,
        dataset: undefined,
        headers: [
          'name',
          'description',
          'url'
        ],
        rows: []
      };

      expect(result).to.deep.equal(expectedResponse);
    });

    it('should format concept in WS-JSON: response should have ordered data according to the provided ordering', sandbox(function () {
      const concept1 = {
        gid: 'name',
        properties: {
          url: 'https://...',
          name: 'name',
          description: 'it is a name of the concept'
        }
      };

      const concept2 = {
        gid: 'geo',
        properties: {
          url: 'https://geo...',
          name: 'Geo',
          description: 'anything on Earth'
        }
      };

      const result = mapConcepts({
        concepts: [
          concept1,
          concept2
        ],
        headers: ['name', 'description', 'url'],
        datasetName: '',
        datasetVersionCommit: '',
        query: {
          order_by: [{url: 'desc'}]
        }
      });

      const expectedResponse = {
        dataset: '',
        headers: [
          'name',
          'description',
          'url'
        ],
        rows: [
          [
            'Geo',
            'anything on Earth',
            'https://geo...'
          ],
          [
            'name',
            'it is a name of the concept',
            'https://...'
          ]
        ],
        version: ''
      };

      expect(result).to.deep.equal(expectedResponse);
    }));
  });

  describe('Entities formatting', () => {
    it('should format entities in WS-JSON: empty input', () => {
      const result = mapEntities({
        entities: [],
        headers: [],
        language: '',
        datasetName: '',
        datasetVersionCommit: '',
        query: ''
      });

      expect(result).to.deep.equal({
        dataset: '',
        headers: [],
        rows: [],
        version: ''
      });
    });

    it('should format entities in WS-JSON', () => {
      const result = mapEntities({
        entities: [
          {
            gid: 'ukr',
            properties: {
              world_4region: 'europe',
              country: 'ukr'
            }
          },
          {
            gid: 'dza',
            properties: {
              world_4region: 'africa',
              country: 'dza'
            }
          }
        ],
        headers: ['world_4region', 'country'],
        datasetName: 'bla/bla',
        datasetVersionCommit: '1a1a1a1'
      });

      const expectedResponse = {
        dataset: 'bla/bla',
        version: '1a1a1a1',
        headers: [
          'world_4region',
          'country'
        ],
        rows: [
          [
            'europe',
            'ukr'
          ],
          [
            'africa',
            'dza'
          ]
        ]
      };

      expect(result).to.deep.equal(expectedResponse);
    });

    it('should format entities in WS-JSON: returns all props as the response to empty headers', () => {
      const result = mapEntities({
        entities: [
          {
            gid: 'ukr',
            properties: {
              world_4region: 'europe',
              country: 'ukr'
            }
          },
          {
            gid: 'dza',
            properties: {
              world_4region: 'africa',
              country: 'dza',
              test: 'test'
            }
          }
        ],
        datasetName: 'bla/bla',
        datasetVersionCommit: '1a1a1a1'
      });

      const expectedResponse = {
        dataset: 'bla/bla',
        version: '1a1a1a1',
        headers: [
          'world_4region',
          'country',
          'test'
        ],
        rows: [
          [
            'europe',
            'ukr',
            undefined
          ],
          [
            'africa',
            'dza',
            'test'
          ]
        ]
      };

      expect(result).to.deep.equal(expectedResponse);
    });

    it('should format entities in WS-JSON: entity should be translated', sandbox(function () {
      const translateDocumentStub = this.stub(commonService, 'translateDocument').callsFake((entity, lang) => {
        return entity.properties;
      });

      const ukr = {
        gid: 'ukr',
        properties: {
          world_4region: 'europe',
          country: 'ukr'
        }
      };

      const dza = {
        gid: 'dza',
        properties: {
          world_4region: 'africa',
          country: 'dza'
        }
      };

      const result = mapEntities({
        entities: [ukr, dza],
        headers: ['world_4region', 'country'],
        language: 'ar-SA',
        datasetName: 'bla/bla',
        datasetVersionCommit: '1a1a1a1'
      });

      const expectedResponse = {
        dataset: 'bla/bla',
        version: '1a1a1a1',
        language: 'ar-SA',
        headers: [
          'world_4region',
          'country'
        ],
        rows: [
          [
            'europe',
            'ukr'
          ],
          [
            'africa',
            'dza'
          ]
        ]
      };

      expect(result).to.deep.equal(expectedResponse);
      sinon.assert.calledTwice(translateDocumentStub);
      sinon.assert.calledWith(translateDocumentStub, ukr, 'ar-SA');
      sinon.assert.calledWith(translateDocumentStub, dza, 'ar-SA');
    }));

    it('should format entities in WS-JSON: entity from entity_set is returned for entity_domain request', () => {
      const result = mapEntities({
        entities: [
          {
            gid: 'ukr',
            properties: {
              world_4region: 'europe',
              country: 'ukr'
            }
          },
          {
            gid: 'dza',
            properties: {
              world_4region: 'africa',
              country: 'dza'
            }
          }
        ],
        headers: ['world_4region', 'geo'],
        language: 'ar-SA',
        datasetName: 'bla/bla',
        domainGid: 'geo',
        datasetVersionCommit: '1a1a1a1'
      });

      const expectedResponse = {
        dataset: 'bla/bla',
        version: '1a1a1a1',
        language: 'ar-SA',
        headers: [
          'world_4region',
          'geo'
        ],
        rows: [
          [
            'europe',
            'ukr'
          ],
          [
            'africa',
            'dza'
          ]
        ]
      };

      expect(result).to.deep.equal(expectedResponse);
    });

    it('should format entities in WS-JSON: response should be sorted according to order_by clause', () => {
      const result = mapEntities({
        entities: [
          {
            gid: 'ukr',
            properties: {
              world_4region: 'europe',
              country: 'ukr'
            }
          },
          {
            gid: 'dza',
            properties: {
              world_4region: 'africa',
              country: 'dza'
            }
          }
        ],
        headers: ['world_4region', 'country'],
        datasetName: 'bla/bla',
        datasetVersionCommit: '1a1a1a1',
        query: {
          order_by: [{country: 'asc'}]
        }
      });

      const expectedResponse = {
        dataset: 'bla/bla',
        version: '1a1a1a1',
        headers: [
          'world_4region',
          'country'
        ],
        rows: [
          [
            'africa',
            'dza'
          ],
          [
            'europe',
            'ukr'
          ]
        ]
      };

      expect(result).to.deep.equal(expectedResponse);
    });
  });

  describe('Schema formatting', () => {
    it('should format schema to WS-JSON: empty data', () => {
      const data = {
        datasetName: '',
        datasetVersionCommit: '',
        query: '',
        aliases: {},
        headers: [],
        schema: []
      };

      const expectedResponse = {
        dataset: '',
        headers: [],
        rows: [],
        version: ''
      };

      const response = mapSchema(data);
      expect(response).to.deep.equal(expectedResponse);
    });

    it('should format schema to WS-JSON', () => {
      const data = {
        datasetName: 'bla/bla',
        aliases: {},
        datasetVersionCommit: 'aaaaaaa',
        headers: ['key', 'value'],
        schema: [
          {
            key: ['geo', 'year'],
            value: 'population'
          },
          {
            key: ['geo', 'year', 'age'],
            value: 'population'
          }
        ]
      };

      const expectedResponse = {
        dataset: 'bla/bla',
        version: 'aaaaaaa',
        headers: ['key', 'value'],
        rows: [
          [
            ['geo', 'year'], 'population'
          ],
          [
            ['geo', 'year', 'age'], 'population'
          ]
        ]
      };

      const response = mapSchema(data);
      expect(response).to.deep.equal(expectedResponse);
    });

    it('should format schema to WS-JSON: use aliases', () => {
      const data = {
        datasetName: 'bla/bla',
        aliases: {min: 'min(value)'},
        datasetVersionCommit: 'aaaaaaa',
        headers: ['key', 'value', 'min'],
        schema: [
          {
            key: ['geo', 'year'],
            value: 'population',
            min: 42
          },
          {
            key: ['geo', 'year', 'age'],
            value: 'population',
            min: 100500
          }
        ]
      };

      const expectedResponse = {
        dataset: 'bla/bla',
        version: 'aaaaaaa',
        headers: ['key', 'value', 'min(value)'],
        rows: [
          [
            ['geo', 'year'], 'population', 42
          ],
          [
            ['geo', 'year', 'age'], 'population', 100500
          ]
        ]
      };

      const response = mapSchema(data);
      expect(response).to.deep.equal(expectedResponse);
    });

    it('should format schema to WS-JSON: response is sorted according to query', () => {
      const data = {
        datasetName: 'bla/bla',
        query: {
          order_by: [{'min(value)': 'desc'}]
        },
        aliases: {min: 'min(value)'},
        datasetVersionCommit: 'aaaaaaa',
        headers: ['key', 'value', 'min'],
        schema: [
          {
            key: ['geo', 'year'],
            value: 'population',
            min: 42
          },
          {
            key: ['geo', 'year', 'age'],
            value: 'population',
            min: 100500
          }
        ]
      };

      const expectedResponse = {
        dataset: 'bla/bla',
        version: 'aaaaaaa',
        headers: ['key', 'value', 'min(value)'],
        rows: [
          [
            ['geo', 'year', 'age'], 'population', 100500
          ],
          [
            ['geo', 'year'], 'population', 42
          ]
        ]
      };

      const response = mapSchema(data);
      expect(response).to.deep.equal(expectedResponse);
    });
  });
});
