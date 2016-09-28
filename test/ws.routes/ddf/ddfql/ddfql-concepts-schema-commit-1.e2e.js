'use strict';

// const expected = require('./fixtures/...');

const cliUtils = require('./../../../cli.utils.js');
const e2eUtils = require('./../../../e2e.utils');

const expect = require('chai').expect;

before(done => {
   cliUtils.setDefaultCommit('803d9b1', done);
});

it('should .... ', done => {
  const ddfql = {
    "select": {
      "key": ["key","value"]
    },
    "from": "concepts.schema",
  };

  e2eUtils.sendDdfqlRequest(ddfql, (error, response) => {
    expect(response.body).to.deep.equal({});
    done();
  });
});
