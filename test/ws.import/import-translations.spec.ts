import '../../ws.repository';

import * as hi from 'highland';
import * as fs from 'fs';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import { expect } from 'chai';

import { createTranslations } from '../../ws.import/import-translations';
import { constants } from '../../ws.utils/constants';
import * as fileUtils from '../../ws.utils/file';
import * as ddfMappers from '../../ws.import/utils/ddf-mappers';
import * as ddfImportUtils from '../../ws.import/utils/import-ddf.utils';

import { ConceptsRepositoryFactory } from '../../ws.repository/ddf/concepts/concepts.repository';
import { EntitiesRepositoryFactory } from '../../ws.repository/ddf/entities/entities.repository';
import { DatapointsRepositoryFactory } from '../../ws.repository/ddf/data-points/data-points.repository';

const sandbox = sinonTest.configureTest(sinon);

const language = {
  id: 'nl-nl',
  name: 'nl-nl'
};

const datapackageStub: any = {
  name: 'ddf--ws-testing',
  title: 'ddf--ws-testing',
  description: '',
  version: '0.0.1',
  language: {
    id: 'en',
    name: 'English'
  },
  translations: [language],
  license: '',
  author: ''
};

const context = {
  pathToDdfFolder: '/some/path',
  datapackage: datapackageStub,
  concepts: {},
  transaction: {
    _id: 'txId',
    createdAt: 1111111
  },
  dataset: {
    _id: 'datasetId'
  }
};

describe('Import translations', () => {
  describe('Import concepts translations', () => {
    const conceptTranslation = {
      concept: 'english_speaking',
      concept_type: constants.CONCEPT_TYPE_ENTITY_SET,
      domain: 'company',
      additional_column: 'Engels sprekende'
    };

    before(() => {
      datapackageStub.resources = [{
        type: constants.CONCEPTS,
        primaryKey: ['concept'],
        path: 'ddf--concepts.csv'
      }];
    });

    after(() => {
      datapackageStub.resources = [];
    });

    it('should import translations for concept', sandbox(function (done: Function) {
      const addTranslationsForGivenPropertiesSpy = this.stub().returns(Promise.resolve());
      const allOpenedInGivenVersionStub = this.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns({ addTranslationsForGivenProperties: addTranslationsForGivenPropertiesSpy });

      const fsAccessStub = this.stub(fs, 'access').callsArgWithAsync(2);

      const readCsvFileAsStreamStub = this.stub(fileUtils, 'readCsvFileAsStream').returns(hi([conceptTranslation]));

      createTranslations(context, (errors, externalContext) => {
        expect(errors).to.not.exist;
        expect(externalContext).to.equal(context);

        sinon.assert.calledOnce(fsAccessStub);
        sinon.assert.calledWith(fsAccessStub, '/some/path/lang/nl-nl/ddf--concepts.csv', fs.constants.R_OK);
        sinon.assert.calledOnce(fsAccessStub);

        sinon.assert.calledOnce(readCsvFileAsStreamStub);
        sinon.assert.calledWith(readCsvFileAsStreamStub, '/some/path', 'lang/nl-nl/ddf--concepts.csv');

        sinon.assert.calledOnce(allOpenedInGivenVersionStub);
        sinon.assert.calledWith(allOpenedInGivenVersionStub, context.dataset._id, context.transaction.createdAt);

        sinon.assert.calledOnce(addTranslationsForGivenPropertiesSpy);
        sinon.assert.calledWith(addTranslationsForGivenPropertiesSpy, conceptTranslation, {
          language: {
            id: 'nl-nl',
            name: 'nl-nl'
          }
        });

        done();
      });
    }));

    it('should import translations for concept: translation properties are transformed by ddf mapper', sandbox(function (done: Function) {
      const transformedTranslation = { hello: 'world' };
      const transformConceptPropertiesStub = this.stub(ddfMappers, 'transformConceptProperties').returns(transformedTranslation);

      const addTranslationsForGivenPropertiesSpy = this.stub().returns(Promise.resolve());
      this.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns({ addTranslationsForGivenProperties: addTranslationsForGivenPropertiesSpy });

      this.stub(fs, 'access').callsArgWithAsync(2);

      this.stub(fileUtils, 'readCsvFileAsStream').returns(hi([conceptTranslation]));

      createTranslations(context, (errors, externalContext) => {
        expect(errors).to.not.exist;
        expect(externalContext).to.equal(context);

        sinon.assert.calledOnce(transformConceptPropertiesStub);
        sinon.assert.calledWith(transformConceptPropertiesStub, conceptTranslation);

        sinon.assert.calledOnce(addTranslationsForGivenPropertiesSpy);
        sinon.assert.calledWith(addTranslationsForGivenPropertiesSpy, transformedTranslation);

        done();
      });
    }));

    it('should not import translations for concept if it is impossible to read a file with them', sandbox(function (done: Function) {
      const addTranslationsForGivenPropertiesSpy = this.stub().returns(Promise.resolve());
      const allOpenedInGivenVersionStub = this.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns({ addTranslationsForGivenProperties: addTranslationsForGivenPropertiesSpy });

      const fsAccessStub = this.stub(fs, 'access').callsArgWithAsync(2, 'Cannot Read File');

      const readCsvFileAsStreamStub = this.stub(fileUtils, 'readCsvFileAsStream').returns(hi([conceptTranslation]));

      createTranslations(context, (errors, externalContext) => {
        expect(errors).to.not.exist;
        expect(externalContext).to.equal(context);

        sinon.assert.calledOnce(fsAccessStub);
        sinon.assert.calledWith(fsAccessStub, '/some/path/lang/nl-nl/ddf--concepts.csv', fs.constants.R_OK);
        sinon.assert.calledOnce(fsAccessStub);

        sinon.assert.notCalled(readCsvFileAsStreamStub);
        sinon.assert.notCalled(allOpenedInGivenVersionStub);
        sinon.assert.notCalled(addTranslationsForGivenPropertiesSpy);

        done();
      });
    }));
  });

  describe('Import entities translations', () => {
    const entityResource = {
      type: constants.ENTITIES,
      path: 'ddf--entities--company--company_scale.csv',
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
      concept: 'company_scale',
      entitySets: ['company_scale'],
      primaryKey: ['company_scale']
    };

    const entityTranslation = {
      company_scale: 'large',
      full_name_changed: 'HEEL GROOT!!!$(#(*#*($',
      'is--company_scale': 'TRUE'
    };

    before(() => {
      datapackageStub.resources = [entityResource];
    });

    after(() => {
      datapackageStub.resources = [];
    });

    it('should import translations for entity', sandbox(function (done: Function) {
      const addTranslationsForGivenPropertiesSpy = this.stub().returns(Promise.resolve());
      const allOpenedInGivenVersionStub = this.stub(EntitiesRepositoryFactory, 'allOpenedInGivenVersion').returns({ addTranslationsForGivenProperties: addTranslationsForGivenPropertiesSpy });

      const fsAccessStub = this.stub(fs, 'access').callsArgWithAsync(2);

      const readCsvFileAsStreamStub = this.stub(fileUtils, 'readCsvFileAsStream').returns(hi([entityTranslation]));

      const toBooleanSpy = this.spy(ddfImportUtils, 'toBoolean');

      createTranslations(context, (errors, externalContext) => {
        expect(errors).to.not.exist;
        expect(externalContext).to.equal(context);

        const expectedEntityTranslation = {
          company_scale: 'large',
          full_name_changed: 'HEEL GROOT!!!$(#(*#*($',
          'is--company_scale': true
        };

        sinon.assert.callCount(toBooleanSpy, 4);

        sinon.assert.calledOnce(fsAccessStub);
        sinon.assert.calledWith(fsAccessStub, '/some/path/lang/nl-nl/ddf--entities--company--company_scale.csv', fs.constants.R_OK);

        sinon.assert.calledOnce(readCsvFileAsStreamStub);
        sinon.assert.calledWith(readCsvFileAsStreamStub, '/some/path', 'lang/nl-nl/ddf--entities--company--company_scale.csv');

        sinon.assert.calledOnce(allOpenedInGivenVersionStub);
        sinon.assert.calledWith(allOpenedInGivenVersionStub, context.dataset._id, context.transaction.createdAt);

        sinon.assert.calledOnce(addTranslationsForGivenPropertiesSpy);
        sinon.assert.calledWith(addTranslationsForGivenPropertiesSpy, expectedEntityTranslation, {
          language,
          source: entityResource.path,
          resolvedProperties: { gid: 'large', 'properties.is--company_scale': true }
        });

        done();
      });
    }));

    it('should not import translations for entity if it is impossible to read a file with them', sandbox(function (done: Function) {
      const addTranslationsForGivenPropertiesSpy = this.stub().returns(Promise.resolve());
      const allOpenedInGivenVersionStub = this.stub(EntitiesRepositoryFactory, 'allOpenedInGivenVersion').returns({ addTranslationsForGivenProperties: addTranslationsForGivenPropertiesSpy });

      const fsAccessStub = this.stub(fs, 'access').callsArgWithAsync(2, 'Cannot Read File');

      const readCsvFileAsStreamStub = this.stub(fileUtils, 'readCsvFileAsStream').returns(hi([entityTranslation]));

      createTranslations(context, (errors, externalContext) => {
        expect(errors).to.not.exist;
        expect(externalContext).to.equal(context);

        sinon.assert.calledOnce(fsAccessStub);
        sinon.assert.calledWith(fsAccessStub, '/some/path/lang/nl-nl/ddf--entities--company--company_scale.csv', fs.constants.R_OK);
        sinon.assert.calledOnce(fsAccessStub);

        sinon.assert.notCalled(readCsvFileAsStreamStub);
        sinon.assert.notCalled(allOpenedInGivenVersionStub);
        sinon.assert.notCalled(addTranslationsForGivenPropertiesSpy);

        done();
      });
    }));
  });

  describe('Import datapoints translations', () => {
    const datapointResource = {
      type: constants.DATAPOINTS,
      path: 'ddf--datapoints--company_scale--by--company--anno.csv',
      indicators: [
        'company_scale'
      ],
      dimensions: [
        'company',
        'anno'
      ],
      primaryKey: [
        'company',
        'anno'
      ]
    };

    const datapointTranslation = {
      company: 'mcrsft',
      anno: 1975,
      company_scale: 'klein'
    };

    before(() => {
      datapackageStub.resources = [datapointResource];
    });

    after(() => {
      datapackageStub.resources = [];
    });

    it('should import translations for datapoint', sandbox(function (done: Function) {
      const addTranslationsForGivenPropertiesSpy = this.stub().returns(Promise.resolve());
      const allOpenedInGivenVersionStub = this.stub(DatapointsRepositoryFactory, 'allOpenedInGivenVersion').returns({ addTranslationsForGivenProperties: addTranslationsForGivenPropertiesSpy });

      const fsAccessStub = this.stub(fs, 'access').callsArgWithAsync(2);

      const readCsvFileAsStreamStub = this.stub(fileUtils, 'readCsvFileAsStream').returns(hi([datapointTranslation]));

      createTranslations(context, (errors, externalContext) => {
        expect(errors).to.not.exist;
        expect(externalContext).to.equal(context);

        sinon.assert.calledOnce(fsAccessStub);
        sinon.assert.calledWith(fsAccessStub, '/some/path/lang/nl-nl/ddf--datapoints--company_scale--by--company--anno.csv', fs.constants.R_OK);

        sinon.assert.calledOnce(readCsvFileAsStreamStub);
        sinon.assert.calledWith(readCsvFileAsStreamStub, '/some/path', 'lang/nl-nl/ddf--datapoints--company_scale--by--company--anno.csv');

        sinon.assert.calledOnce(allOpenedInGivenVersionStub);
        sinon.assert.calledWith(allOpenedInGivenVersionStub, context.dataset._id, context.transaction.createdAt);

        sinon.assert.calledOnce(addTranslationsForGivenPropertiesSpy);
        sinon.assert.calledWith(addTranslationsForGivenPropertiesSpy, datapointTranslation, {
          language,
          source: datapointResource.path,
          resolvedProperties: { 'properties.anno': 1975, 'properties.company': 'mcrsft' }
        });

        done();
      });
    }));

    it('should not import translations for datapoint if it is impossible to read a file with them', sandbox(function (done: Function) {
      const addTranslationsForGivenPropertiesSpy = this.stub().returns(Promise.resolve());
      const allOpenedInGivenVersionStub = this.stub(DatapointsRepositoryFactory, 'allOpenedInGivenVersion').returns({ addTranslationsForGivenProperties: addTranslationsForGivenPropertiesSpy });

      const fsAccessStub = this.stub(fs, 'access').callsArgWithAsync(2, 'Cannot Read File');

      const readCsvFileAsStreamStub = this.stub(fileUtils, 'readCsvFileAsStream').returns(hi([datapointResource]));

      createTranslations(context, (errors, externalContext) => {
        expect(errors).to.not.exist;
        expect(externalContext).to.equal(context);

        sinon.assert.calledOnce(fsAccessStub);
        sinon.assert.calledWith(fsAccessStub, '/some/path/lang/nl-nl/ddf--datapoints--company_scale--by--company--anno.csv', fs.constants.R_OK);

        sinon.assert.notCalled(readCsvFileAsStreamStub);
        sinon.assert.notCalled(allOpenedInGivenVersionStub);
        sinon.assert.notCalled(addTranslationsForGivenPropertiesSpy);

        done();
      });
    }));
  });
});
