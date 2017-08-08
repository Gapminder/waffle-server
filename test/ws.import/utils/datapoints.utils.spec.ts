import { expect } from 'chai';
import * as hi from 'highland';

import * as _ from 'lodash';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import * as datapointsUtils from '../../../ws.import/utils/datapoints.utils';
import * as ddfMappers from '../../../ws.import/utils/ddf-mappers';
import '../../../ws.repository';
import { DatapointsRepositoryFactory } from '../../../ws.repository/ddf/data-points/data-points.repository';
import { EntitiesRepositoryFactory } from '../../../ws.repository/ddf/entities/entities.repository';
import { constants } from '../../../ws.utils/constants';

const sandbox = sinonTest.configureTest(sinon);

const externalContext = {
  dataset: {
    _id: 'datasetId'
  },
  transaction: {
    createdAt: 1484065322122
  },
  concepts: {},
  timeConcepts: {}
};

const threeDimensionsContext = {
  segregatedEntities: {
    entities: {
      1925: {},
      1926: {},
      gapminder: {},
      some_value_of_another_dim: {}
    }
  },
  dimensions: {
    anno: {
      type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
      originId: 'annoOriginId'
    },
    domainOfCompany: {
      type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
      originId: 'domainOfCompanyOriginId'
    },
    company: {
      type: constants.CONCEPT_TYPE_ENTITY_SET,
      originId: 'companyOriginId',
      domain: {
        originId: 'domainOfCompanyOriginId'
      }
    },
    anotherDimDomain: {
      type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
      originId: 'another_dimDomainOriginId'
    },
    anotherDim: {
      type: constants.CONCEPT_TYPE_ENTITY_SET,
      originId: 'anotherDimOriginId',
      domain: {
        originId: 'another_dimDomainOriginId'
      }
    }
  },
  measures: {
    lines_of_code: {
      originId: 'lines_of_codeOriginId'
    }
  },
  filename: 'datapoints1.csv'
};

const twoDimensionsContext = {
  segregatedEntities: {
    entities: {
      1925: {},
      1926: {},
      gapminder: {},
      some_value_of_another_dim: {}
    }
  },
  dimensions: {
    anno: {
      originId: 'annoOriginId'
    },
    company: {
      originId: 'companyOriginId',
      domain: 'domainOfCompanyOriginId'
    }
  },
  measures: {
    lines_of_code: {
      originId: 'lines_of_codeOriginId'
    }
  },
  filename: 'datapoints2.csv'
};

const datapoint1 = {
  datapoint: {
    anno: 1905,
    company: 'gapminder',
    another_dim: 'some_value_of_another_dim'
  },
  context: threeDimensionsContext
};

const datapoint2 = {
  datapoint: {
    anno: 1912,
    company: 'gapminder',
    anotherDim: 'some_value_of_another_dim'
  },
  context: threeDimensionsContext
};

const datapoint3 = {
  datapoint: {
    anno: 1926,
    company: 'gapminder'
  },
  context: twoDimensionsContext
};

const datapointsWithFoundEntities = [
  datapoint1,
  datapoint2,
  datapoint3,
  null
];

describe('Datapoints Utils', () => {
  it('it should save datapoints and entities found in them', sandbox(function (done: Function) {
    const entitiesFoundInDatapoints = {
      1912: {},
      1905: {}
    };

    const expectedMappingContext1 = {
      measures: threeDimensionsContext.measures,
      filename: threeDimensionsContext.filename,
      dimensions: threeDimensionsContext.dimensions,
      dimensionsConcepts: ['annoOriginId', 'domainOfCompanyOriginId', 'companyOriginId', 'another_dimDomainOriginId', 'anotherDimOriginId'],
      entities: {
        entities: threeDimensionsContext.segregatedEntities.entities,
        foundInDatapointsByGid: entitiesFoundInDatapoints
      },
      datasetId: externalContext.dataset._id,
      version: externalContext.transaction.createdAt,
      concepts: externalContext.concepts
    };

    const expectedMappingContext2 = {
      measures: twoDimensionsContext.measures,
      filename: twoDimensionsContext.filename,
      dimensions: twoDimensionsContext.dimensions,
      dimensionsConcepts: ['annoOriginId', 'domainOfCompanyOriginId', 'companyOriginId'],
      entities: {
        entities: twoDimensionsContext.segregatedEntities.entities,
        foundInDatapointsByGid: entitiesFoundInDatapoints
      },
      datasetId: externalContext.dataset._id,
      version: externalContext.transaction.createdAt,
      concepts: externalContext.concepts
    };

    const datapointsWithFoundEntitiesStream = hi(datapointsWithFoundEntities);

    const wsDatapoints = [{}];

    const mapDdfDataPointToWsModelStub = this.stub(ddfMappers, 'mapDdfDataPointToWsModel').returns(wsDatapoints);

    const datapointsCreateStub = this.spy();
    this.stub(DatapointsRepositoryFactory, 'versionAgnostic').callsFake(() => ({ create: datapointsCreateStub }));

    const saveEntitiesFoundInDatapoints = this.stub().returns(Promise.resolve(entitiesFoundInDatapoints));

    datapointsUtils.saveDatapointsAndEntitiesFoundInThem(saveEntitiesFoundInDatapoints, externalContext, datapointsWithFoundEntitiesStream).done(() => {
      sinon.assert.calledTwice(datapointsCreateStub);
      sinon.assert.calledWith(datapointsCreateStub, wsDatapoints);

      sinon.assert.calledThrice(mapDdfDataPointToWsModelStub);

      sinon.assert.calledWith(mapDdfDataPointToWsModelStub, datapointsWithFoundEntities[0].datapoint, expectedMappingContext1);
      sinon.assert.calledWith(mapDdfDataPointToWsModelStub, datapointsWithFoundEntities[1].datapoint, expectedMappingContext1);
      sinon.assert.calledWith(mapDdfDataPointToWsModelStub, datapointsWithFoundEntities[2].datapoint, expectedMappingContext2);

      done();
    });
  }));

  it('should extract dimensions and measures from datapackage resource', function () {
    const externalContext = {
      previousConcepts: {},
      concepts: {
        lines_of_code: {
          originId: 'lines_of_code'
        },
        anno: {
          originId: 'anno'
        },
        company: {
          originId: 'company'
        },
        fakeConcept: {
          originId: 'fakeConcept'
        }
      }
    };

    const resource = {
      indicators: ['lines_of_code'],
      dimensions: ['anno', 'company']
    };

    const { measures, dimensions } = datapointsUtils.getDimensionsAndMeasures(resource, externalContext);

    expect(measures).to.deep.equal({ lines_of_code: externalContext.concepts.lines_of_code });
    expect(dimensions).to.deep.equal({
      anno: externalContext.concepts.anno,
      company: externalContext.concepts.company
    });
  });

  it('should extract dimensions and measures from datapackage resource: anno taken from previous concepts', function () {
    const externalContext = {
      previousConcepts: {
        anno: {
          originId: 'anno'
        },
        company: {
          originId: 'previousCompany'
        }
      },
      concepts: {
        lines_of_code: {
          originId: 'lines_of_code'
        },
        company: {
          originId: 'company'
        }
      }
    };

    const resource = {
      indicators: ['lines_of_code'],
      dimensions: ['anno', 'company']
    };

    const { measures, dimensions } = datapointsUtils.getDimensionsAndMeasures(resource, externalContext);

    expect(measures).to.deep.equal({ lines_of_code: externalContext.concepts.lines_of_code });
    expect(dimensions).to.deep.equal({
      anno: externalContext.previousConcepts.anno,
      company: externalContext.concepts.company
    });
  });

  it('should throw an error if measures were not found', function () {
    const externalContext = {
      previousConcepts: {},
      concepts: {
        anno: {
          originId: 'anno'
        },
        company: {
          originId: 'previousCompany'
        }
      }
    };

    const resource = {
      path: 'file.txt',
      indicators: ['lines_of_code'],
      dimensions: ['anno', 'company']
    };

    const error: any = _.attempt(datapointsUtils.getDimensionsAndMeasures, resource, externalContext);
    expect(error.message).to.equal(`Measures were not found for indicators: ${resource.indicators} from resource ${resource.path}`);
  });

  it('should throw an error if dimensions were not found', function () {
    const externalContext = {
      previousConcepts: {},
      concepts: {
        lines_of_code: {
          originId: 'lines_of_code'
        }
      }
    };

    const resource = {
      path: 'file.txt',
      indicators: ['lines_of_code'],
      dimensions: ['anno', 'company']
    };

    const error: any = _.attempt(datapointsUtils.getDimensionsAndMeasures, resource, externalContext);
    expect(error.message).to.equal(`Dimensions were not found for dimensions: ${resource.dimensions} from resource ${resource.path}`);
  });

  it('should find all entities', sandbox(function () {
    const thenSegregateEntitiesStub = this.spy();

    const findAllStub = this.stub().returns({ then: thenSegregateEntitiesStub });
    const latestVersionStub = this.stub(EntitiesRepositoryFactory, 'latestVersion').callsFake(() => {
      return {
        findAll: findAllStub
      };
    });

    datapointsUtils.findAllEntities(externalContext);

    sinon.assert.calledOnce(latestVersionStub);
    sinon.assert.calledWith(latestVersionStub, externalContext.dataset._id, externalContext.transaction.createdAt);

    sinon.assert.calledOnce(findAllStub);

    sinon.assert.calledOnce(thenSegregateEntitiesStub);
    sinon.assert.calledWith(thenSegregateEntitiesStub, datapointsUtils.segregateEntities);
  }));

  it('should find all previous entities', sandbox(function () {
    const thenSegregateEntitiesStub = this.spy();

    const findAllStub = this.stub().returns({ then: thenSegregateEntitiesStub });
    const currentVersionStub = this.stub(EntitiesRepositoryFactory, 'currentVersion').callsFake(() => {
      return {
        findAll: findAllStub
      };
    });

    const externalContext = {
      dataset: {
        _id: 'datasetId'
      },
      previousTransaction: {
        createdAt: 1484065322122
      }
    };

    datapointsUtils.findAllPreviousEntities(externalContext);

    sinon.assert.calledOnce(currentVersionStub);
    sinon.assert.calledWith(currentVersionStub, externalContext.dataset._id, externalContext.previousTransaction.createdAt);

    sinon.assert.calledOnce(findAllStub);

    sinon.assert.calledOnce(thenSegregateEntitiesStub);
    sinon.assert.calledWith(thenSegregateEntitiesStub, datapointsUtils.segregateEntities);
  }));

  it('should get dimensions as entity origin ids', function (): void {
    const datapoint = {
      anno: 1905,
      company: 'gapminder',
      anotherDim: 'some_value_of_another_dim'
    };

    const context = {
      dimensions: _.extend({ not_existing_dimension: {} }, threeDimensionsContext.dimensions),
      timeConcepts: {anno: {gid: 'anno', originId: 'annoOriginId'}},
      segregatedEntities: {
        groupedByGid: {
          1905: [{
            parsedProperties: {
              anno: {
                millis: -2051229600000,
                timeType: 'YEAR_TYPE'
              }
            },
            domain: 'anno',
            originId: '1905OriginId'
          }],
          gapminder: [{
            domain: 'domainOfCompanyOriginId',
            sets: ['companyOriginId'],
            originId: 'gapminderOriginId'
          }]
        }
      },
      segregatedPreviousEntities: {
        groupedByGid: {
          some_value_of_another_dim: [{
            domain: 'another_dimDomainOriginId',
            sets: ['anotherDimOriginId'],
            originId: 'some_value_of_another_dimOriginId'
          }]
        }
      }
    };

    const { dimensionsEntityOriginIds: dimensionsAsOriginIds, timeDimension } = datapointsUtils.getDimensionsAsEntityOriginIds(datapoint, context);

    expect(_.sortBy(dimensionsAsOriginIds)).to.deep.equal(_.sortBy(['some_value_of_another_dimOriginId', 'gapminderOriginId']));
    expect(timeDimension).to.deep.equal({
      'time.conceptGid': 'anno',
      'time.millis': -2051229600000,
      'time.timeType': 'YEAR_TYPE'
    });
  });

  it('should segregate entities: on empty entities - empty result', () => {
    const segregatedEntities = datapointsUtils.segregateEntities([]);
    expect(segregatedEntities).to.deep.equal({ bySet: {}, byDomain: {}, byGid: {}, groupedByGid: {} });
  });

  it('should segregate entities', () => {

    const gapminderEntity = {
      gid: 'gapminder',
      domain: {
        originId: 'companyDomainOriginId'
      }
    };

    const entity12 = {
      gid: '12',
      sets: [
        { originId: 'ageEntitySet1' },
        { originId: 'ageEntitySet2' }
      ]
    };

    const usaEntity = {
      gid: 'usa',
      domain: 'countryDomainOriginId'
    };

    const wsEntity = {
      gid: 'ws',
      sets: ['projectEntitySet1', 'projectEntitySet2']
    };

    const ws2Entity = {
      gid: 'ws',
      sets: ['projectEntitySet3', 'projectEntitySet4']
    };

    const entities = [
      gapminderEntity,
      entity12,
      usaEntity,
      wsEntity,
      ws2Entity
    ];

    const segregatedEntities = datapointsUtils.segregateEntities(entities);
    expect(segregatedEntities).to.deep.equal({
      bySet: {
        '12-ageEntitySet1': entity12,
        'ws-projectEntitySet1': wsEntity,
        'ws-projectEntitySet3': ws2Entity
      },
      byDomain: {
        'gapminder-companyDomainOriginId': gapminderEntity,
        'usa-countryDomainOriginId': usaEntity
      },
      byGid: {
        12: entity12,
        gapminder: gapminderEntity,
        usa: usaEntity,
        ws: ws2Entity
      },
      groupedByGid: {
        12: [entity12],
        gapminder: [gapminderEntity],
        usa: [usaEntity],
        ws: [wsEntity, ws2Entity]
      }
    });
  });

  it('should find entities in datapoint: concept as domain', sandbox(function (): void {
    const context = {
      segregatedEntities: {
        byGid: {
          1925: {gid: '1925'},
          1926: {gid: '1926'},
          gapminder: {gid: 'gapminder'},
          some_value_of_another_dim: {gid: 'some_value_of_another_dim'}
        }
      },
      dimensions: {
        anno: {
          gid: 'anno',
          type: constants.CONCEPT_TYPE_ENTITY_DOMAIN,
          originId: 'annoOriginId'
        },
        company: {
          gid: 'company',
          type: constants.CONCEPT_TYPE_ENTITY_SET,
          originId: 'companyOriginId',
          domain: {
            originId: 'domainOfCompanyOriginId'
          }
        }
      },
      measures: {
        lines_of_code: {
          originId: 'lines_of_codeOriginId'
        }
      },
      filename: 'datapoints2.csv'
    };

    const datapoint = {
      datapoint: {
        anno: 1882,
        company: 'gapminder'
      },
      context
    };

    const stubEntity = {};
    const foundEntityMappperStub = this.stub(ddfMappers, 'mapDdfEntityFoundInDatapointToWsModel').returns(stubEntity);

    const entities = datapointsUtils.findEntitiesInDatapoint(datapoint.datapoint, context, externalContext);

    sinon.assert.calledOnce(foundEntityMappperStub);
    sinon.assert.calledWith(foundEntityMappperStub, datapoint.datapoint, sinon.match({
      version: externalContext.transaction.createdAt,
      datasetId: externalContext.dataset._id,
      timeConcepts: externalContext.timeConcepts,
      domain: { gid: 'anno', originId: 'annoOriginId', type: constants.CONCEPT_TYPE_ENTITY_DOMAIN },
      concept: { gid: 'anno', originId: 'annoOriginId', type: constants.CONCEPT_TYPE_ENTITY_DOMAIN },
      filename: context.filename
    }));
    expect(entities.length).to.equal(1);
    expect(entities[0]).to.equal(stubEntity);
  }));

  it('should find entities in datapoint', sandbox(function (): void {
    const context = {
      segregatedEntities: {
        byGid: {
          1925: {gid: '1925'},
          1926: {gid: '1926'},
          gapminder: {gid: 'gapminder'},
          some_value_of_another_dim: {gid: 'some_value_of_another_dim'}
        }
      },
      dimensions: {
        anno: {
          gid: 'anno',
          domain: 'timeDomainOriginId',
          originId: 'annoOriginId'
        },
        company: {
          gid: 'company',
          type: constants.CONCEPT_TYPE_ENTITY_SET,
          originId: 'companyOriginId',
          domain: 'domainOfCompanyOriginId'
        }
      },
      measures: {
        lines_of_code: {
          originId: 'lines_of_codeOriginId'
        }
      },
      filename: 'datapoints2.csv'
    };

    const datapoint = {
      datapoint: {
        anno: '1882',
        company: 'gapminder'
      },
      context
    };

    const stubEntity = {};
    const foundEntityMapperStub = this.stub(ddfMappers, 'mapDdfEntityFoundInDatapointToWsModel').returns(stubEntity);

    const entities = datapointsUtils.findEntitiesInDatapoint(datapoint.datapoint, context, externalContext);

    sinon.assert.calledOnce(foundEntityMapperStub);
    sinon.assert.calledWith(foundEntityMapperStub, datapoint.datapoint, sinon.match({
      version: externalContext.transaction.createdAt,
      datasetId: externalContext.dataset._id,
      timeConcepts: externalContext.timeConcepts,
      domain: 'timeDomainOriginId',
      concept: { domain: 'timeDomainOriginId', gid: 'anno', originId: 'annoOriginId' },
      filename: context.filename
    }));
    expect(entities.length).to.equal(1);
    expect(entities[0]).to.equal(stubEntity);
  }));

  it('should find entities in datapoint: existed entity should not be found', sandbox(function (): void {
    const context = {
      segregatedEntities: {
        byGid: {
          1925: {gid: '1925'},
          1926: {gid: '1926'},
          gapminder: {gid: 'gapminder'},
          some_value_of_another_dim: {gid: 'some_value_of_another_dim'}
        }
      },
      dimensions: {
        anno: {
          gid: 'anno',
          domain: 'timeDomainOriginId',
          originId: 'annoOriginId'
        },
        company: {
          gid: 'company',
          type: constants.CONCEPT_TYPE_ENTITY_SET,
          originId: 'companyOriginId',
          domain: 'domainOfCompanyOriginId'
        }
      },
      measures: {
        lines_of_code: {
          gid: 'lines_of_code',
          originId: 'lines_of_codeOriginId'
        }
      },
      filename: 'datapoints2.csv'
    };

    const datapoint = {
      datapoint: {
        anno: '1926',
        company: 'gapminder'
      },
      context
    };

    const foundEntityMappperStub = this.stub(ddfMappers, 'mapDdfEntityFoundInDatapointToWsModel');

    const entities = datapointsUtils.findEntitiesInDatapoint(datapoint.datapoint, context, externalContext);

    sinon.assert.notCalled(foundEntityMappperStub);
    expect(entities.length).to.equal(0);
  }));

  it('should create entities found in datapoints and cache already created ones', sandbox(function () {
    const entities = [
      {
        gid: '1882'
      },
      {
        gid: '1883'
      },
      {
        gid: '1884'
      }
    ];

    const entitiesByGid = _.keyBy(entities, 'gid');

    const createStub = this.stub().returns(Promise.resolve(_.map(entities, (entity) => ({ toObject: () => entity }))));

    this.stub(EntitiesRepositoryFactory, 'versionAgnostic').callsFake(() => {
      return {
        create: createStub
      };
    });

    const createEntitiesWithCache = datapointsUtils.createEntitiesFoundInDatapointsSaverWithCache(externalContext);

    const createdEntities = createEntitiesWithCache(entities);

    createdEntities.then((created) => expect(created).to.deep.equal(entitiesByGid));
    sinon.assert.calledOnce(createStub);
    sinon.assert.calledWith(createStub, entities);

    createStub.reset();

    const createdEntitiesFromCache = createEntitiesWithCache(entities);

    createdEntitiesFromCache.then((created) => expect(created).to.deep.equal(entitiesByGid));
    sinon.assert.notCalled(createStub);
  }));
});
