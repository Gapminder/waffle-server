'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const api = require('supertest')('http://localhost:3000');
const limitRows = 1000;

describe('WS Stats endpoint', () => {
  it('should be accessible', (done) => {
    api.get('/api/graphs/stats/vizabi-tools')
      .set('Accept', 'application/json')
      .expect(200, done);
  });

  it('should return "geo, geo.name. geo.cat. geo.region" by default"', (done) => {
    api.get('/api/graphs/stats/vizabi-tools')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res).to.be.not.empty;
        expect(res.body).to.be.not.empty;
        expect(res.body).to.have.property('headers');
        expect(res.body.headers).to.deep.equal(['geo','geo.name','geo.cat','geo.region']);

        expect(res.body).to.have.property('rows');
        expect(res.body.rows).to.be.not.empty;
        expect(res.body.rows[0]).to.have.length(4);
        expect(res.body.rows).to.have.length.of.at.least(280);

        done();
      })
  });

  it('should return "geo.latitude, geo.name. geo" given in query select', (done) => {
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

  it('should respond to "geo.latitude,geo.name,geo" select and filter by "geo=chn"', (done) => {
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

  it('should respond to "geo.lat,geo.name,geo.cat,geo" select and filter by "geo.cat=country,region"', (done) => {
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

  it('should respond to "geo.lat,geo.name,geo.cat,geo" select and filter by "geo.cat=country,region&geo=chn"', (done) => {
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

  it('should respond to "geo,time" select', (done) => {
    api.get('/api/graphs/stats/vizabi-tools?select=geo,time')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res.body).to.have.property('headers');
        expect(res.body.headers).to.deep.equal(['geo', 'time']);

        expect(res.body).to.have.property('rows');
        expect(res.body.rows).to.be.not.empty;
        expect(res.body.rows[0]).to.have.length(2);

        const uniqCountryValues =_.chain(res.body.rows)
          .map('0')
          .uniq()
          .value();

        expect(uniqCountryValues).to.have.length.of.at.least(280);

        const uniqTimeValues =_.chain(res.body.rows)
          .map('1')
          .uniq()
          .value();

        let numberDefaultYears = _.range(1800, 2101).length;
        expect(uniqTimeValues).to.have.length.of.at.least(numberDefaultYears);

        done();
      })
  });

  it('should respond to "time,geo" select', (done) => {
    api.get('/api/graphs/stats/vizabi-tools?select=time,geo')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res.body).to.have.property('headers');
        expect(res.body.headers).to.deep.equal(['time', 'geo']);

        expect(res.body).to.have.property('rows');
        expect(res.body.rows).to.be.not.empty;
        expect(res.body.rows[0]).to.have.length(2);

        const uniqCountryValues =_.chain(res.body.rows)
          .map('1')
          .uniq()
          .value();

        expect(uniqCountryValues).to.have.length.of.at.least(280);

        const uniqTimeValues =_.chain(res.body.rows)
          .map('0')
          .uniq()
          .value();

        // _.range(1800, 2101).length === 301
        let numberDefaultYears = _.range(1800, 2101).length;
        expect(uniqTimeValues).to.have.length.of.at.least(numberDefaultYears);

        done();
      })
  });

  it('should respond to "geo,time,sg_population,sg_gini" select, given "geo=usa&sort=time:asc"', (done) => {
    api.get('/api/graphs/stats/vizabi-tools?select=geo,time,sg_population,sg_gini&geo=usa&sort=time:asc')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res.body).to.have.property('headers');
        expect(res.body.headers).to.deep.equal(['geo', 'time', 'sg_population', 'sg_gini']);

        expect(res.body).to.have.property('rows');
        expect(res.body.rows).to.be.not.empty;
        expect(res.body.rows[0]).to.have.length(4);

        expect(res.body.rows[0][0]).to.be.a('string');
        expect(res.body.rows[0][1]).to.be.a('number');
        expect(res.body.rows[0][2]).to.satisfy(isNumberOrNull);
        expect(res.body.rows[0][3]).to.satisfy(isNumberOrNull);

        const uniqCountryValues =_.chain(res.body.rows)
          .map('0')
          .uniq()
          .value();

        expect(uniqCountryValues).to.have.length(1);
        expect(uniqCountryValues[0]).to.equal('usa');

        done();
      })
  });

  it('should respond to "geo,time,sg_population,sg_gini" select, given "time=1800"', (done) => {
    api.get('/api/graphs/stats/vizabi-tools?select=geo,time,sg_population,sg_gini&time=1800')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res.body).to.have.property('headers');
        expect(res.body.headers).to.deep.equal(['geo', 'time', 'sg_population', 'sg_gini']);

        expect(res.body).to.have.property('rows');
        expect(res.body.rows).to.be.not.empty;
        expect(res.body.rows[0]).to.have.length(4);

        expect(res.body.rows[0][0]).to.be.a('string');
        expect(res.body.rows[0][1]).to.be.a('number');
        expect(res.body.rows[0][2]).to.satisfy(isNumberOrNull);
        expect(res.body.rows[0][3]).to.satisfy(isNumberOrNull);

        const uniqTimeValues =_.chain(res.body.rows)
          .map('1')
          .uniq()
          .value();

        expect(uniqTimeValues).to.have.length(1);
        expect(uniqTimeValues[0]).to.equal(1800);

        done();
      })
  });

  it('should respond to "geo,time,sg_population,sg_gini" select, given "time=2000:2010&sort=time:asc"', (done) => {
    api.get('/api/graphs/stats/vizabi-tools?select=geo,time,sg_population,sg_gini&time=2000:2010&sort=time:asc')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res.body).to.have.property('headers');
        expect(res.body.headers).to.deep.equal(['geo', 'time', 'sg_population', 'sg_gini']);

        expect(res.body).to.have.property('rows');
        expect(res.body.rows).to.be.not.empty;
        expect(res.body.rows[0]).to.have.length(4);

        const uniqTimeValues =_.chain(res.body.rows)
          .map('1')
          .uniq()
          .value();

        expect(uniqTimeValues).to.have.length(11);
        expect(uniqTimeValues).to.deep.equal(_.range(2000, 2011));

        done();
      })
  });

  it('should respond to "geo,time,sg_population,sg_gini" select, given "geo=africa,usa&time=1800,2000:2005,2015"', (done) => {
    api.get('/api/graphs/stats/vizabi-tools?select=geo,time,sg_population,sg_gini&geo=africa,usa&time=1800,2000:2005,2015')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res).to.be.not.empty;
        expect(res.body).to.be.not.empty;
        expect(res.body).to.have.property('headers');
        expect(res.body.headers).to.deep.equal(['geo', 'time', 'sg_population', 'sg_gini']);

        expect(res.body).to.have.property('rows');
        expect(res.body.rows).to.be.not.empty;

        _.forEach(res.body.rows, (row, key) => {
          expect(row).to.have.length(4);
          expect(row[0]).to.be.a('string');
          expect(row[1]).to.be.a('number');
          expect(row[2]).to.satisfy(isNumberOrNull);
          expect(row[3]).to.satisfy(isNumberOrNull);
          return (key < limitRows);
        });

        const uniqTimeValues =_.chain(res.body.rows).map('1').uniq().sort().value();
        const expectedYears = [1800, 2000, 2001, 2002, 2003, 2004, 2005, 2015];

        expect(uniqTimeValues).to.have.length.below(expectedYears.length + 1);
        expect(_.pullAll(uniqTimeValues, expectedYears)).to.be.empty;

        const uniqGeoValues =_.chain(res.body.rows).map('0').uniq().sort().value();
        const expectedGeos = ["africa", "usa"];

        expect(uniqGeoValues).to.have.length.below(expectedGeos.length + 1);
        expect(_.pullAll(uniqGeoValues,expectedGeos)).to.be.empty;

        done();
      })
  });

  // TODO: not all data were imported (global and worl_4region data is absent for now)
  xit('should respond to "geo,time,sg_population,sg_gini" select, given "geo.cat=global,world_4region"', (done) => {
    api.get('/api/graphs/stats/vizabi-tools?select=geo,time,sg_population,sg_gini&geo.cat=global,world_4region')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res.body).to.have.property('headers');
        expect(res.body.headers).to.deep.equal(['geo', 'time', 'sg_population', 'sg_gini']);

        expect(res.body).to.have.property('rows');
        expect(res.body.rows).to.be.not.empty;

        _.forEach(res.body.rows, (row, key) => {
          expect(row).to.have.length(4);
          expect(row[0]).to.be.a('string');
          expect(row[1]).to.be.a('number');
          expect(row[2]).to.satisfy(isNumberOrNull);
          expect(row[3]).to.satisfy(isNumberOrNull);
          return (key < limitRows);
        });

        const uniqTimeValues =_.chain(res.body.rows).map('1').uniq().value();

        expect(uniqTimeValues).to.have.length.of.at.least(1);

        const uniqGeoValues =_.chain(res.body.rows).map('0').uniq().sort().value();
        const expectedGeos = ["africa", "americas", "asia", "europe", "world"];
        expect(uniqGeoValues).to.have.length.below(expectedGeos.length + 1);
        expect(_.pullAll(uniqGeoValues, expectedGeos)).to.be.empty;

        done();
      })
  });

  it('should respond to "geo,time,sg_population,sg_gini" select, given "geo.region=asia&time=1800"', (done) => {
    api.get('/api/graphs/stats/vizabi-tools?select=time,sg_population,sg_gini,geo&geo.region=asia&time=1800')
      .set('Accept', 'application/json')
      .expect(200)
      .end((err, res) => {
        expect(res.body).to.have.property('headers');
        expect(res.body.headers).to.deep.equal(['time', 'sg_population', 'sg_gini', 'geo']);

        expect(res.body).to.have.property('rows');
        expect(res.body.rows).to.be.not.empty;

        _.forEach(res.body.rows, (row, key) => {
          expect(row).to.have.length(4);
          expect(row[0]).to.be.a('number');
          expect(row[1]).to.satisfy(isNumberOrNull);
          expect(row[2]).to.satisfy(isNumberOrNull);
          expect(row[3]).to.be.a('string');
          return (key < limitRows);
        });


        const uniqTimeValues =_.chain(res.body.rows).map('0').uniq().value();

        expect(uniqTimeValues).to.have.length(1);
        expect(uniqTimeValues[0]).to.equal(1800);

        const uniqGeoValues =_.chain(res.body.rows).map('3').uniq().sort().value();
        expect(uniqGeoValues).to.have.length.of.at.least(1);

        done();
      })
  });

  function isNumberOrNull (item) {
    return typeof item === 'number' || item === null;
  }
});
