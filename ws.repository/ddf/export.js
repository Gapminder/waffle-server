var _ = require('lodash');
var async = require('async');
var express = require('express');
var Neo4j = require('node-neo4j');
var mongoose = require('mongoose');

var neo4jdb = new Neo4j('http://neo4j:neo4j@localhost:7474');

mongoose.connect('mongodb://localhost:27017/ws_ddf', (err) => {
  if (err) {
    throw err;
  }

  var logger = console.log.bind(console);

  console.time('Mission complete!');
  async.waterfall([
    function (cb) {
      return cb(null, {});
    },
    cleanGraph,
    // unique
    exportIndicators,
    // dependant
    exportIndicatorDimensions,
    exportMeasureValues,
    createIndexes
  ], function (err) {
    if (err) {
      logger.error(err);
      return;
    }

    console.timeEnd('Mission complete!');
  });

// todo: implement full neo4j cleanup
  function cleanGraph(pipe, cb) {
    logger.log(`Removing all relationships between nodes`);
    neo4jdb.cypherQuery('match ()-[r]-() delete r;', function (err) {
      if (err) {
        return cb(err);
      }

      logger.log(`done!`);
      logger.log(`Removing all nodes`);

      neo4jdb.cypherQuery('match (n) delete n;', function (err) {
        if (err) {
          return cb(err);
        }

        logger.log(`done!`);

        return cb(null, pipe);
      });
    });
  }

// export indicators and build _it to node_id hash set
  function exportIndicators(pipe, eiCb) {
    console.log('Indicators export started');
    console.time('Indicators exported');
    var modelName = 'Indicators';
    var Indicators = mongoose.model(modelName);
    async.waterfall([
      cb => Indicators.find({}, {gid: 1, name: 1, unit: 1}).lean().exec(cb),
      (indicators, cb) => {
        console.log('Exporting %s indicators', indicators.length);
        // create indicators
        var batchQuery = _.map(indicators, function (indicator, index) {
          return {
            method: 'POST',
            to: '/node',
            body: {gid: indicator.gid, name: indicator.name},
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
        return neo4jdb.batchQuery(batchQuery, (err, indicatorNodes) => {
          console.timeEnd('Indicators exported');
          return cb(err, {indicatorNodes, indicators});
        });
      },
      (indiPipe, cb) => {
        // build indicators hash set
        // indicators from mongo
        async.reduce(indiPipe.indicators, {}, (memo, indicator, cb)=> {
          var index = _.findIndex(indiPipe.indicatorNodes, node => indicator.gid === node.body.data.gid);
          indicator.nodeId = indiPipe.indicatorNodes[index].body.metadata.id;
          memo[indicator._id.toString()] = indicator;
          return Indicators.update({_id: indicator._id}, {$set: {nodeId: indicator.nodeId}}, err => cb(err, memo));
        }, (err, res) => {
          pipe.indicators = res;
          return cb(err);
        });
      }
    ], (err) => eiCb(err, pipe));
  }

// export indicator dimensions and build hash
  function exportIndicatorDimensions(pipe, eidCb) {
    var modelName = 'Dimensions';
    console.log(modelName + ' export started');
    console.time(modelName + ' exported');
    var Dimensions = mongoose.model(modelName);
    var Indicators = mongoose.model('Indicators');
    async.waterfall([
      // find all dimensions
      cb => Dimensions.find({}, {name: 1, gid: 1}).lean().exec(cb),
      // build dimensions hash map
      (dimensions, cb) => cb(null, _.keyBy(dimensions, (dimension) => dimension._id.toString())),
      // save hash map to pipe
      (dimensions, cb) => {
        pipe.dimensions = dimensions;
        cb();
      },
      // find all indicators
      cb => Indicators.find({}, {dimensions: 1, nodeId: 1}).lean().exec(cb),
      // build cypher batch query and meta
      (indicators, cb) => {
        var batchQuery = [];
        var nodeMetas = [];
        _.each(indicators, function (indicator) {
          _.each(indicator.dimensions, function (dimensionId) {
            // create indicator dimension node
            var dimension = pipe.dimensions[dimensionId.toString()];
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
              body: {name: dimension.name, gid: dimension.gid},
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
        return cb(null, batchQuery, nodeMetas);
      },
      // run cypher batch query
      (batchQuery, nodeMetas, cb) => {
        return neo4jdb.batchQuery(batchQuery, function (err, dimensionNodes) {
          console.timeEnd(modelName + ' exported');

          return cb(err, dimensionNodes, nodeMetas);
        });
      },
      // build map of {indicator,dimension} with cypher nodeId
      (dimensionNodes, nodeMetas, cb) => {
        // build indicator->dimension hash set
        pipe.dimensionArray = _.map(nodeMetas, function (nodeMeta) {
          return _.merge({
            nodeId: dimensionNodes[nodeMeta.dimensionIndex].body.metadata.id,
            indicatorId: nodeMeta.indicatorId
          }, nodeMeta.dimension);
        });
        cb();
      }
    ], err => eidCb(err, pipe));
  }

// create indexes and unique constrains
  function createIndexes(pipe, cb) {
    async.eachSeries([
      'create index on :Indicators(gid)',
      'create index on :Dimensions(gid)',
      'create index on :DimensionValues(value)'
    ], function (query, cb) {
      console.time(query);
      return neo4jdb.cypherQuery(query, {}, function (err) {
        console.timeEnd(query);
        return cb(err);
      });
    }, cb);
  }

  function exportMeasureValues(pipe, emvCb) {
    var Indicators = mongoose.model('Indicators');
    var IndicatorValues = mongoose.model('IndicatorValues');
    var Dimensions = mongoose.model('Dimensions');
    async.waterfall([
      wcb => async.parallel({
        // find all indicators
        indicators: cb => Indicators.find({}, {nodeId: 1, gid: 1}).lean().exec(cb),
        // find all dimensions
        dimension: cb => Dimensions.find({}, {gid: 1}).lean().exec(cb)
      }, wcb),
      // export dimension values
      (indAndDims, wcb) => {
        async.eachSeries(indAndDims.indicators, (indicator, escb) => {
          var modelName = 'DimensionValues';
          console.time(`${modelName} exported for indicator '${indicator.gid}'`);
          async.parallel({
            // get distinct coordinates
            coordinates: cb => IndicatorValues.distinct('coordinates', {indicator: indicator._id}).lean().exec(cb),
            // get all indicators+dimensions from neo4j
            dimensionNodes: cb => neo4jdb.cypherQuery(`MATCH (i:Indicators {gid: '${indicator.gid}'})-[r:with_dimension]->(d:Dimensions) RETURN i, d`, cb)
          }, (err, coordAndDimNodes) => {
            if (!coordAndDimNodes.coordinates.length) {
              return escb();
            }
            // todo: waterfall step 1
            // map coordinates to batch query
            //var dims = _.groupBy(res.coordinates, c=>c.dimensionName);
            var dimensionsNodeId = _.reduce(coordAndDimNodes.dimensionNodes.data,
              (memo, pair) => {
                memo[pair[1].gid] = pair[1]._id;
                return memo;
              }, {});

            var batchQuery = [];
            var nodesMeta = [];
            _.each(coordAndDimNodes.coordinates, function (dimValue) {
              var newNodeIndex = batchQuery.length;
              // create dimension value node
              nodesMeta.push({
                nodeIndex: newNodeIndex,
                dimension: dimValue.dimensionName,
                value: dimValue.value
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
                to: '/node/' + dimensionsNodeId[dimValue.dimensionName] + '/relationships',
                id: batchQuery.length,
                body: {
                  to: '{' + newNodeIndex + '}',
                  type: 'with_dimension_value'
                }
              });
            });
            return neo4jdb.batchQuery(batchQuery, function (err) {
              console.timeEnd(`${modelName} exported for indicator '${indicator.gid}'`);
              return escb(err);
            });
          });
        }, err => wcb(err, indAndDims));
      },
      // export indicator values
      (indAndDims, wcb) => {
        var modelName = 'IndicatorValues';
        async.eachSeries(indAndDims.indicators, (indicator, escb) => {
          console.log(`Exporting of '${indicator.gid}' measure values STARTED`);
          console.time(`Exporting of '${indicator.gid}' measure values DONE`);
          // 3. load paged portion of indicators values
          // 4. build batch query and add data to neo4j
          // build dimension values hash map
          // and count indicator values
          async.parallel({
            nodeIdsHash: pcb => async.waterfall([
              // 1. load dimensions and dimension values from neo4j
              cb => neo4jdb.cypherQuery(`MATCH (n:Indicators{gid:'${indicator.gid}'})-->(d:Dimensions)-->(dv:DimensionValues) RETURN id(d),d.gid,id(dv),dv.value`, cb),
              // 2. build a hash map [dimension][value] -> nodeId
              (res, cb) => cb(null, _.reduce(res.data, (memo, row)=>{
                memo[row[1]] = memo[row[1]] || {};
                memo[row[1]][row[3]] = row[2];
                return memo;
              }, {}))
            ], pcb),
            count: pcb => IndicatorValues.count({indicator: indicator._id},pcb)
          }, (err, hashAndCount) => {
            if (err || !hashAndCount.count) {
              return escb(err);
            }

            var tasks = [];
            var page = 1500;

            var pages = Math.floor(hashAndCount.count / page);
            var lastPage = hashAndCount.count % page;
            var i;
            for (i = 0; i < pages; i++) {
              tasks.push({skip: i * page, limit: page});
            }
            tasks.push({skip: i * page, limit: lastPage});

            var counter = pages + 1;
            console.log(`${indicator.gid} values to save: ${counter}`);
            async.eachSeries(tasks, function (task, cb) {
              var currentCounter = counter--;
              console.time(`${indicator.gid} values left to save: ${currentCounter}`);
              IndicatorValues.find({indicator: indicator._id}, {value: 1, 'coordinates.value': 1,'coordinates.dimensionName': 1, indicatorName: 1, _id: 0})
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
                      var nodeId = hashAndCount.nodeIdsHash[coordinate.dimensionName][coordinate.value] ||
                        hashAndCount.nodeIdsHash[coordinate.dimensionName][null];
                      batchQuery.push({
                        method: 'POST',
                        to: '/node/' + nodeId + '/relationships',
                        id: batchQuery.length,
                        body: {
                          to: '{' + newNodeIndex + '}',
                          type: 'with_indicator_value'
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

                      console.timeEnd(`${indicator.gid} values left to save: ${currentCounter}`);
                      return cb();
                    });
                  }
                });
            }, function (err) {
              console.timeEnd(`Exporting of '${indicator.gid}' measure values DONE`);
              return escb(err, pipe);
            });
          });
          // end for this indicator
        }, wcb);
        // end for each indicators
      }
      // end of main exportMeasureValues waterfall
    ], err => emvCb(err, pipe));
  }
});
