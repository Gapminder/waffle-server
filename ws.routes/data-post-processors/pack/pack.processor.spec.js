'use strict';

const assert = require('assert');
const pack = require('./pack.processor.js');
const _ = require('lodash');

xdescribe('pack data post processor to default formats (csv, json, ws-json)', () => {
  it('should pack input data as CSV', (done) => {
    let input = {
      headers: ['geo', 'year', 'gini'],
      rows: [
        ["usa", 2004, 42],
        ["usa", 2005, 42],
        ["usa", 2006, 42],
        ["usa", 2007, 42],
        ["usa", 2008, 42],
        ["usa", 2009, 42],
        ["usa", 2010, 42]
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
      assert.deepEqual(csv, expected);
      done();
    });
  });

  it('should pack input data as JSON', (done) => {
    let input = {
      headers: ['geo', 'year', 'gini'],
      rows: [
        ["usa", 2004, 42],
        ["usa", 2005, 42],
        ["usa", 2006, 42],
        ["usa", 2007, 42],
        ["usa", 2008, 42],
        ["usa", 2009, 42],
        ["usa", 2010, 42]
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
      assert.deepEqual(json, expected);
      done();
    });
  });

  it('should respond with WsJson by default', (done) => {
    let input = {
      headers: ['geo', 'year', 'gini'],
      rows: [
        ["usa", 2004, 42],
        ["usa", 2005, 42],
        ["usa", 2006, 42],
        ["usa", 2007, 42],
        ["usa", 2008, 42],
        ["usa", 2009, 42],
        ["usa", 2010, 42]
      ]
    };

    pack(input, 'bla-bla', (err, wsJson) => {
      assert.deepEqual(wsJson, input);
      done();
    });
  });
});
