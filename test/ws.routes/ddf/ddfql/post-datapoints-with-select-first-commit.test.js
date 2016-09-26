'use strict';

const shell = require('shelljs');
const express = require('express');
const git = require('simple-git');
const api = require('supertest')('http://localhost:3000');

const expect = require('chai').expect;

const testUtils = require('./cli.utils.js');

function setDefaultSecondCommitByCLI(onSetDefaultSecondCommitByCLIDone) {
  const setDefaultcommand = `REPO=git@github.com:VS-work/ddf--gapminder--systema_globalis--light.git COMMIT=803d9b1 LOGIN=dev@gapminder.org PASS=123 npm run set-default`;
  shell.cd('../../waffle-server-import-cli');
  return shell.exec(setDefaultcommand, (error) => {
    console.log('** chose default set');

    return onSetDefaultSecondCommitByCLIDone(error);
  });
}

before(() => {
  console.log('Set default first commit');

  return setDefaultSecondCommitByCLI(done);
});

it('Check POST request: datapoints with select when default dataset was set', done => {
  api.post(`/api/ddf/ql?format=wsJson`)
    .send({
      "select": {
        "key": ["geo", "time"],
        "value": [
          "population_total", "life_expectancy_years"
        ]
      },
      "from": "datapoints",
      "where": {
        "$and": [
          {"geo": "$geo"},
          {"time": "$time"},
          {
            "$or": [
              {"population_total": {"$gt": 100000}, "time": "$time2"},
              {"life_expectancy_years": {"$gt": 30, "$lt": 70}}
            ]
          }
        ]
      },
      "join": {
        "$geo": {
          "key": "geo",
          "where": {
            "$and": [
              {"is--country": true},
              {"latitude": {"$lte": 0}}
            ]
          }
        },
        "$time": {
          "key": "time",
          "where": {
            "time": {"$lt": "2015"}
          }
        },
        "$time2": {
          "key": "time",
          "where": {
            "time": {"$eq": "1918"}
          }
        }
      }
    })
    .set('Accept', 'application/x-json')
    .expect(200)
    .expect('Content-Type', /application\/json/)
    .end((error, res) => {
      const headers = [
        "geo",
        "time",
        "population_total",
        "life_expectancy_years"
      ];
      let datapoints = res.body.rows;


      expect(res.body.headers).to.deep.equal(headers);
      expect(res.body.rows.length).to.deep.equal(7020);
      datapoints.forEach(function (row) {
        for (let i = 0; i < row.length; i++) {
          expect(typeof(row[0]) === 'string').to.be.true;
          expect(typeof(row[1]) === 'number').to.be.true;
          expect(row.length === 4).to.be.true;
        }
      });


      done();
    });
});


