'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const api = require('supertest')('http://localhost:3000');

describe('WS Routes for metadata', () => {
  it('should be accessible', (done) => {
    api.get('/api/meta')
      .set('Accept', 'application/json')
      .expect(200, done);
  });

  it('should return all data ', (done) => {
    api.get('/api/meta')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res).to.be.not.empty;
        expect(res.body).to.be.not.empty;
        expect(res.body.data).to.be.an('object');

        let keysData = _.keys(res.body.data);

        expect(keysData).to.have.length.of.at.least(25);
        expect(keysData).to.deep.equal([
          "child_mortality_rate_per1000",
          "child_mortality_rate_percent",
          "co2_emission",
          "co2_emission_p_cap",
          "country",
          "date",
          "fertility_rate",
          "gdp_const_ppp2011_dollar",
          "gdp_p_cap_const_ppp2011_dollar",
          "geo",
          "gini",
          "global",
          "latitude",
          "life_expectancy",
          "longitude",
          "month",
          "population",
          "quarter",
          "time_interval",
          "time_step",
          "time_utc",
          "un_state",
          "week",
          "world_4region",
          "year"
        ]);

        done();
      })
  });

  it('should return "geo" ', (done) => {
    api.get('/api/meta?select=geo')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res).to.be.not.empty;
        expect(res.body).to.be.not.empty;
        expect(res.body.data).to.have.any.keys('geo');
        expect(res.body.data).to.be.an('object');
        expect(res.body.data.geo.defaultEntities).to.deep.equal(["world", "asia", "europe", "africa", "america"]);

        done();
      })
  });


  it('should return "geo.name" ', (done) => {
    api.get('/api/meta?select=geo.name')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res).to.be.not.empty;
        expect(res.body).to.be.not.empty;
        expect(res.body.data).to.be.an('object');
        expect(res.body.data.geo).to.deep.equal({"name": "Geography"});

        done();
      })
  });

  it('should return "population, geo, year.name" ', (done) => {
    api.get('/api/meta?select=population,geo,year.name')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res).to.be.not.empty;
        expect(res.body).to.be.not.empty;
        expect(res.body.data).to.be.an('object');
        expect(res.body.data).to.have.any.keys('population', 'geo', 'year');
        expect(res.body.data.population).to.be.not.empty;
        expect(res.body.data.geo).to.be.not.empty;
        expect(res.body.data.year).to.be.not.empty;

        done();
      })
  });

  it('should return empty object, entered not valid data', (done) => {
    api.get('/api/meta?select=abcd')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res).to.be.not.empty;
        expect(res.body).to.be.not.empty;
        expect(res.body.data).to.be.empty;
        expect(res.body.data).to.be.an('object');
        done();
      })
  });

});
