'use strict';

const chai = require('chai');
const pack = require('./../../../../ws.routes/data-post-processors/pack/pack.processor.js');

const expect = chai.expect;

describe('data post processors pack csv, json, wsJson', () => {
  xit('should pack input data as CSV', done => {
    let input = {
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
        ],
        [
          "usa",
          2005,
          42
        ],
        [
          "usa",
          2006,
          42
        ],
        [
          "usa",
          2007,
          42
        ],
        [
          "usa",
          2008,
          42
        ],
        [
          "usa",
          2009,
          42
        ],
        [
          "usa",
          2010,
          42
        ]
      ]
    };

    let expected = [
      '"geo","year","gini"',
      '"usa",2004,42',
      '"usa",2005,42',
      '"usa",2006,42',
      '"usa",2007,42',
      '"usa",2008,42',
      '"usa",2009,42',
      '"usa",2010,42'
    ].join('\n');

    pack(input, 'csv', (err, csv) => {
      expect(csv).to.deep.equal(expected);
      done();
    });
  });

  xit('should pack input data as JSON', done => {
    let input = {
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
        ],
        [
          "usa",
          2005,
          42
        ],
        [
          "usa",
          2006,
          42
        ],
        [
          "usa",
          2007,
          42
        ],
        [
          "usa",
          2008,
          42
        ],
        [
          "usa",
          2009,
          42
        ],
        [
          "usa",
          2010,
          42
        ]
      ]
    };

    let expected = [
      {
        "geo": "usa",
        "year": 2004,
        "gini": 42
      },
      {
        "geo": "usa",
        "year": 2005,
        "gini": 42
      },
      {
        "geo": "usa",
        "year": 2006,
        "gini": 42
      },
      {
        "geo": "usa",
        "year": 2007,
        "gini": 42
      },
      {
        "geo": "usa",
        "year": 2008,
        "gini": 42
      },
      {
        "geo": "usa",
        "year": 2009,
        "gini": 42
      },
      {
        "geo": "usa",
        "year": 2010,
        "gini": 42
      }
    ];

    pack(input, 'json', (err, json) => {
      expect(json).to.deep.equal(expected);
      done();
    });
  });

  xit('should respond with WsJson by default', done => {
    let input = {
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
        ],
        [
          "usa",
          2005,
          42
        ],
        [
          "usa",
          2006,
          42
        ],
        [
          "usa",
          2007,
          42
        ],
        [
          "usa",
          2008,
          42
        ],
        [
          "usa",
          2009,
          42
        ],
        [
          "usa",
          2010,
          42
        ]
      ]
    };

    pack(input, 'bla-bla', (err, wsJson) => {
      expect(wsJson).to.deep.equal(input);
      done();
    });
  });
});
