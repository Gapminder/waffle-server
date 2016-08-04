'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const api = require('supertest')('http://localhost:3000');

describe('WS Stats endpoint', () => {
  it('should be accessible concepts route', (done) => {
    api.get('/api/ddf/concepts')
      .set('Accept', 'application/json')
      .expect(200, done);
  });

  it.skip('should return all concepts by default"', (done) => {
    const expectedValues = ["geo", "geographic_regions", "landlocked", "main_religion_2008", "country", "world_4region", "global", "latitude", "longitude", "electricity_generation_total", "epidemic_affected_annual_number", "hourly_compensation_us", "description", "indicator_url", "name", "unit", "name_short", "name_long", "color", "gapminder_list", "god_id", "code", "number", "gwid", "domain", "scales", "drill_up", "time"];
    api.get('/api/ddf/concepts')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res).to.be.not.empty;
        expect(res.body).to.be.not.empty;
        expect(res.body).to.have.property('concepts');
        expect(res.body.concepts).to.have.property('values');
        expect(res.body.concepts).to.have.property('properties');
        expect(res.body.concepts).to.have.property('propertyValues');
        expect(res.body.concepts).to.have.property('rows');

        expect(res.body.concepts.values).to.include.members(expectedValues);

        done();
      })
  });

  it.skip('should return "geo.latitude, geo.name. geo" given in query select', (done) => {
    api.get('/api/graphs/stats/vizabi-tools?select=geo.latitude,geo.name,geo')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res.body).to.have.property('headers');
        expect(res.body.headers).to.deep.equal(['geo.latitude','geo.name','geo']);

        expect(res.body).to.have.property('rows');
        expect(res.body.rows).to.be.not.empty;
        expect(res.body.rows[0]).to.have.length(3);

        done();
      })
  });

  it.skip('should respond to "geo.latitude,geo.name,geo" select and filter by "geo=chn"', (done) => {
    api.get('/api/graphs/stats/vizabi-tools?select=geo.latitude,geo.name,geo&geo=chn')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res.body).to.have.property('headers');
        expect(res.body.headers).to.deep.equal(['geo.latitude','geo.name','geo']);

        expect(res.body).to.have.property('rows');
        expect(res.body.rows).to.be.not.empty;
        expect(res.body.rows[0]).to.have.length(3);

        const uniqGeos = _.uniq(res.body.rows, '2');
        expect(uniqGeos).to.have.length(1);
        expect(uniqGeos[0][0]).to.equal(35);
        expect(uniqGeos[0][1]).to.equal('China');
        expect(uniqGeos[0][2]).to.equal('chn');

        done();
      })
  });

  it.skip('should respond to "geo.lat,geo.name,geo.cat,geo" select and filter by "geo.cat=country,region"', (done) => {
    api.get('/api/graphs/stats/vizabi-tools?select=geo.latitude,geo.name,geo.cat,geo&geo.cat=country,region')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res.body).to.have.property('headers');
        expect(res.body.headers).to.deep.equal(['geo.latitude','geo.name', 'geo.cat','geo']);

        expect(res.body).to.have.property('rows');
        expect(res.body.rows).to.be.not.empty;
        expect(res.body.rows[0]).to.have.length(4);

        const actuaGeolCategories =
          _.chain(res.body.rows)
            .map('2')
            .uniq()
            .value();

        expect(actuaGeolCategories).to.have.length(2);
        // expect(actuaGeolCategories).to.contain('un_state');
        expect(actuaGeolCategories).to.contain('world_4region');
        expect(actuaGeolCategories).to.contain('country');

        done();
      })
  });

  it.skip('should respond to "geo.lat,geo.name,geo.cat,geo" select and filter by "geo.cat=country,region&geo=chn"', (done) => {
    api.get('/api/graphs/stats/vizabi-tools?select=geo.latitude,geo.name,geo.cat,geo&geo.cat=country,region&geo=chn')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res.body).to.have.property('headers');
        expect(res.body.headers).to.deep.equal(['geo.latitude','geo.name', 'geo.cat','geo']);

        expect(res.body).to.have.property('rows');
        expect(res.body.rows).to.be.not.empty;
        expect(res.body.rows[0]).to.have.length(4);

        const actuaGeolCategories =
          _.chain(res.body.rows)
            .map('2')
            .uniq()
            .value();

        expect(actuaGeolCategories).to.have.length(1);

        //FIXME: chn should be country but it is stored like un_state currently. This test will fail and need to be fixed when it comes back to country
        expect(actuaGeolCategories).to.contain('country');

        done();
      })
  });

  function isStringOrNull (item) {
    return typeof item === 'number' || item === null;
  }

  function isNumberOrNull (item) {
    return typeof item === 'number' || item === null;
  }
});
