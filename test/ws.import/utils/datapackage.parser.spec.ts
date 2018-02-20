import * as _ from 'lodash';
import * as fs from 'fs';
import * as sinon from 'sinon';
import { expect } from 'chai';
import * as datapackageParser from '../../../ws.import/utils/datapackage.parser';

const sandbox = sinon.createSandbox();

const entitiesResource = {
  path: 'ddf--entities--company--company_scale.csv',
  name: 'ddf--entities--company--company_scale',
  schema: {
    fields: [
      {
        name: 'company_scale'
      },
      {
        name: 'full_name_changed'
      },
      {
        name: 'is--company_scale'
      }
    ],
    primaryKey: 'company_scale'
  }
};

const conceptsResource = {
  path: 'ddf--concepts.csv',
  name: 'ddf--concepts',
  schema: {
    fields: [
      {
        name: 'concept'
      },
      {
        name: 'concept_type'
      },
      {
        name: 'domain'
      },
      {
        name: 'additional_column'
      }
    ],
    primaryKey: 'concept'
  }
};

const datapointsResource = {
  path: 'ddf--datapoints--lines_of_code--by--company--anno.csv',
  name: 'ddf--datapoints--lines_of_code--by--company--anno',
  schema: {
    fields: [
      {
        name: 'company'
      },
      {
        name: 'anno'
      },
      {
        name: 'lines_of_code'
      }
    ],
    primaryKey: [
      'company',
      'anno'
    ]
  }
};

const datapackageStub = {
  name: 'ddf--ws-testing',
  title: 'ddf--ws-testing',
  description: '',
  version: '0.0.1',
  language: {
    id: 'en',
    name: 'English'
  },
  translations: [
    {
      id: 'nl-nl',
      name: 'nl-nl'
    }
  ],
  license: '',
  author: '',
  resources: [
    conceptsResource,
    {
      path: 'ddf--datapoints--company_scale--by--company--anno.csv',
      name: 'ddf--datapoints--company_scale--by--company--anno',
      schema: {
        fields: [
          {
            name: 'company'
          },
          {
            name: 'anno'
          },
          {
            name: 'company_scale'
          }
        ],
        primaryKey: [
          'company',
          'anno'
        ]
      }
    },
    datapointsResource,
    entitiesResource
  ]
};

describe('Datapackage Parser', () => {

  afterEach(() => sandbox.restore());

  it('should respond with an error if file cannot be read', () => {
    const expectedError = 'Boo!';

    const readFileStub = sandbox.stub(fs, 'readFile').callsFake((pathToDatapackage, encoding, done) => {
      done(expectedError);
    });

    datapackageParser.loadDatapackage({ folder: 'foo', file: 'bar' }, (error) => {
      expect(error).to.equal(expectedError);
      sinon.assert.calledWith(readFileStub, 'foo/bar', 'utf-8');
    });
  });

  it('should parse datapackage resources', () => {
    const expectedResources = [
      {
        path: 'ddf--concepts.csv',
        primaryKey: [
          'concept'
        ],
        type: 'concepts'
      },
      {
        dimensions: [
          'company',
          'anno'
        ],
        indicators: [
          'company_scale'
        ],
        path: 'ddf--datapoints--company_scale--by--company--anno.csv',
        primaryKey: [
          'company',
          'anno'
        ],
        type: 'datapoints'
      },
      {
        dimensions: [
          'company',
          'anno'
        ],
        indicators: [
          'lines_of_code'
        ],
        path: 'ddf--datapoints--lines_of_code--by--company--anno.csv',
        primaryKey: [
          'company',
          'anno'
        ],
        type: 'datapoints'
      },
      {
        concept: 'company_scale',
        entitySets: [
          'company_scale'
        ],
        fields: [
          'company_scale',
          'full_name_changed',
          'is--company_scale'
        ],
        path: 'ddf--entities--company--company_scale.csv',
        primaryKey: [
          'company_scale'
        ],
        type: 'entities'
      }
    ];

    const readFileStub = sandbox.stub(fs, 'readFile').callsFake((pathToDatapackage, encoding, done) => {
      done(null, JSON.stringify(datapackageStub));
    });

    datapackageParser.loadDatapackage({ folder: 'foo' }, (error, datapackage) => {
      expect(error).to.not.exist;
      expect(datapackage).to.not.be.null;

      expect(datapackage.resources).to.not.deep.equal(datapackageStub.resources);
      expect(datapackage.resources).to.deep.equal(expectedResources);
      expect(_.omit(datapackage, 'resources')).to.deep.equal(_.omit(datapackageStub, 'resources'));

      sinon.assert.calledWith(readFileStub, 'foo/datapackage.json', 'utf-8');
    });
  });

  it('should detect concepts resource by primary key', () => {
    expect(datapackageParser.isConceptsResource(['concept'])).to.be.true;
  });

  it('should detect not concepts resource by primary key', () => {
    expect(datapackageParser.isConceptsResource('concept')).to.be.false;
    expect(datapackageParser.isConceptsResource([])).to.be.false;
    expect(datapackageParser.isConceptsResource(['concept', 'bla'])).to.be.false;
    expect(datapackageParser.isConceptsResource(['bla'])).to.be.false;
  });

  it('should detect entities resource by primary key', () => {
    expect(datapackageParser.isEntitiesResource(['country'])).to.be.true;
  });

  it('should detect not entities resource by primary key', () => {
    expect(datapackageParser.isEntitiesResource('bla')).to.be.false;
    expect(datapackageParser.isEntitiesResource([])).to.be.false;
    expect(datapackageParser.isEntitiesResource(['concept', 'bla'])).to.be.false;
    expect(datapackageParser.isEntitiesResource(['concept'])).to.be.false;
  });

  it('should detect datapoints resource by primary key', () => {
    expect(datapackageParser.isDatapointsResource(['population', 'gini'])).to.be.true;
  });

  it('should detect not datapoints resource by primary key', () => {
    expect(datapackageParser.isDatapointsResource('bla')).to.be.false;
    expect(datapackageParser.isDatapointsResource([])).to.be.false;
    expect(datapackageParser.isDatapointsResource(['population'])).to.be.false;
  });

  it('should parse entities resource', () => {
    const parsedResource = datapackageParser.parseEntitiesResource(entitiesResource);

    expect(parsedResource.type).to.equal('entities');
    expect(parsedResource.primaryKey).to.deep.equal(['company_scale']);
    expect(parsedResource.path).to.equal(entitiesResource.path);
    expect(parsedResource.concept).to.equal(entitiesResource.schema.primaryKey);
    expect(parsedResource.entitySets).to.deep.equal(['company_scale']);
    expect(parsedResource.fields).to.deep.equal(['company_scale', 'full_name_changed', 'is--company_scale']);
  });

  it('should parse concepts resource', () => {
    const parsedResource = datapackageParser.parseConceptsResource(conceptsResource);

    expect(parsedResource.type).to.equal('concepts');
    expect(parsedResource.path).to.equal(conceptsResource.path);
    expect(parsedResource.primaryKey).to.deep.equal(['concept']);
  });

  it('should parse datapoints resource', () => {
    const parsedResource = datapackageParser.parseDatapointsResource(datapointsResource);

    expect(parsedResource.type).to.equal('datapoints');
    expect(parsedResource.primaryKey).to.deep.equal(['company', 'anno']);
    expect(parsedResource.path).to.equal(datapointsResource.path);
    expect(parsedResource.dimensions).to.equal(parsedResource.primaryKey);
    expect(parsedResource.indicators).to.deep.equal(['lines_of_code']);
  });
});
