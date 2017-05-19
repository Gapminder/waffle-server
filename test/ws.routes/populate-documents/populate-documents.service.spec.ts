import '../../../ws.config/db.config';
import '../../../ws.repository/index';

import * as _ from 'lodash';
import {expect} from 'chai';
import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import {ConceptsRepositoryFactory} from '../../../ws.repository/ddf/concepts/concepts.repository';
import {EntitiesRepositoryFactory} from '../../../ws.repository/ddf/entities/entities.repository';
import {DatapointsRepositoryFactory} from '../../../ws.repository/ddf/data-points/data-points.repository';
import * as datasetTransactionService from '../../../ws.services/dataset-transactions.service';
import {logger} from '../../../ws.config/log';
import * as populateDocumentsService from '../../../ws.routes/populate-documents/populate-documents.service';

const test = sinonTest.configureTest(sinon);

describe('Populate documents service testing', () => {

  it('should return an error: Error was happened during getting dataset and transaction documents', test(function (done) {
    const context = {datasetName: 'datasetName', commit: 'commit'};
    const expectedError = 'Boo!';
    const findDefaultDatasetAndTransactionStub = this.stub(datasetTransactionService, 'findDefaultDatasetAndTransaction', (datasetName, commit, onFound) => {
        onFound(expectedError);
    });

    populateDocumentsService.getDocumentsByQuery(context, (error, documents) => {
      expect(error).to.equal(expectedError);
      expect(documents).to.not.exist;

      sinon.assert.calledOnce(findDefaultDatasetAndTransactionStub);
      sinon.assert.calledWith(findDefaultDatasetAndTransactionStub, context.datasetName, context.commit);

      done();
    });
  }));

  it('should return an error: Dataset and Transaction were not found', test(function (done) {
    const context = {datasetName: 'datasetName', commit: 'commit'};
    const expectedError = 'Dataset and Transaction were not found.';
    const findDefaultDatasetAndTransactionStub = this.stub(datasetTransactionService, 'findDefaultDatasetAndTransaction', (datasetName, commit, onFound) => {
      onFound();
    });

    populateDocumentsService.getDocumentsByQuery(context, (error, documents) => {
      expect(error).to.equal(expectedError);
      expect(documents).to.not.exist;

      sinon.assert.calledOnce(findDefaultDatasetAndTransactionStub);
      sinon.assert.calledWith(findDefaultDatasetAndTransactionStub, context.datasetName, context.commit);

      done();
    });
  }));

  it('should return an error: Dataset was not found', test(function (done) {
    const context = {datasetName: 'datasetName', commit: 'commit'};
    const expectedError = 'Dataset was not found.';
    const findDefaultDatasetAndTransactionStub = this.stub(datasetTransactionService, 'findDefaultDatasetAndTransaction', (datasetName, commit, onFound) => {
      onFound(null, {});
    });

    populateDocumentsService.getDocumentsByQuery(context, (error, documents) => {
      expect(error).to.equal(expectedError);
      expect(documents).to.not.exist;

      sinon.assert.calledOnce(findDefaultDatasetAndTransactionStub);
      sinon.assert.calledWith(findDefaultDatasetAndTransactionStub, context.datasetName, context.commit);

      done();
    });
  }));

  it('should return an error: Transaction was not found', test(function (done) {
    const context = {datasetName: 'datasetName', commit: 'commit'};
    const expectedError = 'Transaction was not found.';
    const findDefaultDatasetAndTransactionStub = this.stub(datasetTransactionService, 'findDefaultDatasetAndTransaction', (datasetName, commit, onFound) => {
      onFound(null, {dataset: {}});
    });

    populateDocumentsService.getDocumentsByQuery(context, (error, documents) => {
      expect(error).to.equal(expectedError);
      expect(documents).to.not.exist;

      sinon.assert.calledOnce(findDefaultDatasetAndTransactionStub);
      sinon.assert.calledWith(findDefaultDatasetAndTransactionStub, context.datasetName, context.commit);

      done();
    });
  }));

  it('should return an error: Error was happened during getting documents from concepts repository by query', test(function (done) {
    const dataset = {_id: 'AAA'};
    const transaction = {createdAt: 123};
    const context = {datasetName: 'datasetName', commit: 'commit', collection: 'concepts', query: {}};
    const expectedError = 'Boo!';
    const findDefaultDatasetAndTransactionStub = this.stub(datasetTransactionService, 'findDefaultDatasetAndTransaction', (datasetName, commit, onFound) => {
      return onFound(null, {dataset, transaction});
    });
    const findConceptsByQueryStub = this.stub();
    findConceptsByQueryStub.withArgs(context.query).onFirstCall().callsArgWith(1, expectedError);
    const currentVersionStub = this.stub(ConceptsRepositoryFactory, 'currentVersion', () => {
      return {findConceptsByQuery: findConceptsByQueryStub}
    });

    populateDocumentsService.getDocumentsByQuery(context, (error, documents) => {
      expect(error).to.equal(expectedError);
      expect(documents).to.not.exist;

      sinon.assert.calledOnce(findDefaultDatasetAndTransactionStub);
      sinon.assert.calledWith(findDefaultDatasetAndTransactionStub, context.datasetName, context.commit);

      sinon.assert.calledOnce(findConceptsByQueryStub);
      sinon.assert.calledWith(findConceptsByQueryStub, context.query);

      sinon.assert.calledOnce(currentVersionStub);
      sinon.assert.calledWith(currentVersionStub, dataset._id, transaction.createdAt);

      done();
    });
  }));

  it('should return an error: Error was happened during getting documents from entities repository by query', test(function (done) {
    const dataset = {_id: 'AAA'};
    const transaction = {createdAt: 123};
    const context = {datasetName: 'datasetName', commit: 'commit', collection: 'entities', query: {}};
    const expectedError = 'Boo!';
    const findDefaultDatasetAndTransactionStub = this.stub(datasetTransactionService, 'findDefaultDatasetAndTransaction', (datasetName, commit, onFound) => {
      return onFound(null, {dataset, transaction});
    });
    const findEntityPropertiesByQueryStub = this.stub();
    findEntityPropertiesByQueryStub.withArgs(context.query).onFirstCall().callsArgWith(1, expectedError);
    const currentVersionStub = this.stub(EntitiesRepositoryFactory, 'currentVersion', () => {
      return {findEntityPropertiesByQuery: findEntityPropertiesByQueryStub}
    });

    populateDocumentsService.getDocumentsByQuery(context, (error, documents) => {
      expect(error).to.equal(expectedError);
      expect(documents).to.not.exist;

      sinon.assert.calledOnce(findDefaultDatasetAndTransactionStub);
      sinon.assert.calledWith(findDefaultDatasetAndTransactionStub, context.datasetName, context.commit);

      sinon.assert.calledOnce(findEntityPropertiesByQueryStub);
      sinon.assert.calledWith(findEntityPropertiesByQueryStub, context.query);

      sinon.assert.calledOnce(currentVersionStub);
      sinon.assert.calledWith(currentVersionStub, dataset._id, transaction.createdAt);

      done();
    });
  }));

  it('should return an error: Error was happened during getting documents from datapoints repository by query', test(function (done) {
    const dataset = {_id: 'AAA'};
    const transaction = {createdAt: 123};
    const context = {datasetName: 'datasetName', commit: 'commit', collection: 'datapoints', query: {}};
    const expectedError = 'Boo!';
    const findDefaultDatasetAndTransactionStub = this.stub(datasetTransactionService, 'findDefaultDatasetAndTransaction', (datasetName, commit, onFound) => {
      return onFound(null, {dataset, transaction});
    });
    const findByQueryStub = this.stub();
    findByQueryStub.withArgs(context.query).onFirstCall().callsArgWith(1, expectedError);
    const currentVersionStub = this.stub(DatapointsRepositoryFactory, 'currentVersion', () => {
      return {findByQuery: findByQueryStub}
    });

    populateDocumentsService.getDocumentsByQuery(context, (error, documents) => {
      expect(error).to.equal(expectedError);
      expect(documents).to.not.exist;

      sinon.assert.calledOnce(findDefaultDatasetAndTransactionStub);
      sinon.assert.calledWith(findDefaultDatasetAndTransactionStub, context.datasetName, context.commit);

      sinon.assert.calledOnce(findByQueryStub);
      sinon.assert.calledWith(findByQueryStub, context.query);

      sinon.assert.calledOnce(currentVersionStub);
      sinon.assert.calledWith(currentVersionStub, dataset._id, transaction.createdAt);

      done();
    });
  }));

  it('should return an empty array: Concepts were not found by query', test(function (done) {
    const dataset = {_id: 'AAA'};
    const transaction = {createdAt: 123};
    const context = {datasetName: 'datasetName', commit: 'commit', collection: 'concepts', query: {}};
    const expectedDocuments = [];
    const findDefaultDatasetAndTransactionStub = this.stub(datasetTransactionService, 'findDefaultDatasetAndTransaction', (datasetName, commit, onFound) => {
      return onFound(null, {dataset, transaction});
    });
    const findConceptsByQueryStub = this.stub();
    findConceptsByQueryStub.withArgs(context.query).onFirstCall().callsArgWith(1, null, expectedDocuments);
    const currentVersionStub = this.stub(ConceptsRepositoryFactory, 'currentVersion', () => {
      return {findConceptsByQuery: findConceptsByQueryStub};
    });

    populateDocumentsService.getDocumentsByQuery(context, (error, documents) => {
      expect(error).to.not.exist;
      expect(documents).to.be.deep.equal(expectedDocuments);

      sinon.assert.calledOnce(findDefaultDatasetAndTransactionStub);
      sinon.assert.calledWith(findDefaultDatasetAndTransactionStub, context.datasetName, context.commit);

      sinon.assert.calledOnce(findConceptsByQueryStub);
      sinon.assert.calledWith(findConceptsByQueryStub, context.query);

      sinon.assert.calledOnce(currentVersionStub);
      sinon.assert.calledWith(currentVersionStub, dataset._id, transaction.createdAt);

      done();
    });
  }));

  it('should return an error: Error was happened during getting documents from concepts repository by subquery', test(function (done) {
    const dataset = {_id: 'AAA'};
    const transaction = {createdAt: 123};
    const context = {datasetName: 'datasetName', commit: 'commit', collection: 'concepts', query: {}};
    const concept = {domain: 'BBB', sets: []};
    const domain = {originId: 'BBB', domain: null};
    const documents = [
      concept,
      domain
    ];
    const expectedError = 'Boo!';
    const subquery = {originId: {$in: [domain.originId]}};
    const findDefaultDatasetAndTransactionStub = this.stub(datasetTransactionService, 'findDefaultDatasetAndTransaction', (datasetName, commit, onFound) => {
      return onFound(null, {dataset, transaction});
    });
    const findConceptsByQueryStub = this.stub();
    findConceptsByQueryStub
      .onFirstCall().callsArgWithAsync(1, null, documents)
      .onSecondCall().callsArgWithAsync(1, expectedError);
    const conceptsRepository = {findConceptsByQuery: findConceptsByQueryStub};
    const currentVersionStub = this.stub(ConceptsRepositoryFactory, 'currentVersion', () => {
      return conceptsRepository;
    });

    populateDocumentsService.getDocumentsByQuery(context, (error, documents) => {
      expect(error).to.equal(expectedError);
      expect(documents).to.not.exist;

      sinon.assert.calledOnce(findDefaultDatasetAndTransactionStub);
      sinon.assert.calledWith(findDefaultDatasetAndTransactionStub, context.datasetName, context.commit);

      sinon.assert.calledTwice(findConceptsByQueryStub);
      sinon.assert.calledWith(findConceptsByQueryStub, context.query);
      sinon.assert.calledWith(findConceptsByQueryStub, subquery);

      sinon.assert.calledTwice(currentVersionStub);
      sinon.assert.calledWith(currentVersionStub, dataset._id, transaction.createdAt);

      done();
    });
  }));

  it('should return an error: Original document has reference to a document which wasn\'t found', test(function (done) {
    const dataset = {_id: 'AAA'};
    const transaction = {createdAt: 123};
    const context = {datasetName: 'datasetName', commit: 'commit', collection: 'concepts', query: {}};
    const concept = {domain: 'BBB', sets: []};
    const domain = {originId: 'BBB', domain: null};
    const documents = [
      concept,
      domain
    ];
    const loggerStub = this.stub(logger, 'error');
    const expectedError = 'Original document has reference to a document which wasn\'t found';
    const subquery = {originId: {$in: [domain.originId]}};
    const findDefaultDatasetAndTransactionStub = this.stub(datasetTransactionService, 'findDefaultDatasetAndTransaction', (datasetName, commit, onFound) => {
      return onFound(null, {dataset, transaction});
    });
    const findConceptsByQueryStub = this.stub();
    findConceptsByQueryStub
      .onFirstCall().callsArgWithAsync(1, null, documents)
      .onSecondCall().callsArgWithAsync(1, null, []);
    const conceptsRepository = {findConceptsByQuery: findConceptsByQueryStub};
    const currentVersionStub = this.stub(ConceptsRepositoryFactory, 'currentVersion', () => {
      return conceptsRepository;
    });

    populateDocumentsService.getDocumentsByQuery(context, (error, documents) => {
      expect(error).to.equal(expectedError);
      expect(documents).to.not.exist;

      sinon.assert.calledOnce(findDefaultDatasetAndTransactionStub);
      sinon.assert.calledWith(findDefaultDatasetAndTransactionStub, context.datasetName, context.commit);

      sinon.assert.calledTwice(findConceptsByQueryStub);
      sinon.assert.calledWith(findConceptsByQueryStub, context.query);
      sinon.assert.calledWith(findConceptsByQueryStub, subquery);

      sinon.assert.calledTwice(currentVersionStub);
      sinon.assert.calledWith(currentVersionStub, dataset._id, transaction.createdAt);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithMatch(loggerStub, {obj: concept}, 'Original document has reference to a document which wasn\'t found');

      done();
    });
  }));

  it('should return an error: Original document has only one value, but returns from db more than one', test(function (done) {
    const dataset = {_id: 'AAA'};
    const transaction = {createdAt: 123};
    const context = {datasetName: 'datasetName', commit: 'commit', collection: 'concepts', query: {}};
    const concept = {domain: 'BBB', sets: []};
    const domain = {originId: 'BBB', domain: null};
    const documents = [
      concept,
      domain
    ];
    const expectedError = 'Original document has only one value, but returns from db more than one';
    const subquery = {originId: {$in: [domain.originId]}};
    const loggerStub = this.stub(logger, 'error');
    const findDefaultDatasetAndTransactionStub = this.stub(datasetTransactionService, 'findDefaultDatasetAndTransaction', (datasetName, commit, onFound) => {
      return onFound(null, {dataset, transaction});
    });
    const findConceptsByQueryStub = this.stub();
    findConceptsByQueryStub
      .onFirstCall().callsArgWithAsync(1, null, documents)
      .onSecondCall().callsArgWithAsync(1, null, [domain, domain]);
    const conceptsRepository = {findConceptsByQuery: findConceptsByQueryStub};
    const currentVersionStub = this.stub(ConceptsRepositoryFactory, 'currentVersion', () => {
      return conceptsRepository;
    });

    populateDocumentsService.getDocumentsByQuery(context, (error, documents) => {
      expect(error).to.equal(expectedError);
      expect(documents).to.not.exist;

      sinon.assert.calledOnce(findDefaultDatasetAndTransactionStub);
      sinon.assert.calledWith(findDefaultDatasetAndTransactionStub, context.datasetName, context.commit);

      sinon.assert.calledTwice(findConceptsByQueryStub);
      sinon.assert.calledWith(findConceptsByQueryStub, context.query);
      sinon.assert.calledWith(findConceptsByQueryStub, subquery);

      sinon.assert.calledTwice(currentVersionStub);
      sinon.assert.calledWith(currentVersionStub, dataset._id, transaction.createdAt);

      sinon.assert.calledOnce(loggerStub);
      sinon.assert.calledWithMatch(loggerStub, {obj: concept}, 'Original document has only one value, but returns from db more than one');

      done();
    });
  }));

  it('should return an array of documents: Concepts were populated successfully', test(function (done) {
    const dataset = {_id: 'AAA'};
    const transaction = {createdAt: 123};
    const context = {datasetName: 'datasetName', commit: 'commit', collection: 'concepts', query: {}};
    const concept = {domain: 'BBB', sets: []};
    const domain = {originId: 'BBB', domain: null};
    const documents = [
      concept,
      domain
    ];
    const expectedDocuments = [
      _.defaults({domain}, concept),
      domain
    ];
    const subquery = {originId: {$in: [domain.originId]}};
    const findDefaultDatasetAndTransactionStub = this.stub(datasetTransactionService, 'findDefaultDatasetAndTransaction', (datasetName, commit, onFound) => {
      return onFound(null, {dataset, transaction});
    });
    const findConceptsByQueryStub = this.stub();
    findConceptsByQueryStub
      .onFirstCall().callsArgWithAsync(1, null, documents)
      .onSecondCall().callsArgWithAsync(1, null, [domain]);
    const conceptsRepository = {findConceptsByQuery: findConceptsByQueryStub};
    const currentVersionStub = this.stub(ConceptsRepositoryFactory, 'currentVersion', () => {
      return conceptsRepository;
    });

    populateDocumentsService.getDocumentsByQuery(context, (error, documents) => {
      expect(error).to.not.exist;
      expect(documents).to.be.deep.equal(expectedDocuments);

      sinon.assert.calledOnce(findDefaultDatasetAndTransactionStub);
      sinon.assert.calledWith(findDefaultDatasetAndTransactionStub, context.datasetName, context.commit);

      sinon.assert.calledTwice(findConceptsByQueryStub);
      sinon.assert.calledWith(findConceptsByQueryStub, context.query);
      sinon.assert.calledWith(findConceptsByQueryStub, subquery);

      sinon.assert.calledTwice(currentVersionStub);
      sinon.assert.calledWith(currentVersionStub, dataset._id, transaction.createdAt);

      done();
    });
  }));

  it('should return an array of documents: Entities were populated successfully', test(function (done) {
    const dataset = {_id: 'AAA'};
    const transaction = {createdAt: 123};
    const context = {datasetName: 'datasetName', commit: 'commit', collection: 'entities', query: {}};
    const domain = {originId: 'DDD', domain: null};
    const set1 = {originId: 'SSS1', domain: 'DDD'};
    const set2 = {originId: 'SSS2', domain: 'DDD'};
    const entity = {originId: 'EEE', domain: 'DDD', sets: ['SSS1', 'SSS2']};
    const documents = [entity];
    const expectedDocuments = [_.defaults({domain, sets: [set1, set2]}, entity)];
    const subquery1 = {originId: {$in: [domain.originId]}};
    const subquery2 = {originId: {$in: [set1.originId, set2.originId]}};
    const findDefaultDatasetAndTransactionStub = this.stub(datasetTransactionService, 'findDefaultDatasetAndTransaction', (datasetName, commit, onFound) => {
      return onFound(null, {dataset, transaction});
    });
    const findEntityPropertiesByQueryStub = this.stub();
    findEntityPropertiesByQueryStub
      .onFirstCall().callsArgWithAsync(1, null, documents);
    const findConceptsByQueryStub = this.stub();
    findConceptsByQueryStub
      .onFirstCall().callsArgWithAsync(1, null, [domain])
      .onSecondCall().callsArgWithAsync(1, null, [set1, set2]);

    const conceptsRepository = {findConceptsByQuery: findConceptsByQueryStub};
    const entitiesRepository = {findEntityPropertiesByQuery: findEntityPropertiesByQueryStub};
    const entitiesRepositoryCurrentVersionStub = this.stub(EntitiesRepositoryFactory, 'currentVersion', () => {
      return entitiesRepository;
    });
    const conceptsRepositoryCurrentVersionStub = this.stub(ConceptsRepositoryFactory, 'currentVersion', () => {
      return conceptsRepository;
    });

    populateDocumentsService.getDocumentsByQuery(context, (error, documents) => {
      expect(error).to.not.exist;
      expect(documents).to.be.deep.equal(expectedDocuments);

      sinon.assert.calledOnce(findDefaultDatasetAndTransactionStub);
      sinon.assert.calledWith(findDefaultDatasetAndTransactionStub, context.datasetName, context.commit);

      sinon.assert.calledOnce(findEntityPropertiesByQueryStub);
      sinon.assert.calledWith(findEntityPropertiesByQueryStub, context.query);

      sinon.assert.calledTwice(findConceptsByQueryStub);
      sinon.assert.calledWith(findConceptsByQueryStub, subquery1);
      sinon.assert.calledWith(findConceptsByQueryStub, subquery2);

      sinon.assert.calledOnce(entitiesRepositoryCurrentVersionStub);
      sinon.assert.calledWith(entitiesRepositoryCurrentVersionStub, dataset._id, transaction.createdAt);

      sinon.assert.calledTwice(conceptsRepositoryCurrentVersionStub);
      sinon.assert.calledWith(conceptsRepositoryCurrentVersionStub, dataset._id, transaction.createdAt);

      done();
    });
  }));

  //TODO
  xit('should return an array of documents: Datapoints were populated successfully', test(function (done) {
    const dataset = {_id: 'AAA'};
    const transaction = {createdAt: 123};
    const context = {datasetName: 'datasetName', commit: 'commit', collection: 'concepts', query: {}};
    const concept = {domain: 'BBB', sets: []};
    const domain = {originId: 'BBB', domain: null};
    const documents = [
      concept,
      domain
    ];
    const expectedDocuments = [
      _.defaults({domain}, concept),
      domain
    ];
    const subquery = {originId: {$in: [domain.originId]}};
    const findDefaultDatasetAndTransactionStub = this.stub(datasetTransactionService, 'findDefaultDatasetAndTransaction', (datasetName, commit, onFound) => {
      return onFound(null, {dataset, transaction});
    });
    const findConceptsByQueryStub = this.stub();
    findConceptsByQueryStub
      .onFirstCall().callsArgWithAsync(1, null, documents)
      .onSecondCall().callsArgWithAsync(1, null, [domain]);
    const conceptsRepository = {findConceptsByQuery: findConceptsByQueryStub};
    const currentVersionStub = this.stub(ConceptsRepositoryFactory, 'currentVersion', () => {
      return conceptsRepository;
    });

populateDocumentsService.getDocumentsByQuery(context, (error, documents) => {
      expect(error).to.not.exist;
      expect(documents).to.be.deep.equal(expectedDocuments);

      sinon.assert.calledOnce(findDefaultDatasetAndTransactionStub);
      sinon.assert.calledWith(findDefaultDatasetAndTransactionStub, context.datasetName, context.commit);

      sinon.assert.calledTwice(findConceptsByQueryStub);
      sinon.assert.calledWith(findConceptsByQueryStub, context.query);
      sinon.assert.calledWith(findConceptsByQueryStub, subquery);

      sinon.assert.calledTwice(currentVersionStub);
      sinon.assert.calledWith(currentVersionStub, dataset._id, transaction.createdAt);

      done();
    });
  }));

});

