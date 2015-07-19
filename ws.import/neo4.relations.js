'use strict';
var _ = require('lodash');
var async = require('async');
var Neo4j = require('node-neo4j');
var express = require('express');
var mongoose = require('mongoose');

require('../ws.config');
var config = require('./config');

var app = express();
var serviceLocator = require('../ws.service-locator')(app);
require('../ws.repository')(serviceLocator);
var neo4jdb = new Neo4j(config.NEO4J_DB_URL);

createRelations(console.log.bind(console));

function createRelations(cb) {
  async.series([
    function createIndicators(cb) {
      console.time('has_indicator_values');
      neo4jdb.cypherQuery('create index on :IndicatorValues(indicator)', {}, function (err) {
        if (err) {
          return cb(err);
        }

        neo4jdb.cypherQuery('MATCH (n:Indicators),(u:IndicatorValues) ' +
          'where n._id = u.indicator ' +
          // 'remove n._id, n.coordinates, n.analysisSessions ' +
          'create (n)-[:has_indicator_values]->(u)', {}, function (err) {
          console.timeEnd('has_indicator_values');
          return cb(err);
        });
      });
    },
    function createDimensions(cb) {
      console.time('has_dimension_values');
      neo4jdb.cypherQuery('create index on :DimensionValues(dimension)', {}, function (err) {
        if (err) {
          return cb(err);
        }

        neo4jdb.cypherQuery('MATCH (d:Dimensions),(dv:DimensionValues) ' +
          'where d._id = dv.dimension ' +
          // 'remove d._id, d.analysisSessions ' +
          'create (d)-[:has_dimension_values]->(dv)', {}, function (err) {
          console.timeEnd('has_dimension_values');
          return cb(err);
        });
      });
    }, function createIndicatorValues(cb) {
      neo4jdb.cypherQuery('create index on :IndicatorValues(ds)', {}, function (err) {
        if (err) {
          return cb(err);
        }

        neo4jdb.cypherQuery('create index on :IndicatorValues(indicator)', {}, function (err) {
          if (err) {
            return cb(err);
          }
          console.time('with_dimension_values');
          var Indicators = mongoose.model('Indicators');
          Indicators.distinct('_id', function (err, indicators) {
            if (err) {
              return cb(err);
            }

            async.eachLimit(indicators, 1, function (indicator, cb) {
              console.time('with_dimension_values ' + indicator);
              neo4jdb.cypherQuery('MATCH (n:IndicatorValues),(u:DimensionValues) ' +
                'where n.indicator = {id} and u._id in n.ds ' +
                'create (n)-[:with_dimension_values]->(u)' + ''
                // 'remove n._id, n.coordinates, n.indicator, n.analysisSessions, n.ds, ' +
                // 'u._id, u.analysisSessions, u.dimension '
                , {
                id: indicator
              }, function (err) {
                console.timeEnd('with_dimension_values ' + indicator);
                return cb(err)
              });
            }, function (err) {
              console.timeEnd('with_dimension_values');
              return cb(err)
            });
          });
        });
      });
    }
  ], cb);
}
