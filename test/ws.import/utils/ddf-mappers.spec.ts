import { expect } from 'chai';
import * as ddfMappers from '../../../ws.import/utils/ddf-mappers';
import '../../../ws.repository';
import { constants } from '../../../ws.utils/constants';

describe('DDF mappers', () => {
  it('transforms concept properties', () => {
    const properties = {
      valueUndefined: undefined,
      valueEmpty: '',
      valueNumber: 12,
      valueString: 'Boo!',
      valueJsonLikeThatWillNotBeTouched: '{"hello": "world!"}',
      color: '["aaa", "bbb", "ccc"]',
      scales: '{"bla": "bla"}',
      drill_up: '[{"parent": ["geo"]}]',
      valueObject: {
        foo: 'bar'
      }
    };

    const expectedProperties = {
      valueUndefined: null,
      valueEmpty: null,
      valueNumber: '12',
      valueString: 'Boo!',
      valueJsonLikeThatWillNotBeTouched: '{"hello": "world!"}',
      color: ['aaa', 'bbb', 'ccc'],
      scales: { bla: 'bla' },
      drill_up: [{ parent: ['geo'] }],
      valueObject: {
        foo: 'bar'
      }
    };

    const actualProperties = ddfMappers.transformConceptProperties(properties);

    expect(actualProperties).to.deep.equal(expectedProperties);
  });

  it('transforms entities properties: undefined input', () => {
    const actualProperties = ddfMappers.transformConceptProperties(undefined);
    expect(actualProperties).to.deep.equal({});
  });

  it('transforms entities properties: undefined input', () => {
    const actualProperties = ddfMappers.transformEntityProperties(undefined, {});
    expect(actualProperties).to.deep.equal({});
  });

  it('transforms entities properties: undefined input', () => {
    const concepts = {
      bla: {
        type: 'measure'
      },
      pop: {
        type: 'measure'
      }
    };
    const properties = {
      trueBoolValue: 'TRUE',
      falseBoolValue: 'FALSE',
      trueBoolValueLowercase: 'true',
      boolValue: true,
      bla: '42',
      foo: 7,
      prop: '9',
      bar: 'Hello',
      baz: 'World',
      nullValue: null,
      pop: 'hundreds'
    };

    const expectedProperties = {
      trueBoolValue: true,
      falseBoolValue: false,
      trueBoolValueLowercase: 'true',
      boolValue: true,
      bla: 42,
      foo: '7',
      prop: '9',
      bar: 'Hello',
      baz: 'World',
      nullValue: 'null',
      pop: 'hundreds'
    };

    const actualProperties = ddfMappers.transformEntityProperties(properties, concepts);
    expect(actualProperties).to.deep.equal(expectedProperties);
  });

  it('maps Ddf datapoint to WS model', () => {
    const entry = {
      geo: 'usa',
      year: '1942',
      pop: 100500,
      income: '200'
    };
    const context = {
      version: 1111111,
      datasetId: 'dsId',
      filename: 'datapoints.csv',
      dimensionsConcepts: ['countryOriginId', 'geoOriginId', 'yearOriginId'],
      concepts: {
        geo: {
          originId: 'geoOriginId'
        },
        year: {
          originId: 'yearOriginId'
        }
      },
      entities: {
        bySet: {},
        byDomain: {
          'usa-geoOriginId': {
            gid: 'usa',
            originId: 'usaOriginId'
          },
          '1942-yearOriginId': {
            gid: '1942',
            originId: '1942OriginId',
            parsedProperties: {
              year: {
                millis: 123,
                timeType: 'YEAR_TYPE'
              }
            }
          }
        },
        byGid: {},
        foundInDatapointsByGid: {}
      },
      dimensions: {
        geo: {},
        year: {}
      },
      measures: {
        pop: {
          originId: 'popOriginId'
        },
        income: {
          originId: 'incomeOriginId'
        }
      }
    };

    const expectedDatapoint = [
      {
        dataset: 'dsId',
        dimensions: [
          'usaOriginId',
          '1942OriginId'
        ],
        dimensionsConcepts: [
          'countryOriginId',
          'geoOriginId',
          'yearOriginId'
        ],
        from: 1111111,
        to: constants.MAX_VERSION,
        isNumeric: true,
        languages: {},
        measure: 'popOriginId',
        originId: undefined,
        properties: {
          geo: 'usa',
          income: '200',
          pop: 100500,
          year: '1942'
        },
        time: {
          conceptGid: 'year',
          millis: 123,
          timeType: 'YEAR_TYPE'
        },
        sources: [
          'datapoints.csv'
        ],
        value: 100500
      },
      {
        dataset: 'dsId',
        dimensions: [
          'usaOriginId',
          '1942OriginId'
        ],
        dimensionsConcepts: [
          'countryOriginId',
          'geoOriginId',
          'yearOriginId'
        ],
        from: 1111111,
        to: constants.MAX_VERSION,
        isNumeric: true,
        languages: {},
        measure: 'incomeOriginId',
        originId: undefined,
        properties: {
          geo: 'usa',
          income: '200',
          pop: 100500,
          year: '1942'
        },
        time: {
          conceptGid: 'year',
          millis: 123,
          timeType: 'YEAR_TYPE'
        },
        sources: [
          'datapoints.csv'
        ],
        value: 200
      }
    ];

    const actualDatapoint = ddfMappers.mapDdfDataPointToWsModel(entry, context);
    expect(actualDatapoint).to.deep.equal(expectedDatapoint);
  });

  it('maps Ddf datapoint to WS model: if value declared as numeric and is not numeric in reality - then it will be saved as is', () => {
    const entry = {
      geo: 'usa',
      year: '1942',
      pop: 'Boo!'
    };

    const context = {
      version: 1111111,
      datasetId: 'dsId',
      filename: 'datapoints.csv',
      dimensionsConcepts: ['countryOriginId', 'geoOriginId', 'yearOriginId'],
      concepts: {
        geo: {
          originId: 'geoOriginId'
        },
        year: {
          originId: 'yearOriginId'
        }
      },
      entities: {
        bySet: {},
        byDomain: {
          'usa-geoOriginId': {
            gid: 'usa',
            originId: 'usaOriginId'
          },
          '1942-yearOriginId': {
            gid: '1942',
            originId: '1942OriginId',
            parsedProperties: {
              year: {
                millis: 123,
                timeType: 'YEAR_TYPE'
              }
            }
          }
        },
        byGid: {},
        foundInDatapointsByGid: {}
      },
      dimensions: {
        geo: {},
        year: {}
      },
      measures: {
        pop: {
          originId: 'popOriginId'
        }
      }
    };

    const expectedDatapoint = [
      {
        dataset: 'dsId',
        dimensions: [
          'usaOriginId',
          '1942OriginId'
        ],
        dimensionsConcepts: [
          'countryOriginId',
          'geoOriginId',
          'yearOriginId'
        ],
        from: 1111111,
        to: constants.MAX_VERSION,
        isNumeric: false,
        languages: {},
        measure: 'popOriginId',
        originId: undefined,
        properties: {
          geo: 'usa',
          pop: 'Boo!',
          year: '1942'
        },
        time: {
          conceptGid: 'year',
          millis: 123,
          timeType: 'YEAR_TYPE'
        },
        sources: [
          'datapoints.csv'
        ],
        value: 'Boo!'
      }
    ];

    const actualDatapoint = ddfMappers.mapDdfDataPointToWsModel(entry, context);
    expect(actualDatapoint).to.deep.equal(expectedDatapoint);
  });

  it('maps Ddf datapoint to WS model: dimensions gids are taken from context.entities.bySet', () => {
    const entry = {
      geo: 'usa',
      year: '1942',
      pop: 'Boo!'
    };

    const context = {
      version: 1111111,
      datasetId: 'dsId',
      filename: 'datapoints.csv',
      dimensionsConcepts: ['countryOriginId', 'geoOriginId', 'yearOriginId'],
      concepts: {
        geo: {
          originId: 'geoOriginId'
        },
        year: {
          originId: 'yearOriginId'
        }
      },
      entities: {
        bySet: {
          'usa-geoOriginId': {
            gid: 'usa',
            originId: 'usaOriginId'
          },
          '1942-yearOriginId': {
            gid: '1942',
            originId: '1942OriginId',
            parsedProperties: {
              year: {
                millis: 123,
                timeType: 'YEAR_TYPE'
              }
            }
          }
        },
        byDomain: {},
        byGid: {},
        foundInDatapointsByGid: {}
      },
      dimensions: {
        geo: {},
        year: {}
      },
      measures: {
        pop: {
          originId: 'popOriginId'
        }
      }
    };

    const expectedDatapoint = [
      {
        dataset: 'dsId',
        dimensions: [
          'usaOriginId',
          '1942OriginId'
        ],
        dimensionsConcepts: [
          'countryOriginId',
          'geoOriginId',
          'yearOriginId'
        ],
        from: 1111111,
        to: constants.MAX_VERSION,
        isNumeric: false,
        languages: {},
        measure: 'popOriginId',
        originId: undefined,
        properties: {
          geo: 'usa',
          pop: 'Boo!',
          year: '1942'
        },
        time: {
          conceptGid: 'year',
          millis: 123,
          timeType: 'YEAR_TYPE'
        },
        sources: [
          'datapoints.csv'
        ],
        value: 'Boo!'
      }
    ];

    const actualDatapoint = ddfMappers.mapDdfDataPointToWsModel(entry, context);
    expect(actualDatapoint).to.deep.equal(expectedDatapoint);
  });

  it('maps Ddf datapoint to WS model: dimensions gids are taken from context.entities.byGid', () => {
    const entry = {
      geo: 'usa',
      year: '1942',
      pop: 'Boo!'
    };

    const context = {
      version: 1111111,
      datasetId: 'dsId',
      filename: 'datapoints.csv',
      dimensionsConcepts: ['countryOriginId', 'geoOriginId', 'yearOriginId'],
      concepts: {
        geo: {
          originId: 'geoOriginId'
        },
        year: {
          originId: 'yearOriginId'
        }
      },
      entities: {
        bySet: {},
        byDomain: {},
        byGid: {
          usa: {
            gid: 'usa',
            originId: 'usaOriginId'
          },
          1942: {
            gid: '1942',
            originId: '1942OriginId',
            parsedProperties: {
              year: {
                millis: 123,
                timeType: 'YEAR_TYPE'
              }
            }
          }
        },
        foundInDatapointsByGid: {}
      },
      dimensions: {
        geo: {},
        year: {}
      },
      measures: {
        pop: {
          originId: 'popOriginId'
        }
      }
    };

    const expectedDatapoint = [
      {
        dataset: 'dsId',
        dimensions: [
          'usaOriginId',
          '1942OriginId'
        ],
        dimensionsConcepts: [
          'countryOriginId',
          'geoOriginId',
          'yearOriginId'
        ],
        from: 1111111,
        to: constants.MAX_VERSION,
        isNumeric: false,
        languages: {},
        measure: 'popOriginId',
        originId: undefined,
        properties: {
          geo: 'usa',
          pop: 'Boo!',
          year: '1942'
        },
        time: {
          conceptGid: 'year',
          millis: 123,
          timeType: 'YEAR_TYPE'
        },
        sources: [
          'datapoints.csv'
        ],
        value: 'Boo!'
      }
    ];

    const actualDatapoint = ddfMappers.mapDdfDataPointToWsModel(entry, context);
    expect(actualDatapoint).to.deep.equal(expectedDatapoint);
  });

  it('maps Ddf datapoint to WS model: dimensions gids are taken from context.entities.foundInDatapointsByGid', () => {
    const entry = {
      geo: 'usa',
      year: '1942',
      pop: 'Boo!'
    };

    const context = {
      version: 1111111,
      datasetId: 'dsId',
      filename: 'datapoints.csv',
      dimensionsConcepts: ['countryOriginId', 'geoOriginId', 'yearOriginId'],
      concepts: {
        geo: {
          originId: 'geoOriginId'
        },
        year: {
          originId: 'yearOriginId'
        }
      },
      entities: {
        bySet: {},
        byDomain: {},
        byGid: {
          usa: {
            gid: 'usa',
            originId: 'usaOriginId'
          }
        },
        foundInDatapointsByGid: {
          1942: {
            gid: '1942',
            originId: '1942OriginId',
            parsedProperties: {
              year: {
                millis: 123,
                timeType: 'YEAR_TYPE'
              }
            }
          }
        }
      },
      dimensions: {
        geo: {},
        year: {}
      },
      measures: {
        pop: {
          originId: 'popOriginId'
        }
      }
    };

    const expectedDatapoint = [
      {
        dataset: 'dsId',
        dimensions: [
          'usaOriginId',
          '1942OriginId'
        ],
        dimensionsConcepts: [
          'countryOriginId',
          'geoOriginId',
          'yearOriginId'
        ],
        from: 1111111,
        to: constants.MAX_VERSION,
        isNumeric: false,
        languages: {},
        measure: 'popOriginId',
        originId: undefined,
        properties: {
          geo: 'usa',
          pop: 'Boo!',
          year: '1942'
        },
        time: {
          conceptGid: 'year',
          millis: 123,
          timeType: 'YEAR_TYPE'
        },
        sources: [
          'datapoints.csv'
        ],
        value: 'Boo!'
      }
    ];

    const actualDatapoint = ddfMappers.mapDdfDataPointToWsModel(entry, context);
    expect(actualDatapoint).to.deep.equal(expectedDatapoint);
  });
});
