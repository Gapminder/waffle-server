var _ = require('lodash');
var async = require('async');
var express = require('express');
var mongoose = require('mongoose');

module.exports = function (neo4jdb, done) {
  // var neo4jdb = app.get('neo4jDb');
  // var logger = app.get('log');
  var logger = console;

  console.time('Mission complete!');
  async.waterfall([
    function (cb) {
      return cb(null, {});
    },
    // cleanGraph,
    // unique
    exportCurrentDatasetVersion,
    exportDataset,
    exportIndicators,
    // dependant
    exportIndicatorDimensions,
    exportMeasureValues,
    createIndexes
  ], function (err) {
    if (err) {
      logger.error(err);
      return done(err);
    }

    console.timeEnd('Mission complete!');

    return done(null, 'Upload complete');
  });

  // todo: implement full neo4j cleanup
  // function cleanGraph(pipe, cb) {
  //   logger.info(`Removing all relationships between nodes`);
  //   neo4jdb.cypherQuery('match ()-[r]-() delete r;', function (err) {
  //     if (err) {
  //       return cb(err);
  //     }
  //
  //     logger.info(`done!`);
  //     logger.info(`Removing all nodes`);
  //
  //     neo4jdb.cypherQuery('match (n) delete n;', function (err) {
  //       if (err) {
  //         return cb(err);
  //       }
  //
  //       logger.info(`done!`);
  //
  //       return cb(null, pipe);
  //     });
  //   });
  // }

  function exportCurrentDatasetVersion(pipe, ecdvDone) {
    const DatasetVersions = mongoose.model('DatasetVersions');

    async.waterfall([
        cb => DatasetVersions.findOne({/*isCurrent: true*/}).lean().exec(cb),
        (version, cb) => {
          pipe.version = version;

          const batchQuery = [];
          const batchId = batchQuery.length;

          batchQuery.push({
            body: {name: version.name},
            to: '/node',
            id: batchId,
            method: 'POST'
          });

          batchQuery.push({
            method: 'POST',
            to: '{' + batchId + '}/labels',
            id: batchQuery.length,
            body: 'DatasetVersions'
          });

          cb(null, batchQuery);
        },
        (batchQuery, cb) => {
          return neo4jdb.batchQuery(batchQuery, function (err, versionNodes) {
            const versionNode = _.find(versionNodes, node => node.body.data.name === pipe.version.name);
            pipe.version.neoId = versionNode.body.metadata.id;

            return cb(err, versionNodes);
          });
        }
      ],
      (error) => {
        if (error) {
          ecdvDone(error);
        }

        ecdvDone(null, pipe);
      });
  }

  function exportDataset(pipe, edDone) {
    const Datasets = mongoose.model('Datasets');

    async.waterfall([
        cb => Datasets.findOne({_id: pipe.version.dataset.toString()}).lean().exec(cb),
        (dataset, cb) => {
          pipe.dataset = dataset;

          const batchQuery = [];
          const batchId = batchQuery.length;
          batchQuery.push({
            body: {dsId: dataset.dsId},
            to: '/node',
            id: batchId,
            method: 'POST'
          });

          batchQuery.push({
            method: 'POST',
            to: '{' + batchId + '}/labels',
            id: batchQuery.length,
            body: 'Datasets'
          });

          cb(null, batchQuery);
        },
        (batchQuery, cb) => {
          return neo4jdb.batchQuery(batchQuery, function (err, datasetNodes) {
            const datasetNode = _.find(datasetNodes, node => node.body.data.dsId === pipe.dataset.dsId);
            pipe.dataset.neoId = datasetNode.body.metadata.id;

            return cb(err, datasetNodes);
          });
        },
        (datasetNodes, cb) => {
          const batchQuery = [];
          batchQuery.push({
            method: 'POST',
            to: '/node/' + pipe.dataset.neoId + '/relationships',
            id: 0,
            body: {
              to: '' + pipe.version.neoId + '',
              type: 'WITH_VERSION'
            }
          });

          if (/*pipe.version.isCurrent*/ true) {
            batchQuery.push({
              method: 'POST',
              to: '/node/' + pipe.dataset.neoId + '/relationships',
              id: 0,
              body: {
                to: '' + pipe.version.neoId + '',
                type: 'WITH_CURRENT_VERSION'
              }
            });
          }

          cb(null, batchQuery);
        },
        (batchQuery, cb) => {
          return neo4jdb.batchQuery(batchQuery, function (err) {
            return cb(err);
          });
        }
      ],
      (error) => {
        if (error) {
          edDone(error);
        }
        edDone(null, pipe);
      });
  }

  // export indicators and build _it to node_id hash set
  function exportIndicators(pipe, eiCb) {
    console.log('Indicators export started');
    console.time('Indicators exported');
    var Concepts = mongoose.model('Concepts');
    async.waterfall([
      cb => Concepts.find({type: 'measure'}, {gid: 1, name: 1/*, unit: 1*/}).lean().exec(cb),
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
            body: 'Indicators'
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
          return Concepts.update({_id: indicator._id}, {$set: {nodeId: indicator.nodeId}}, err => cb(err, memo));
        }, (err, res) => {
          pipe.indicators = res;
          return cb(err);
        });
      },
      cb => {
        const batchQuery = [];
        _.each(pipe.indicators, indicator => {
          batchQuery.push({
            method: 'POST',
            to: '/node/' + pipe.version.neoId + '/relationships',
            id: 0,
            body: {
              to: '' + indicator.nodeId + '',
              type: 'WITH_INDICATOR'
            }
          });
        });
        return cb(null, batchQuery);
      },
      (batchQuery, cb) => {
        return neo4jdb.batchQuery(batchQuery, function (err) {
          return cb(err);
        });
      }
    ], (err) => eiCb(err, pipe));
  }

  // export indicator dimensions and build hash
  function exportIndicatorDimensions(pipe, eidCb) {
    console.log("Dimensions export started");
    console.time("Dimensions exported");
    var Concepts = mongoose.model('Concepts');
    async.waterfall([
      // find all dimensions
      cb => Concepts.find({$or: [{type: 'entity_set'}, {type: 'entity_domain'}]}, {name: 1, gid: 1}).lean().exec(cb),
      // build dimensions hash map
      (dimensions, cb) => cb(null, _.keyBy(dimensions, (dimension) => dimension._id.toString())),
      // save hash map to pipe
      (dimensions, cb) => {
        pipe.dimensions = dimensions;
        cb();
      },
      // find all indicators
      cb => Concepts.find({type: 'measure'}, {dimensions: 1, nodeId: 1}).lean().exec(cb),
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
              body: 'Dimensions'
            });

            // set relation [:with_dimension] from indicator to dimension
            batchQuery.push({
              method: 'POST',
              to: '/node/' + indicatorNodeId + '/relationships',
              id: batchQuery.length,
              body: {
                to: '{' + dimensionIndex + '}',
                type: 'WITH_DIMENSION'
              }
            });
          });
        });
        return cb(null, batchQuery, nodeMetas);
      },
      // run cypher batch query
      (batchQuery, nodeMetas, cb) => {
        return neo4jdb.batchQuery(batchQuery, function (err, dimensionNodes) {
          console.timeEnd("Dimensions exported");

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
    var IndicatorValues = mongoose.model('DataPoints');
    var Concepts = mongoose.model('Concepts');
    async.waterfall([
      wcb => async.parallel({
        // find all indicators
        indicators: cb => Concepts.find({type: 'measure'}, {nodeId: 1, gid: 1}).lean().exec(cb),
        // find all dimensions
        dimension: cb => Concepts.find({$or: [{type: 'entity_set'}, {type: 'entity_domain'}]}, {gid: 1}).lean().exec(cb)
      }, wcb),
      // export dimension values
      (indAndDims, wcb) => {
        async.eachSeries(indAndDims.indicators, (indicator, escb) => {
          var modelName = 'DimensionValues';
          console.time(`${modelName} exported for indicator '${indicator.gid}'`);
          async.parallel({
            // get distinct coordinates
            coordinates: cb => IndicatorValues.distinct('dimensions', {measure: indicator._id}).lean().exec(cb),
            // get all indicators+dimensions from neo4j
            dimensionNodes: cb => neo4jdb.cypherQuery(`MATCH (i:Indicators {gid: '${indicator.gid}'})-[r:WITH_DIMENSION]->(d:Dimensions) RETURN i, d`, cb)
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
                dimension: dimValue.conceptGid,
                value: dimValue.gid
              });
              batchQuery.push({
                method: 'POST',
                to: '/node',
                body: {value: dimValue.gid},
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
                to: '/node/' + dimensionsNodeId[dimValue.conceptGid] + '/relationships',
                id: batchQuery.length,
                body: {
                  to: '{' + newNodeIndex + '}',
                  type: 'WITH_DIMENSION_VALUE'
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
            count: pcb => IndicatorValues.count({measure: indicator._id},pcb)
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
              IndicatorValues.find({measure: indicator._id}, {value: 1, 'dimensions.gid': 1,'dimensions.conceptGid': 1, measureGid: 1, _id: 0})
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

                    _.each(indValue.dimensions, function (coordinate) {
                      // set relation [:with_dimension_value] from dimension value to indicator value
                      var nodeId = hashAndCount.nodeIdsHash[coordinate.conceptGid][coordinate.gid] ||
                        hashAndCount.nodeIdsHash[coordinate.conceptGid][null];
                      batchQuery.push({
                        method: 'POST',
                        to: '/node/' + nodeId + '/relationships',
                        id: batchQuery.length,
                        body: {
                          to: '{' + newNodeIndex + '}',
                          type: 'WITH_INDICATOR_VALUE'
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
};
