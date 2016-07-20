import test from 'ava';
import pack from './pack.processor.js';

test.skip.cb('should pack input data as CSV', assert => {
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
    assert.end();
  });
});

test.skip.cb('should pack input data as JSON', assert => {
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
    assert.end();
  });
});

test.skip.cb('should respond with WsJson by default', assert => {
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
    assert.end();
  });
});
