// Converter Class
var _ = require('lodash');
//var fs = require('fs');
//var async = require('async');
//var Converter = require('csvtojson').Converter;
//

var expect = require('chai').expect;

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/ws_test');
//mongoose.set('debug', true);
require('../ws.repository/geo.model');
require('../ws.repository/dimensions/dimensions.model');
require('../ws.repository/translations.model');
var Geo = mongoose.model('Geo');

var sampleMeta = require('./vizabi/metadata.json');

var meta = {
  color: require('./fixtures/color.json'),
  indicatorsDB: require('./fixtures/indicatorsDB.json'),
  indicatorsTree: require('./fixtures/indicatorsTree.json'),
  entities: require('./fixtures/entities.json')
};

describe('vizabi metadata', function () {
  before(function (done) {
    Geo.find({isTerritory: true}, {_id: 0, gid: 1, name: 1}, function (err, geos) {
      meta.entities = _.map(geos, function (geo) {
        return {geo: geo.gid, name: geo.name};
      });
      return done(err);
    });
  });

  it('entities should contain all data', function () {
    var sampleMetaEntities = _.reduce(sampleMeta, function(res, value){
      res[value.geo] = value.name;
      return res;
    }, {});
    var metaEntities = _.reduce(sampleMeta, function(res, value){
      res[value.geo] = value.name;
      return res;
    }, {});
    expect(sampleMetaEntities).to.be.deep.equal(metaEntities);
    expect(Object.keys(sampleMetaEntities).length).to.be.equal(Object.keys(metaEntities).length);
  });
});
