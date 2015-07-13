'use strict';
var mongoose = require('mongoose');
var async = require('async');
var config = require('./config');
var neo4j = require('node-neo4j');

var collections = ['Coordinates', 'Dimensions', 'DimensionValues', 'Indicators'];

require('../ws.repository/coordinates/coordinates.model');
require('../ws.repository/dimensions/dimensions.model');
require('../ws.repository/dimension-values/dimension-values.model');
require('../ws.repository/indicators/indicators.model');

var mongoUri = 'mongodb://localhost/waffleserver';
var db = mongoose.connection;
mongoose.set('debug', true);
mongoose.connect(mongoUri);

db.on('error', function (err) {
  console.log('db connect error', err);
});

db.once('close', function () {
  console.log('db connect close');
});

db.once('open', open);

function open () {
  console.log('db connect good');

  var neo4jdb = new neo4j(config.NEO4J_DB_URL);

  function getData(options, waterfallcb) {
    options.Model.find({}, {__v: 0}).lean().exec(function (err, docs) {
      return waterfallcb(err, {docs: docs, options: options});
    });
  }

  function doQueries(data, cb) {
    async.forEach(data.docs, function (doc, eachcb) {
      neo4jdb.insertNode(doc, function (err, node) {
        if (err) {
          throw err;
        }

        // Output node id.
        console.log('Added node with _id: ' + node._id);

        return eachcb();
      });
    }, function (err) {
      if (err) {
        return cb(err);
      }

      return cb();
    });
  }

  function importDataCollection(modelName, eachcb) {
    var Model = mongoose.model(modelName);

    async.waterfall([
      function initWaterfall(cb) {
        cb(null, {Model: Model, modelName: modelName});
      },
      getData,
      doQueries
    ], function (err) {
      return eachcb(err);
    });
  }

  async.forEach(collections, importDataCollection, function (err) {
    if (err) {
      console.error(err);
      return;
    }

    console.log('Import data finished successful!');
    db.close();
  });
}
