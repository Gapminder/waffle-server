'use strict';

const sinon = require('sinon');
const proxyquire = require('proxyquire');
const chai = require('chai');

const expect = chai.expect;
const packProcessorPath = '../../../../ws.routes/data-post-processors/pack/index';

let req, res;

describe('data post processors pack middleware', () => {
  beforeEach(() => {
    req = {
      query: {
        format: 'json'
      },
      rawData: {
        wsJson: {
          headers: [
            'geo',
            'year',
            'gini'
          ],
          rows: [
            [
              "usa",
              2004,
              42
            ]
          ]
        }
      }
    };

    res = {
      use_express_redis_cache: true,
      set: () => {
      },
      send: () => {
      },
      json: () => {
      }
    };
  });

  it('should respond with application/json content type when json format parameter was given', done => {
    //arrange
    let packedData = [
      {
        "geo": "usa",
        "year": 2004,
        "gini": 42
      }
    ];

    req.query.format = 'json';

    let resMock = sinon.mock(res);
    resMock.expects('set').once().withArgs('Content-Type', 'application/json');
    resMock.expects('send').once().withArgs(packedData);

    const stubbedPackMiddleware = proxyquire(packProcessorPath, {
      './pack.processor': (rawData, formatType, cb) => {
        //assert
        expect(rawData).to.deep.equal(req.rawData);
        expect(formatType).to.equal(req.query.format);

        cb(null, packedData);

        resMock.verify();
        done();
      }
    });

    //act
    stubbedPackMiddleware(req, res);
  });

  it('should respond with application/x-ws+json content type when wsJson format parameter was given', done => {
    //arrange
    let packedData = {
      "headers": [
        "geo",
        "year",
        "gini"
      ],
      "rows": [
        [
          "usa",
          2004,
          42
        ]
      ]
    };

    req.query.format = 'wsJson';

    let resMock = sinon.mock(res);
    resMock.expects('set').once().withArgs('Content-Type', 'application/x-ws+json');
    resMock.expects('send').once().withArgs(packedData);

    const stubbedPackMiddleware = proxyquire(packProcessorPath, {
      './pack.processor': (rawData, formatType, cb) => {
        //assert
        expect(rawData).to.deep.equal(req.rawData);
        expect(formatType).to.equal(req.query.format);

        cb(null, packedData);

        resMock.verify();
        done();
      }
    });

    //act
    stubbedPackMiddleware(req, res);
  });

  it('should respond with application/x-ddf+json content type when ddf format parameter was given', done => {
    //arrange
    let packedData = {
      concepts: {
        values: [
          "geo",
          "population_total",
          "time"
        ]
      },
      entities: {
        values: [
          "yyy",
          "abkh",
          "afg",
          "akr_a_dhe",
          "alb",
          "dza",
          "2015"
        ],
        rows: [
          [
            0,
            "10",
            -1,
            -1,
            -1
          ],
          [
            1,
            "10",
            -1,
            -1,
            -1
          ],
          [
            2,
            "10",
            -1,
            -1,
            -1
          ],
          [
            3,
            "10",
            -1,
            -1,
            -1
          ],
          [
            4,
            "10",
            -1,
            -1,
            -1
          ],
          [
            5,
            "10",
            -1,
            -1,
            -1
          ],
          [
            6,
            "01",
            55,
            56,
            -1
          ]
        ]
      },
      datapoints: {
        values: [
          "36734767",
          "3258259",
          "37954282"
        ],
        indicators: ["1"],
        dimensions: [
          "0",
          "2"
        ],
        rows: [
          [
            "16",
            0
          ],
          [
            "36",
            1
          ],
          [
            "46",
            2
          ]
        ]
      }
    };

    req.query.format = 'ddfJson';

    let resMock = sinon.mock(res);
    resMock.expects('set').once().withArgs('Content-Type', 'application/x-ddf+json');
    resMock.expects('send').once().withArgs(packedData);

    const stubbedPackMiddleware = proxyquire(packProcessorPath, {
      './pack.processor': (rawData, formatType, cb) => {
        //assert
        expect(rawData).to.deep.equal(req.rawData);
        expect(formatType).to.equal(req.query.format);

        cb(null, packedData);

        resMock.verify();
        done();
      }
    });

    //act
    stubbedPackMiddleware(req, res);
  });

  it('should respond with application/x-ddf+json content type when unknown format parameter was given', done => {
    //arrange
    let packedData = {
      concepts: {
        values: [
          "geo",
          "population_total",
          "time"
        ]
      },
      entities: {
        values: [
          "yyy",
          "abkh",
          "afg",
          "akr_a_dhe",
          "alb",
          "dza",
          "2015"
        ],
        rows: [
          [
            0,
            "10",
            -1,
            -1,
            -1
          ],
          [
            1,
            "10",
            -1,
            -1,
            -1
          ],
          [
            2,
            "10",
            -1,
            -1,
            -1
          ],
          [
            3,
            "10",
            -1,
            -1,
            -1
          ],
          [
            4,
            "10",
            -1,
            -1,
            -1
          ],
          [
            5,
            "10",
            -1,
            -1,
            -1
          ],
          [
            6,
            "01",
            55,
            56,
            -1
          ]
        ]
      },
      datapoints: {
        values: [
          "36734767",
          "3258259",
          "37954282"
        ],
        indicators: ["1"],
        dimensions: [
          "0",
          "2"
        ],
        rows: [
          [
            "16",
            0
          ],
          [
            "36",
            1
          ],
          [
            "46",
            2
          ]
        ]
      }
    };

    req.query.format = 'bla-unknown';

    let resMock = sinon.mock(res);
    resMock.expects('set').once().withArgs('Content-Type', 'application/x-ddf+json');
    resMock.expects('send').once().withArgs(packedData);

    const stubbedPackMiddleware = proxyquire(packProcessorPath, {
      './pack.processor': (rawData, formatType, cb) => {
        //assert
        expect(rawData).to.deep.equal(req.rawData);
        expect(formatType).to.equal(req.query.format);

        cb(null, packedData);

        resMock.verify();
        done();
      }
    });

    //act
    stubbedPackMiddleware(req, res);
  });

  it('should respond with text/csv content type when csv format parameter was given', done => {
    //arrange
    let packedData = [
      '"geo","year","gini"',
      '"usa",2004,42'
    ].join('\n');

    req.query.format = 'csv';

    let resMock = sinon.mock(res);
    resMock.expects('set').once().withArgs('Content-Type', 'text/csv');
    resMock.expects('send').once().withArgs(packedData);

    const stubbedPackMiddleware = proxyquire(packProcessorPath, {
      './pack.processor': (rawData, formatType, cb) => {
        //assert
        expect(rawData).to.deep.equal(req.rawData);
        expect(formatType).to.equal(req.query.format);

        cb(null, packedData);

        resMock.verify();
        done();
      }
    });

    //act
    stubbedPackMiddleware(req, res);
  });

  it('should respond with error when error occured and turn off redis cache', done => {
    //arrange
    let expectedError = {message: 'Crash!!!'};

    let resMock = sinon.mock(res);
    resMock.expects('send').never();
    resMock.expects('json').once().withArgs({success: false, error: expectedError});

    const stubbedPackMiddleware = proxyquire(packProcessorPath, {
      '../../../ws.config/log': {
        error: (actualError) => {
          expect(actualError).to.deep.equal(expectedError);
        }
      },
      './pack.processor': (rawData, formatType, cb) => {
        cb(expectedError);

        //assert
        expect(res.use_express_redis_cache).to.equal(false);

        resMock.verify();
        done();
      }
    });

    //act
    stubbedPackMiddleware(req, res);
  });
});
