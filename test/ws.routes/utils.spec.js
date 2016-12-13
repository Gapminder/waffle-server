'use strict';

require('../../ws.config/db.config');
require('../../ws.repository');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const expect = require('chai').expect;

describe('Routes utils', () => {
  describe('Dataset accessibility check', () => {
    it('should send unsuccessful response with an error happened during dataset searching', done => {
      const errorMessage = 'Searching error!';
      const expectedDatasetName = 'fake/dataset';

      const routeUtils = proxyquire('../../ws.routes/utils.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onFound) => {
            expect(datasetName).to.equal(expectedDatasetName);
            onFound(errorMessage);
          }
        }
      });

      const req = {
        body: {
          dataset: expectedDatasetName
        }
      };

      const res = {
        json: response => {
          expect(response).to.be.deep.equal({success: false, error: errorMessage});
          done(); // At this point test is finished
        }
      };

      const next = () => {
        expect.fail(null, null, 'This function should not be called');
      };

      routeUtils.checkDatasetAccessibility(req, res, next);
    });

    it('should call next middleware if no dataset name was found', done => {
      const routeUtils = proxyquire('../../ws.routes/utils.js', {});

      const req = {};

      const res = 'any';

      const next = () => {
        done(); // At this point test is finished
      };

      routeUtils.checkDatasetAccessibility(req, res, next);
    });

    it('should respond with error when dataset was not found', done => {
      const expectedDatasetName = 'fake/dataset';

      const routeUtils = proxyquire('../../ws.routes/utils.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onFound) => {
            onFound(null);
          }
        }
      });

      const req = {
        body: {
          dataset: expectedDatasetName
        }
      };

      const res = {
        json: response => {
          expect(response).to.be.deep.equal({success: false, message: `Dataset with given name ${expectedDatasetName} was not found`});
          done(); // At this point test is finished
        }
      };

      const next = () => {
        expect.fail(null, null, 'This function should not be called');
      };

      routeUtils.checkDatasetAccessibility(req, res, next);
    });

    it('should call next middleware when dataset is not private', done => {
      const expectedDatasetName = 'fake/dataset';
      const routeUtils = proxyquire('../../ws.routes/utils.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onFound) => {
            const datasetStub = {
              private: false
            };
            onFound(null, datasetStub);
          }
        }
      });

      const req = {
        body: {
          dataset: expectedDatasetName
        }
      };

      const res = 'any';

      const next = () => {
        done();
      };

      routeUtils.checkDatasetAccessibility(req, res, next);
    });

    it('should call next middleware when provided dataset access token matches token stored in dataset', done => {
      const expectedDatasetName = 'fake/dataset';
      const datasetAccessToken = 'aaaaabbbbbcccccddddd';

      const routeUtils = proxyquire('../../ws.routes/utils.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onFound) => {
            const datasetStub = {
              private: true,
              accessToken: datasetAccessToken
            };
            onFound(null, datasetStub);
          }
        }
      });

      const req = {
        body: {
          dataset_access_token: datasetAccessToken,
          dataset: expectedDatasetName
        }
      };

      const res = 'any';

      const next = () => {
        done();
      };

      routeUtils.checkDatasetAccessibility(req, res, next);
    });

    it('should respond with an error when user tries to access private dataset without access token', done => {
      const expectedDatasetName = 'fake/dataset';
      const routeUtils = proxyquire('../../ws.routes/utils.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onFound) => {
            const datasetStub = {
              private: true,
              accessToken: 'aaaaabbbbbcccccddddd'
            };
            onFound(null, datasetStub);
          }
        }
      });

      const req = {
        body: {
          dataset: expectedDatasetName
        }
      };

      const res = {
        json: (response) => {
          expect(response).to.deep.equal({success: false, error: 'You are not allowed to access data according to given query'});
          done();
        }
      };

      const next = () => {
        expect.fail(null, null, 'Should not call next middleware when token is not provided');
      };

      routeUtils.checkDatasetAccessibility(req, res, next);
    });

    it('should respond with an error when user tries to access private dataset with wrong token', done => {
      const expectedDatasetName = 'fake/dataset';
      const routeUtils = proxyquire('../../ws.routes/utils.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onFound) => {
            const datasetStub = {
              private: true,
              accessToken: 'aaaaabbbbbcccccddddd'
            };
            onFound(null, datasetStub);
          }
        }
      });

      const req = {
        body: {
          dataset_access_token: 'some fake token',
          dataset: expectedDatasetName
        }
      };

      const res = {
        json: (response) => {
          expect(response).to.deep.equal({success: false, error: 'You are not allowed to access data according to given query'});
          done();
        }
      };

      const next = () => {
        expect.fail(null, null, 'Should not call next middleware when token is not provided');
      };

      routeUtils.checkDatasetAccessibility(req, res, next);
    });

    it('should respond with an error when user tries to access private dataset - dataset.accessToken and dataset_access_token are empty', done => {
      const expectedDatasetName = 'fake/dataset';
      const routeUtils = proxyquire('../../ws.routes/utils.js', {
        '../ws.repository/ddf/datasets/datasets.repository': {
          findByName: (datasetName, onFound) => {
            const datasetStub = {
              private: true,
              accessToken: null
            };
            onFound(null, datasetStub);
          }
        }
      });

      const req = {
        body: {
          dataset_access_token: null,
          dataset: expectedDatasetName
        }
      };

      const res = {
        json: (response) => {
          expect(response).to.deep.equal({success: false, error: 'You are not allowed to access data according to given query'});
          done();
        }
      };

      const next = () => {
        expect.fail(null, null, 'Should not call next middleware when token is not provided');
      };

      routeUtils.checkDatasetAccessibility(req, res, next);
    });
  });
});
