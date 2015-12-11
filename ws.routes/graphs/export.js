var _ = require('lodash');
var async = require('async');
var express = require('express');
var mongoose = require('mongoose');

//var ensureAuthenticated = require('../utils').ensureAuthenticated;
var ensureAuthenticated = function (req, res, next) {
  return next();
};

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var neo4jdb = app.get('neo4jDb');

  /*eslint new-cap:0*/
  var router = express.Router();

  // fix: single thread hack :)
  var isExportInProgress = false;
  router.get('/api/graphs/export', ensureAuthenticated, exportAllGraphs);

  return app.use(router);

  function exportAllGraphs(req, res, next) {
    if (isExportInProgress) {
      return res.json({success: true, msg: 'Export already in progress!'});
    }
    isExportInProgress = true;
    console.time('Mission complete!');
    async.waterfall([
      function (cb) {
        return cb(null, {});
      },
      cleanGraph,
      // unique
      exportIndicators,
      exportDimensions,
      exportDimensionValues,
      // dependant
      exportIndicatorDimensions,
      exportIndicatorDimensionValues,
      // stats
      exportIndicatorValues,
      createIndexes
    ], function (err) {
      if (err) {
        throw err;
      }
      console.timeEnd('Mission complete!');
      isExportInProgress = false;
      return res.json({success: true, msg: 'Upload complete'});
    });
  }

// todo: implement full neo4j cleanup
  function cleanGraph(pipe, cb) {
    neo4jdb.cypherQuery('match ()-[r]-() delete r;', function () {
      neo4jdb.cypherQuery('match (n) delete n;', function () {
        return cb(null, pipe);
      });
    });
  }

// export indicators and build _it to node_id hash set
  function exportIndicators(pipe, cb) {
    console.log('Indicators export started');
    console.time('Indicators exported');
    var modelName = 'Indicators';
    var Indicators = mongoose.model(modelName);
    Indicators.find({}, {name: 1, title: 1, units: 1, dimensions: 1})
      .populate('dimensions')
      .lean()
      .exec(function (err, indicators) {
        console.log('Exporting %s indicators', indicators.length);
        // create indicators
        var batchQuery = _.map(indicators, function (indicator, index) {
          return {
            method: 'POST',
            to: '/node',
            body: {name: indicator.name, title: indicator.title},
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
          if (err) {
            return cb(err);
          }
          // build indicators hash set
          // indicators from mongo
          pipe.indicators = _.reduce(indicators, function (res, indicator, index) {
            indicator.nodeId = indicatorNodes[index].body.metadata.id;
            // todo: set nodeId back to mongo indicator
            res[indicator._id.toString()] = indicator;
            return res;
          }, {});
          // todo: update mongodb
          return cb(err, pipe);
        });
      });
  }

// export dimensions
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
        pipe.dimensions = _.indexBy(dimensions, function (dimension) {
          return dimension._id.toString();
        });

        var batchQuery = [];
        var nodeMetas = [];
        _.each(dimensions, function (dimension) {
          // create indicator dimension node
          var dimensionIndex = batchQuery.length;
          nodeMetas.push({
            dimensionIndex: dimensionIndex,
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
            body: 'u' + modelName
          });
        });

        return neo4jdb.batchQuery(batchQuery, function (err, dimensionNodes) {
          console.timeEnd(modelName + ' exported');
          // build indicator->dimension hash set
          pipe.uniqueDimensionArray = _.map(nodeMetas, function (nodeMeta) {
            return _.merge({
              nodeId: dimensionNodes[nodeMeta.dimensionIndex].body.metadata.id
            }, nodeMeta.dimension);
          });
          pipe.uniqueDimensionHash = _.indexBy(pipe.uniqueDimensionArray, 'dimensionId');
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
        DimensionValues.find({}, {dimension: 1, value: 1, title: 1})
          .lean()
          .exec(function (err, dimensionValues) {
            console.log('Exporting %s ' + modelName, dimensionValues.length);
            // build indicators hash set
            // indicators from mongo
            pipe.dimensionValues = _.groupBy(dimensionValues, function (dv){
              return dv.dimension.toString();
            });
            return cb(err, pipe);
          });
      },
      function createNodes(pipe, cb) {
        // per each neo4j dimension
        async.eachLimit(pipe.uniqueDimensionArray, 10, function (dimension, cb) {
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
              body: {value: dimValue.value, title: dimValue.title},
              id: batchQuery.length
            });

            // set label to dimension
            batchQuery.push({
              method: 'POST',
              to: '{' + newNodeIndex + '}/labels',
              id: batchQuery.length,
              body: 'u' + modelName
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

            pipe.uniqDimValueTree = pipe.uniqDimValueTree || {};
            pipe.uniqDimValueTree[dimension._id.toString()] = dimValueTree;
            return cb(err, pipe);
          });
        }, cb);
      }
    ], function (err) {
      console.timeEnd(modelName + ' all exported');
      return cb(err, pipe);
    });
  }

// export indicator dimensions and build hash
  function exportIndicatorDimensions(pipe, cb) {
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
          _.each(indicator.dimensions, function (dimension) {
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
          // build indicator->dimension hash set
          pipe.dimensionArray = _.map(nodeMetas, function (nodeMeta) {
            return _.merge({
              nodeId: dimensionNodes[nodeMeta.dimensionIndex].body.metadata.id,
              indicatorId: nodeMeta.indicatorId
            }, nodeMeta.dimension);
          });
          return cb(err, pipe);
        });
      });
  }

// export indicator dimension values and build hash
  function exportIndicatorDimensionValues(pipe, cb) {
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
        DimensionValues.find({}, {dimension: 1, value: 1, title: 1})
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
              body: {value: dimValue.value, title: dimValue.title},
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
      var page = 1500;

      var pages = Math.floor(count / page);
      var lastPage = count % page;
      var i;
      for (i = 0; i < pages; i++) {
        tasks.push({skip: i * page, limit: page});
      }
      tasks.push({skip: i * page, limit: lastPage});

      var counter = pages + 1;
      console.log('Export data values to save: ', counter);
      async.eachSeries(tasks, function (task, cb) {
        var currentCounter = counter--;
        console.time('Export data left to save: ' + currentCounter);
        IndicatorValues.find({}, {value: 1, coordinates: 1, indicator: 1, _id: 0})
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
                body: {value: indValue.value},
                id: batchQuery.length
              });

              // set label to indicator value
              batchQuery.push({
                method: 'POST',
                to: '{' + newNodeIndex + '}/labels',
                id: batchQuery.length,
                body: modelName
              });

              _.each(indValue.coordinates, function (coordinate) {
                // set relation [:with_dimension_value] from dimension value to indicator value
                var nodeId = pipe.dimensionValuesTree
                  [indValue.indicator.toString()]
                  [coordinate.dimension.toString()]
                  [coordinate.dimensionValue.toString()];
                batchQuery.push({
                  method: 'POST',
                  to: '/node/' + nodeId + '/relationships',
                  id: batchQuery.length,
                  body: {
                    to: '{' + newNodeIndex + '}',
                    type: 'with_indicator_value'
                  }
                });

                var dimNodeId = pipe.uniqDimValueTree[coordinate.dimension.toString()][coordinate.dimensionValue.toString()];

                batchQuery.push({
                  method: 'POST',
                  to: '{' + newNodeIndex + '}' + '/relationships',
                  id: batchQuery.length,
                  body: {
                    to: '/node/' + dimNodeId,
                    type: 'with_dimension_value'
                  }
                });
              });
            });

            var retries = 0;
            followTheWhiteRabbit();
            function followTheWhiteRabbit() {
              return neo4jdb.batchQuery(batchQuery, function (err, dimensionNodes) {
                if (err && retries++ < 4) {
                  console.log('Retry: ' + retries);
                  return setTimeout(followTheWhiteRabbit, 500);
                }

                if (err) {
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
      return neo4jdb.cypherQuery(query, {}, function (err) {
        console.timeEnd(query);
        return cb(err);
      });
    }, cb);
  }
};
