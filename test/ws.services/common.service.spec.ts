import '../../ws.repository';

import * as sinon from 'sinon';
import * as sinonTest from 'sinon-test';
import { expect } from 'chai';

import * as commonService from '../../ws.services/common.service';
import * as datasetTransactionsService from '../../ws.services/dataset-transactions.service';

const sandbox = sinonTest.configureTest(sinon);

describe('Common Service', function () {
  it('should not translate document when language not given', sandbox(function () {
    const doc = {
      properties: {}
    };
    expect(commonService.translateDocument(doc, null)).to.equal(doc.properties);
  }));

  it('should not translate doc when it does not have a translation for given lang', sandbox(function () {
    const doc = {
      properties: {}
    };
    expect(commonService.translateDocument(doc, 'en')).to.equal(doc.properties);
  }));

  it('should not translate doc when it does not have a translation for given lang', sandbox(function () {
    const lang = 'en';

    const doc = {
      properties: {
        name: 'Привет',
        description: 'Описание'
      },
      languages: {
        [lang]: {
          name: 'Hello'
        }
      }
    };
    expect(commonService.translateDocument(doc, 'en')).to.deep.equal({
      name: 'Hello',
      description: 'Описание'
    });
  }));

  it('should not find default dataset and transaction: error happened during search', sandbox(function (done: Function) {
    const expectedError = '[Error]: findDefaultDatasetAndTransaction';
    this.stub(datasetTransactionsService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(2, expectedError);

    commonService.findDefaultDatasetAndTransaction({}, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('should not find default dataset and transaction: there is no dataset', sandbox(function (done: Function) {
    const expectedError = 'Dataset isn\'t present in db.';
    this.stub(datasetTransactionsService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(2, null, {});

    commonService.findDefaultDatasetAndTransaction({}, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('should not find default dataset and transaction: there is no transaction', sandbox(function (done: Function) {
    const expectedError = 'Transaction isn\'t present in db.';
    this.stub(datasetTransactionsService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(2, null, {dataset: {}});

    commonService.findDefaultDatasetAndTransaction({}, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  }));

  it('should find default dataset and transaction', sandbox(function (done: Function) {
    const datasetAndTransaction = {
      dataset: {
        _id: 'dsId'
      },
      transaction: {
        _id: 'txId',
        createdAt: 1111111
      },
    };

    this.stub(datasetTransactionsService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(2, null, datasetAndTransaction);

    commonService.findDefaultDatasetAndTransaction({}, (error, actualDatasetAndTransaction) => {
      expect(error).to.not.exist;

      expect(actualDatasetAndTransaction.dataset).to.equal(datasetAndTransaction.dataset);
      expect(actualDatasetAndTransaction.transaction).to.equal(datasetAndTransaction.transaction);
      expect(actualDatasetAndTransaction.version).to.equal(datasetAndTransaction.transaction.createdAt);
      done();
    });
  }));
});
