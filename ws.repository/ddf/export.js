'use strict';

var _ = require('lodash');
var async = require('async');
var express = require('express');
var Neo4j = require('node-neo4j');
var mongoose = require('mongoose');

_.forEach([
  'concepts',
  'data-points',
  'data-set-versions',
  'data-set-sessions',
  'data-sets',
  'entities',
  'entity-groups',
  'measures',
  'translations',
  'users',
  'changelogs'
], model => require(`./${model}/${model}.model`));


var neo4jdb = new Neo4j('http://neo4j:root@localhost:7474');

mongoose.connect('mongodb://localhost:27017/ws_ddf', (err) => {
  if (err) {
    throw err;
  }

  var logger = console;

  console.time('Mission complete!');
  async.waterfall([
    function (cb) {
      return cb(null, {});
    },
    cleanGraph,
    exportMeasures,
    exportEntityGroups,
    exportEntities,
    // exportMeasureValues,
    // createIndexes
  ], function (err) {
    if (err) {
      logger.error(err);
      return;
    }

    console.timeEnd('Mission complete!');
    process.exit(0);
  });

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

  function exportMeasures(pipe, emCb) {
    var modelName = 'Measures';

    console.log(`${modelName} export started`);
    console.time(`${modelName} exported`);
    var Measures = mongoose.model(modelName);
    async.waterfall([
      cb => Measures.find({}, {gid: 1, name: 1}).lean().exec(cb),
      (measures, cb) => {
        console.log(`Exporting %s ${modelName}`, measures.length);
        var batchQuery = _.map(measures, function (measure, index) {
          return {
            method: 'POST',
            to: '/node',
            body: {gid: measure.gid, name: measure.name},
            id: index
          };
        });

        _.each(measures, function (measure, index) {
          batchQuery.push({
            method: 'POST',
            to: '{' + index + '}/labels',
            id: batchQuery.length,
            body: modelName
          });
        });
        return neo4jdb.batchQuery(batchQuery, (err, measureNodes) => {
          console.timeEnd(`${modelName} exported`);
          return cb(err, {measureNodes, measures});
        });
      },
      (measuresPipe, cb) => {
        async.reduce(measuresPipe.measures, {}, (memo, measure, cb)=> {
          var index = _.findIndex(measuresPipe.measureNodes, node => measure.gid === node.body.data.gid);
          measure.nodeId = measuresPipe.measureNodes[index].body.metadata.id;
          memo[measure._id.toString()] = measure;
          return Measures.update({_id: measure._id}, {$set: {nodeId: measure.nodeId}}, err => cb(err, memo));
        }, (err, res) => {
          pipe.measures = res;
          return cb(err);
        });
      }
    ], (err) => {
      emCb(err, pipe)
    });
  }

  function exportEntityGroups(pipe, eidCb) {
    var modelName = 'EntityGroups';

    console.log(`${modelName} export started`);
    console.time(`${modelName} exported`);

    var EntityGroups = mongoose.model(modelName);

    async.waterfall([
      cb => EntityGroups.find({}, {name: 1, gid: 1, type: 1, drilldowns: 1, drillups: 1, _id: 1, domain: 1}).lean().exec(cb),
      (entityGroups, cb) => cb(null, _.keyBy(entityGroups, entityGroup => entityGroup._id.toString())),
      (entityGroups, cb) => {
        pipe.entityGroups = entityGroups;
        cb(null, pipe);
      },
      (pipe, cb) => {
        var batchQuery = [];
        var nodeMetas = {};
        _.each(pipe.entityGroups, function (entityGroupId) {
          var entityGroup = pipe.entityGroups[entityGroupId._id.toString()];

          var entityGroupIndex = batchQuery.length;

          var entityGroupNode = {name: entityGroup.name, gid: entityGroup.gid, type: entityGroup.type};

          if (entityGroup.domain) {
            entityGroupNode.domain = pipe.entityGroups[entityGroup.domain.toString()].gid;
          }

          batchQuery.push({
            method: 'POST',
            to: '/node',
            body: entityGroupNode,
            id: batchQuery.length
          });

          batchQuery.push({
            method: 'POST',
            to: '{' + entityGroupIndex + '}/labels',
            id: batchQuery.length,
            body: modelName
          });

          nodeMetas[entityGroupId._id.toString()] = {entityGroupIndex, gid: entityGroup.gid, batchQueryId: batchQuery.length};
        });
        return cb(null, batchQuery, nodeMetas);
      },
      (batchQuery, nodeMetas, cb) => {
        return neo4jdb.batchQuery(batchQuery, function (err, dimensionNodes) {
          console.timeEnd(`${modelName} exported`);

          _.reduce(dimensionNodes, (prev, current) => {
            const node = _.find(nodeMetas, node => {
              return current.body && node.gid === current.body.data.gid
            });
            if (node) {
              node.neoId = current.body.metadata.id;
            }
          }, {});

          return cb(err, dimensionNodes, nodeMetas);
        });
      },
      (dimensionNodes, nodeMetas, cb) => {
        var batchQuery = [];

        pipe.nodeMetas = nodeMetas;
        _.each(pipe.entityGroups, entityGroup => {
          _.each(entityGroup.drilldowns, drilldownEntityGroup => {
            batchQuery.push({
              method: 'POST',
              to: '/node/' + nodeMetas[entityGroup._id.toString()].neoId + '/relationships',
              id: 0,
              body: {
                to: '' + nodeMetas[drilldownEntityGroup.toString()].neoId + '',
                type: 'DRILLDOWN'
              }
            });
          });
        });

        _.each(pipe.entityGroups, entityGroup => {
          _.each(entityGroup.drillups, drillupEntityGroup => {
            batchQuery.push({
              method: 'POST',
              to: '/node/' + nodeMetas[entityGroup._id.toString()].neoId + '/relationships',
              id: 0,
              body: {
                to: '' + nodeMetas[drillupEntityGroup.toString()].neoId + '',
                type: 'DRILLUP'
              }
            });
          });
        });

        cb(null, batchQuery);
      },
      (batchQuery, cb) => {
        return neo4jdb.batchQuery(batchQuery, function (err, dimensionNodes) {
          return cb(err, dimensionNodes);
        });
      }
    ], err => eidCb(err, pipe));
  }

  function exportEntities(pipe, done) {
    async.waterfall([
      eeDone => mongoose.model('Entities').find().lean().exec(eeDone),
      (entities, eeDone) => {
        pipe.entities = entities;
        let batchQuery = [];

        _.each(entities, entity => {
          const indexId = batchQuery.length;
          batchQuery.push({
            method: 'POST',
            to: '/node',
            body: {gid: entity.gid},
            id: indexId
          });

          batchQuery.push({
            method: 'POST',
            to: '{' + indexId  + '}/labels',
            id: indexId ,
            body: 'Entities'
          });
        });
        eeDone(null, batchQuery)
      },
      (batchQuery, cb) => {
        return neo4jdb.batchQuery(batchQuery, function (err, entityNodes) {
          return cb(err, entityNodes);
        });
      },
      (entityNodes, cb) => {

        _.reduce(entityNodes, (prev, current) => {
          const node = _.find(pipe.entities, node => {
            return current.body && node.gid === current.body.data.gid
          });
          if (node) {
            node.neoId = current.body.metadata.id;
          }
        }, {});

        var batchQuery = [];
        _.each(pipe.entities, entity => {
          _.each(pipe.entityGroups, group => {
            const foundEntitySet = _.find(entity.sets, entitySet => entitySet.toString() === group._id.toString());
            if (foundEntitySet) {
              batchQuery.push({
                method: 'POST',
                to: '/node/' + pipe.nodeMetas[foundEntitySet.toString()].neoId + '/relationships',
                body: {
                  to: '' + entity.neoId + '',
                  type: 'CONTAINS'
                }
              });
            } else if (group._id.toString() === entity.domain.toString()) {
              batchQuery.push({
                method: 'POST',
                to: '/node/' + pipe.nodeMetas[group._id.toString()].neoId + '/relationships',
                body: {
                  to: '' + entity.neoId + '',
                  type: 'CONTAINS'
                }
              });
            }
          });
        });
        cb(null, batchQuery);
      },
      (batchQuery, cb) => {
        return neo4jdb.batchQuery(batchQuery, function (err, entityRelations) {
          return cb(err, entityRelations);
        });
      }
    ], (error, result) => {
      if (error) {
        throw error;
      }
      return done(err, pipe);
    });
  }






















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
