var _ = require('lodash');
var expect = require('chai').expect;
var RequestProxy = require("request-proxy");

var request = RequestProxy({
  host: "localhost",
  port: 3000
})

var sampleMeta = require('./vizabi/metadata.json');

var meta = {
  color: require('./fixtures/color.json'),
  indicatorsDB: require('./fixtures/indicatorsDB.json'),
  indicatorsTree: require('./fixtures/indicatorsTree.json'),
  entities: require('./fixtures/entities.json')
};

describe('API geo properties', function() {
  describe('when is requested list of all geos', function() {
    it('should not get err', function() {
    });

    it('should be in JSON format', function() {
    });

    it('should be ', function() {
    });
  });
});

describe('Checking API geo properties', function () {
  it('list', function (done) {
    request("/api/geo/", function (err, res, body) {
      expect(err).to.be.null;
      var body = JSON.parse(body);
      expect(body.success).to.be.true;
      var data = body.data;
      var keys = _.keys(data[0]);
      var expectedKeys = ['geo', 'geo.name', 'geo.cat', 'geo.region'];
      expect(keys).to.eql(expectedKeys);
      return done();
    });
  });

  it('regions', function (done) {
    request("/api/geo/regions?v=fdgdfshw", function (err, res, body) {
      expect(err).to.be.null;
      var body = JSON.parse(body);
      expect(body.success).to.be.true;
      var data = body.data;
      var keys = _.keys(data[0]);
      var expectedKeys = ['geo', 'geo.name', 'geo.cat', 'geo.region'];
      var expectedCategories = ['region', 'g_west_rest', 'planet'];
      var notExpectedCategory = 'country';

      expect(keys).to.eql(expectedKeys);
      _.forEach(data, function (row) {
        expect(expectedCategories).to.include(row['geo.cat']);
        expect(row['geo.cat']).to.not.eql(notExpectedCategory);
      });
      return done();
    });
  });

  it('countries', function (done) {
    request("/api/geo/countries?v=3315", function (err, res, body) {
      expect(err).to.be.null;
      var body = JSON.parse(body);
      expect(body.success).to.be.true;
      var data = body.data;
      var keys = _.keys(data[0]);
      var expectedKeys = ['geo', 'geo.name', 'geo.cat', 'geo.region', 'lat', 'lng'];
      var notExpectedCategories = ['region', 'g_west_rest', 'planet'];
      var expectedCategory = 'country';

      expect(keys).to.eql(expectedKeys);
      _.forEach(data, function (row) {
        expect(notExpectedCategories).to.not.include(row['geo.cat']);
        expect(row['geo.cat']).to.eql(expectedCategory);
        expect(row.lat).to.not.be.undefined;
        expect(+row.lat).to.be.a('number');
        expect(isNaN(+row.lat)).to.be.false;
        expect(row.lng).to.not.be.undefined;
        expect(+row.lng).to.be.a('number');
        expect(isNaN(+row.lng)).to.be.false;
      });
      return done();
    });
  });
});
