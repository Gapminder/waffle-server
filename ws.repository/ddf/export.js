'use strict';

var _ = require('lodash');
var async = require('async');
var express = require('express');
var Neo4j = require('node-neo4j');
var mongoose = require('mongoose');

_.forEach([
  'concepts',
  'data-points',
  'dataset-versions',
  'dataset-transactions',
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
    async.constant({}),
    cleanGraph,
    exportMeasures,
    exportEntityGroups,
    exportEntities,
    exportDatapoints,
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
                type: 'WITH_DRILLDOWN'
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
                type: 'WITH_DRILLUP'
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
        pipe.entities = _.keyBy(entities, entity => entity._id.toString());
        let batchQuery = [];

        _.each(pipe.entities, entity => {
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
          _.each(entity.drillups, entityDrillup => {
              batchQuery.push({
                method: 'POST',
                to: '/node/' + entity.neoId + '/relationships',
                body: {
                  to: '' + pipe.entities[entityDrillup.toString()].neoId  + '',
                  type: 'WITH_DRILLUP'
                }
              });
          });
        });

        _.each(pipe.entities, (entity) => {
          _.each(entity.drilldowns, entityDrilldown => {
            batchQuery.push({
              method: 'POST',
              to: '/node/' + entity.neoId + '/relationships',
              body: {
                to: '' + pipe.entities[entityDrilldown.toString()].neoId  + '',
                type: 'WITH_DRILLDOWN'
              }
            });
          });
        });

        _.each(pipe.entities, entity => {
          _.each(pipe.entityGroups, group => {
            const foundEntitySet = _.find(entity.sets, entitySet => entitySet.toString() === group._id.toString());
            if (foundEntitySet) {
              batchQuery.push({
                method: 'POST',
                to: '/node/' + pipe.nodeMetas[foundEntitySet.toString()].neoId + '/relationships',
                body: {
                  to: '' + entity.neoId + '',
                  type: 'WITH_ENTITY'
                }
              });
            } else if (group._id.toString() === entity.domain.toString()) {
              batchQuery.push({
                method: 'POST',
                to: '/node/' + pipe.nodeMetas[group._id.toString()].neoId + '/relationships',
                body: {
                  to: '' + entity.neoId + '',
                  type: 'WITH_ENTITY'
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
      return done(error, pipe);
    });
  }

  function exportDatapoints(pipe, edDone) {
    const modelName = 'DataPoints';
    console.log(`${modelName} export started`);
    console.time(`${modelName} exported`);
    const Datapoints = mongoose.model(modelName);

    async.waterfall([
      (cb) => Datapoints.find({}).lean().exec(cb),
      (datapoints, cb) => {
        pipe.datapoints = _.keyBy(datapoints, datapoint => datapoint._id.toString());

        const batchQuery = [];

        const meta = {};
        _.each(pipe.datapoints, datapoint => {
          const id = batchQuery.length;

          meta[datapoint._id.toString()] = id;
          batchQuery.push({
            method: 'POST',
            body: {
              value: datapoint.value
            },
            id: id,
            to: '/node',
            metadata: {s: "hello"}
          });

          batchQuery.push({
            method: 'POST',
            to: '{' + id  + '}/labels',
            id: batchQuery.length ,
            body: 'MeasureValues'
          });
        });
        cb(null, meta, batchQuery);
      },
      (meta, batchQuery, cb) => {
        return neo4jdb.batchQuery(batchQuery, function (err, nodes) {
          _.each(pipe.datapoints, datapoint => {
            const datapointNode = _.find(nodes, node => node.id === meta[datapoint._id.toString()]);
            datapoint.neoId = datapointNode.body.metadata.id;
          });

          return cb(err, nodes);
        });
      },
      (nodes, cb) => {
        const batchQuery = [];
        _.each(pipe.datapoints, datapoint => {
          batchQuery.push({
            method: 'POST',
            to: '/node/' + pipe.measures[datapoint.measure.toString()].nodeId + '/relationships',
            body: {
              to: '' + datapoint.neoId + '',
              type: 'HAS_MEASURE_VALUE'
            }
          });
          _.each(datapoint.coordinates, coordinate => {
            batchQuery.push({
              method: 'POST',
              to: '/node/' + pipe.entities[coordinate.entity.toString()].neoId + '/relationships',
              body: {
                to: '' + datapoint.neoId + '',
                type: 'HAS_MEASURE_VALUE'
              }
            });
          });
        });

        return cb(null, batchQuery);
      },
      (batchQuery, cb) => {
        return neo4jdb.batchQuery(batchQuery, function (err, nodes) {
          return cb(err, nodes);
        });
      }
    ], (error) => {
      if (error) {
        throw error;
      }
      return edDone(error, pipe);
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
});
