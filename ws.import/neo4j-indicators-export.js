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
console.time('Mission complete!');
async.waterfall([
  function (cb) {
    return cb(null, {});
  },
  exportIndicators,
  exportDimensions,
  exportDimensionValues,
  exportIndicatorValues,
  createIndexes
], function (err) {
  if (err) {
    throw err;
  }
  console.timeEnd('Mission complete!');
  process.exit(0);
});

// export indicators and build _it to node_id hash set
function exportIndicators(pipe, cb) {
  console.log('Indicators export started');
  console.time('Indicators exported');
  var modelName = 'Indicators';
  var Indicators = mongoose.model(modelName);
  Indicators.find({}, {name: 1, title: 1, coordinates: 1})
    .populate('coordinates', {dimensions: 1})
    .lean()
    .exec(function (err, indicators) {
      console.log('Exporting %s indicators', indicators.length);
      // create indicators
      var batchQuery = _.map(indicators, function (entry, index) {
        return {
          method: 'POST',
          to: '/node',
          body: {name: entry.name, title: entry.title},
          id: index
        };
      });

      // set label to indicators
      _.each(indicators, function (entry, index) {
        batchQuery.push({
          method: 'POST',
          to: '{' + index + '}/labels',
          id: batchQuery.length,
          body: modelName
        });
      });

      return neo4jdb.batchQuery(batchQuery, function (err, indicatorNodes) {
        console.timeEnd('Indicators exported');
        // build indicators hash set
        // indicators from mongo
        pipe.indicators = _.reduce(indicators, function (res, indicator, index) {
          indicator.nodeId = indicatorNodes[index].body.metadata.id;
          res[indicator._id.toString()] = indicator;
          return res;
        }, {});
        return cb(err, pipe);
      });
    });
}

// export indicator dimensions and build hash
function exportDimensions(pipe, cb) {
  var modelName = 'Dimensions';
  console.log(modelName + 'export started');
  console.time(modelName + ' exported');
  var Dimensions = mongoose.model(modelName);
  Dimensions.find({}, {name: 1, title: 1})
    .lean()
    .exec(function (err, dimensions) {
      console.log('Exporting %s ' + modelName, dimensions.length);
      // build indicators hash set
      // indicators from mongo
      pipe.dimensions = _.reduce(dimensions, function (res, dimension) {
        res[dimension._id.toString()] = dimension;
        return res;
      }, {});

      var batchQuery = [];
      var nodeMetas = [];
      _.each(pipe.indicators, function (indicator) {
        var dimensions = indicator.coordinates[0].dimensions;
        _.each(dimensions, function (dimensionId) {
          var dimension = pipe.dimensions[dimensionId.toString()];
          // create indicator dimension node
          var dimensionIndex = batchQuery.length;
          var indicatorNodeId = indicator.nodeId;
          nodeMetas.push({
            dimensionIndex: dimensionIndex,
            indicatorId: indicator._id.toString(),
            dimension: dimension,
            dimensionId: dimension._id.toString()
          });
          batchQuery.push({
            method: 'POST',
            to: '/node',
            body: {name: dimension.name, title: dimension.title},
            id: batchQuery.length
          });

          // set label to dimension
          batchQuery.push({
            method: 'POST',
            to: '{' + dimensionIndex + '}/labels',
            id: batchQuery.length,
            body: modelName
          });

          // set relation [:with_dimension] from indicator to dimension
          batchQuery.push({
            method: 'POST',
            to: '/node/' + indicatorNodeId + '/relationships',
            id: batchQuery.length,
            body: {
              to: '{' + dimensionIndex + '}',
              type: 'with_dimension'
            }
          });
        });
      });

      return neo4jdb.batchQuery(batchQuery, function (err, dimensionNodes) {
        console.timeEnd(modelName + ' exported');
        //// build indicator->dimension hash set
        pipe.dimensionArray = _.map(nodeMetas, function (nodeMeta) {
          return _.merge({
            nodeId: dimensionNodes[nodeMeta.dimensionIndex].body.metadata.id,
            indicatorId: nodeMeta.indicatorId
          }, nodeMeta.dimension);
        });
        //pipe.indicatorDimensions = _.reduce(nodeMetas, function (res, nodeMeta) {
        //  // get dimension node id from response
        //  nodeMeta.dimension.nodeId = dimensionNodes[nodeMeta.dimensionIndex].body.metadata.id;
        //  // set default value for indicator id
        //  res[nodeMeta.indicatorId] = res[nodeMeta.indicatorId] || {};
        //  res[nodeMeta.indicatorId][nodeMeta.dimensionId] = nodeMeta.dimension;
        //  return res;
        //}, {});
        return cb(err, pipe);
      });
    });
}

// export indicator dimension values and build hash
function exportDimensionValues(pipe, cb) {
  var modelName = 'DimensionValues';
  console.log(modelName + ' export started');
  console.time(modelName + ' all exported');
  console.time(modelName + ' exported');
  // create dimensions values per indicator -> per dimensions
  // todo: add distinct value check for each indicator values?
  async.waterfall([
    function (cb) {
      return cb(null, pipe);
    },
    function buildDimensionValuesHash(pipe, cb) {
      var DimensionValues = mongoose.model(modelName);
      DimensionValues.find({}, {dimension: 1, value: 1})
        .lean()
        .exec(function (err, dimensionValues) {
          console.log('Exporting %s ' + modelName, dimensionValues.length);
          // build indicators hash set
          // indicators from mongo
          pipe.dimensionValues = _.groupBy(dimensionValues, 'dimension');
          //pipe.dimensionValues = _.reduce(dimensionValues, function (res, dimensionValue) {
          //  res[dimensionValue._id.toString()] = dimensionValue;
          //  return res;
          //}, {});
          return cb(err, pipe);
        });
    },
    function createNodes(pipe, cb) {
      // per each neo4j dimension
      async.each(pipe.dimensionArray, function (dimension, cb) {
        // get corresponding dimension values
        var dimValues = pipe.dimensionValues[dimension._id.toString()];

        var batchQuery = [];
        var nodesMeta = [];
        _.each(dimValues, function (dimValue) {
          var newNodeIndex = batchQuery.length;
          // create dimension value node
          nodesMeta.push({
            nodeIndex: newNodeIndex,
            dimensionValueId: dimValue._id.toString()
          });
          batchQuery.push({
            method: 'POST',
            to: '/node',
            body: {value: dimValue.value},
            id: batchQuery.length
          });

          // set label to dimension
          batchQuery.push({
            method: 'POST',
            to: '{' + newNodeIndex + '}/labels',
            id: batchQuery.length,
            body: modelName
          });

          // set relation [:with_dimension_value] from dimension o dimension value
          batchQuery.push({
            method: 'POST',
            to: '/node/' + dimension.nodeId + '/relationships',
            id: batchQuery.length,
            body: {
              to: '{' + newNodeIndex + '}',
              type: 'with_dimension_value'
            }
          });
        });

        return neo4jdb.batchQuery(batchQuery, function (err, dimValNodes) {
          console.timeEnd(modelName + ' exported');
          // build indicators hash set
          // indicators from mongo
          var dimValueTree = _.reduce(nodesMeta, function (res, nodeMeta) {
            res[nodeMeta.dimensionValueId] = dimValNodes[nodeMeta.nodeIndex].body.metadata.id;
            return res;
          }, {});
          pipe.dimensionValuesTree = pipe.dimensionValuesTree || {};
          pipe.dimensionValuesTree[dimension.indicatorId] = pipe.dimensionValuesTree[dimension.indicatorId] || {};
          pipe.dimensionValuesTree[dimension.indicatorId][dimension._id.toString()] = dimValueTree;
          //pipe.dimensions = _.reduce(dimensions, function (res, dimension, index) {
          //  dimension.nodeId = indicatorNodes[index].body.metadata.id;
          //  res[dimension._id.toString()] = dimension;
          //  return res;
          //}, {});
          return cb(err, pipe);
        });
      }, cb);
    }
  ], function (err) {
    console.timeEnd(modelName + ' all exported');
    return cb(err, pipe);
  });
}

// export indicator values
function exportIndicatorValues(pipe, cb) {
  var modelName = 'IndicatorValues';
  var IndicatorValues = mongoose.model(modelName);

  console.log(modelName + ' export started');
  console.time(modelName + ' exported');
  IndicatorValues.count({}, function (err, count) {
    if (err) {
      return cb(err);
    }

    if (count === 0) {
      return cb();
    }

    var tasks = [];
    var page = 2000;

    var pages = Math.floor(count / page);
    var lastPage = count % page;
    var i;
    for (i = 0; i < pages; i++) {
      tasks.push({skip: i * page, limit: page});
    }
    tasks.push({skip: i * page, limit: lastPage});

    var counter = pages + 1;
    console.log('Export data values to save: ', counter);
    async.eachLimit(tasks, 1, function (task, cb) {
      var currentCounter = counter--;
      console.time('Export data left to save: ' + currentCounter);
      IndicatorValues.find({}, {v: 1, ds: 1, indicator: 1, _id: 0})
        .skip(task.skip)
        .limit(task.limit)
        .lean()
        .exec(function (err, indicatorValues) {
          var batchQuery = [];
          _.each(indicatorValues, function (indValue) {
            var newNodeIndex = batchQuery.length;

            batchQuery.push({
              method: 'POST',
              to: '/node',
              body: {value: indValue.v},
              id: batchQuery.length
            });

            // set label to indicator value
            batchQuery.push({
              method: 'POST',
              to: '{' + newNodeIndex + '}/labels',
              id: batchQuery.length,
              body: modelName
            });

            _.each(indValue.ds, function (ds) {
              // set relation [:with_dimension_value] from dimension value to indicator value
              var nodeId = pipe.dimensionValuesTree[indValue.indicator.toString()]
                [ds.d.toString()][ds.dv.toString()];
              batchQuery.push({
                method: 'POST',
                to: '/node/' + nodeId + '/relationships',
                id: batchQuery.length,
                body: {
                  to: '{' + newNodeIndex + '}',
                  type: 'with_dimension_value'
                }
              });
            });
          });

          var retries = 0;
          followTheWhiteRabbit();
          function followTheWhiteRabbit(){
            return neo4jdb.batchQuery(batchQuery, function (err, dimensionNodes) {
              if (err && retries++ < 4) {
                console.log('Retry: ' + retries);
                return setTimeout(followTheWhiteRabbit, 500);
              }

              if (err){
                return cb(err);
              }

              console.timeEnd('Export data left to save: ' + currentCounter);
              return cb();
            });
          }
        });
    }, function (err) {
      console.timeEnd(modelName + ' exported');
      return cb(err, pipe);
    });
  });
}

// create indexes and unique constrains
function createIndexes(pipe, cb) {
  async.eachSeries([
    'create index on :Indicators(name)',
    'create index on :Dimensions(name)',
    'create index on :DimensionValues(value)'
  ], function (query, cb) {
    console.time(query);
    return neo4jdb.cypherQuery(query, {}, function(err){
      console.timeEnd(query);
      return cb(err);
    });
  }, cb)
}
