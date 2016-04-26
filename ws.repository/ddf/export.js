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
  'datasets',
  'entities',
  'translations'
], model => require(`./${model}/${model}.model`));


var neo4jdb = new Neo4j('http://neo4j:root@localhost:7474');

var exportData = require('../../ws.routes/graphs/export.service');

mongoose.connect('mongodb://localhost:27017/ws_ddf', (err) => {
  if (err) {
    throw err;
  }

  console.time('Mission complete!');
  async.waterfall([
    cleanGraph,
    exportConceptsTree,
    // exportDataTree,
    cb => exportData(neo4jdb, cb),
    // createIndexes
  ], function (err) {
    if (err) {
      console.error(err);
      return;
    }
    console.timeEnd('Mission complete!');
    process.exit(0);
  });


  function exportConceptsTree(done) {
    return async.waterfall([
      async.constant({}),
      exportCurrentDatasetVersion,
      exportDataset,
      exportTranslations,
      exportConcepts,
      exportMeasures,
      exportEntityGroups,
      exportEntities
    ], function (err) {
      console.log('Concepts tree is completed!');
      done(err)
    });
  }

  function exportDataTree(done) {
    return async.waterfall([
      async.constant({}),
      exportCurrentDatasetVersion,
      exportDataset,
      exportMeasures,
      exportEntityGroups2,
      // exportEntities,
      // exportDatapoints
    ], function (err) {
      console.log('Data tree is completed!');
      done(err)
    });
  }

  function exportEntityGroups2(pipe, eidCb) {
    var Datapoints = mongoose.model('DataPoints');


    return async.waterfall([
      cb => async.each(pipe.measures, (measure, done) => {
        Datapoints.distinct('dimensions.concept', {measure: measure._id.toString()}).lean().exec((error, dimensionObjectIds) => {
          pipe.dimensionObjIds = dimensionObjectIds;
          done();
        });
      }, err => {
        cb(err);
      }),
      cb => {

      }
    ], eidCb);

    //db.getCollection('datapoints').distinct('dimensions.concept', {measureGid: 'energy_use_total'})

    // var Concepts = mongoose.model('Concepts');
    //db.getCollection('datapoints').distinct('dimensions.conceptGid', {measureGid: 'energy_use_total'})
    /*
    async.waterfall([
      cb => Concepts.find({$or: [{type: 'entity_set'}, {type: 'entity_domain'}]}, {name: 1, gid: 1, type: 1, drilldowns: 1, drillups: 1, _id: 1, domain: 1}).lean().exec(cb),
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
            body: entityGroup.domain ? 'EntitySets' : 'EntityDomains'
          });

          nodeMetas[entityGroupId._id.toString()] = {entityGroupIndex, gid: entityGroup.gid, batchQueryId: batchQuery.length};
        });
        return cb(null, batchQuery, nodeMetas);
      },
      (batchQuery, nodeMetas, cb) => {
        return neo4jdb.batchQuery(batchQuery, function (err, dimensionNodes) {
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
          batchQuery.push({
            method: 'POST',
            to: `/node/${pipe.version.neoId}/relationships`,
            id: batchQuery.length,
            body: {
              to: `${nodeMetas[entityGroup._id.toString()].neoId}`,
              type: 'WITH_DIMENSION'
            }
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
    */
  }

  function cleanGraph(cb) {
    console.log(`Removing all relationships between nodes`);
    neo4jdb.cypherQuery('match ()-[r]-() delete r;', function (err) {
      if (err) {
        return cb(err);
      }

      console.log(`done!`);
      console.log(`Removing all nodes`);

      neo4jdb.cypherQuery('match (n) delete n;', function (err) {
        if (err) {
          return cb(err);
        }

        console.log(`done!`);

        return cb(null);
      });
    });
  }

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

  function exportMeasures(pipe, emCb) {
    var Concepts = mongoose.model('Concepts');

    async.waterfall([
      cb => Concepts.find({type: 'measure'}, {gid: 1, name: 1}).lean().exec(cb),
      (measures, cb) => {
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
            body: 'Measures'
          });
        });
        return neo4jdb.batchQuery(batchQuery, (err, measureNodes) => {
          return cb(err, {measureNodes, measures});
        });
      },
      (measuresPipe, cb) => {
        async.reduce(measuresPipe.measures, {}, (memo, measure, cb)=> {
          var index = _.findIndex(measuresPipe.measureNodes, node => measure.gid === node.body.data.gid);
          measure.nodeId = measuresPipe.measureNodes[index].body.metadata.id;
          memo[measure._id.toString()] = measure;
          return Concepts.update({_id: measure._id}, {$set: {nodeId: measure.nodeId}}, err => cb(err, memo));
        }, (err, res) => {
          pipe.measures = res;
          return cb(err);
        });
      },
      (cb) => {
        const batchQuery = [];
        _.each(pipe.measures, measure => {
          batchQuery.push({
            method: 'POST',
            to: '/node/' + pipe.version.neoId + '/relationships',
            id: 0,
            body: {
              to: '' + measure.nodeId + '',
              type: 'WITH_MEASURE'
            }
          });
        });
        return neo4jdb.batchQuery(batchQuery, function (err) {
          return cb(err);
        });
      }
    ], (err) => {
      emCb(err, pipe)
    });
  }

  function exportEntityGroups(pipe, eidCb) {
    var Concepts = mongoose.model('Concepts');

    async.waterfall([
      cb => Concepts.find({$or: [{type: 'entity_set'}, {type: 'entity_domain'}]}, {name: 1, gid: 1, type: 1, drilldowns: 1, drillups: 1, _id: 1, domain: 1}).lean().exec(cb),
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
            body: entityGroup.domain ? 'EntitySets' : 'EntityDomains'
          });

          nodeMetas[entityGroupId._id.toString()] = {entityGroupIndex, gid: entityGroup.gid, batchQueryId: batchQuery.length};
        });
        return cb(null, batchQuery, nodeMetas);
      },
      (batchQuery, nodeMetas, cb) => {
        return neo4jdb.batchQuery(batchQuery, function (err, dimensionNodes) {
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
          if (!entityGroup.domain) {
            batchQuery.push({
              method: 'POST',
              to: `/node/${pipe.version.neoId}/relationships`,
              id: batchQuery.length,
              body: {
                to: `${nodeMetas[entityGroup._id.toString()].neoId}`,
                type: 'WITH_ENTITY_DOMAIN'
              }
            });
          }

          if (entityGroup.domain) {
            batchQuery.push({
              method: 'POST',
              to: `/node/${nodeMetas[entityGroup._id.toString()].neoId}/relationships`,
              id: batchQuery.length,
              body: {
                to: `${nodeMetas[entityGroup.domain.toString()].neoId}`,
                type: 'IS_SUBSET_OF_ENTITY_DOMAIN'
              }
            });
          }
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
      eeDone => mongoose.model('Entities').find({}).lean().exec(eeDone),
      (entities, eeDone) => {
        pipe.entities = _.keyBy(entities, entity => entity._id.toString());
        pipe.entitiesMeta = {};
        let batchQuery = [];

        _.each(pipe.entities, entity => {
          const indexId = batchQuery.length;
          batchQuery.push({
            method: 'POST',
            to: '/node',
            body: {gid: entity.gid, 'properties.name': 'hello', source: entity.source},
            id: indexId
          });

          pipe.entitiesMeta[indexId] = {
            objId: entity._id.toString()
          };

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

        // _.reduce(entityNodes, (prev, current) => {
        //   const node = _.find(pipe.entities, node => {
        //     return current.body && node.gid === current.body.data.gid
        //   });
        //   if (node) {
        //     node.neoId = current.body.metadata.id;
        //   }
        // }, {});

        pipe.entitiesNeo = entityNodes.filter(node => node.body).reduce((result, node)=> {
          const metaObj = pipe.entitiesMeta[node.id];
          result[metaObj.objId] = {
            neoId: node.body.metadata.id
          };
          return result;
        }, {});

        var batchQuery = [];
        _.each(pipe.entitiesNeo, (entity, key) => {
          _.each(pipe.entities[key].childOf, parent => {
            batchQuery.push({
              method: 'POST',
              to: `/node/${entity.neoId}/relationships`,
              body: {
                to: `${pipe.entitiesNeo[parent.toString()].neoId}`,
                type: 'WITH_DRILLUP'
              }
            });
          });
        });

        _.each(pipe.entities, entity => {
          _.each(pipe.entityGroups, group => {
            const foundEntitySet = _.find(entity.groups, entitySet => entitySet.toString() === group._id.toString());
            if (foundEntitySet) {
              batchQuery.push({
                method: 'POST',
                to: `/node/${pipe.nodeMetas[foundEntitySet.toString()].neoId}/relationships`,
                body: {
                  to: `${pipe.entitiesNeo[entity._id.toString()].neoId}`,
                  type: 'WITH_ENTITY'
                }
              });
            } else if (group._id.toString() === entity.domain.toString()) {
              batchQuery.push({
                method: 'POST',
                to: `/node/${pipe.nodeMetas[group._id.toString()].neoId}/relationships`,
                body: {
                  to: `${pipe.entitiesNeo[entity._id.toString()].neoId}`,
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
    ], (error) => {
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

          meta[id] = { objId: datapoint._id.toString(), measureObjId: datapoint.measure.toString() };
          batchQuery.push({
            method: 'POST',
            body: {
              value: datapoint.value
            },
            id: id,
            to: '/node'
          });

          batchQuery.push({
            method: 'POST',
            to: `{${id}}/labels`,
            id: batchQuery.length ,
            body: 'MeasureValues'
          });
        });
        cb(null, meta, batchQuery);
      },
      (meta, batchQuery, cb) => {
        return neo4jdb.batchQuery(batchQuery, function (err, nodes) {
          pipe.datapointsNeo = nodes.reduce((result, node)=> {
            if (!node.body) return result;

            const metaObj = meta[node.id];
            result[metaObj.objId] = {
              neoId: node.body.metadata.id,
              measureObjId: metaObj.measureObjId
            };
            return result;
          }, {});

          // _.each(pipe.datapoints, datapoint => {
          //   const datapointNode = _.find(nodes, node => node.id === meta[datapoint._id.toString()]);
          //   datapoint.neoId = datapointNode.body.metadata.id;
          // });

          return cb(err, nodes);
        });
      },
      (nodes, cb) => {
        const batchQuery = [];
        _.each(pipe.datapointsNeo, (datapoint, objId) => {
          batchQuery.push({
            method: 'POST',
            to: '/node/' + pipe.measures[datapoint.measureObjId].nodeId + '/relationships',
            body: {
              to: `${datapoint.neoId}`,
              type: 'WITH_MEASURE_VALUE'
            }
          });
          _.each(pipe.datapoints[objId].dimensions, dim => {
            batchQuery.push({
              method: 'POST',
              to: '/node/' + pipe.entitiesNeo[dim.entity.toString()].neoId + '/relationships',
              body: {
                to: `${datapoint.neoId}`,
                type: 'IS_DIMENSION_KEY_FOR_MEASURE_VALUE'
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

  function exportTranslations(pipe, etDone) {
    const Translations = mongoose.model('Translations');

    async.waterfall([
      cb => Translations.find({dataset: pipe.dataset._id.toString()}).lean().exec(cb),
      (translations, cb) => {
        pipe.translations = _.keyBy(translations, translation => translation._id.toString());
        const batchQuery = [];

        _.each(pipe.translations, translation => {

          const batchId = batchQuery.length;

          batchQuery.push({
            method: 'POST',
            body: {
              key: translation.key,
              value: translation.value,
              language: translation.language
            },
            id: batchId,
            to: '/node'
          });

          batchQuery.push({
            method: 'POST',
            to: `{${batchId}}/labels`,
            id: batchQuery.length,
            body: 'Translations'
          });
        });

        cb(null, batchQuery);
      },
      (batchQuery, cb) => {
        return neo4jdb.batchQuery(batchQuery, function (err, translationNodes) {
          _.each(pipe.translations, translation => {
            const translationNode = _.find(translationNodes, node => node.body && node.body.data.language === translation.language && node.body.data.key === translation.key);
            translation.neoId = translationNode.body.metadata.id;
          });
          return cb(err);
        });
      },
      cb => {
        const batchQuery = [];
        _.each(pipe.translations, translation => {
          batchQuery.push({
            method: 'POST',
            to: '/node/' + pipe.dataset.neoId + '/relationships',
            body: {
              to: `${translation.neoId}`,
              type: 'WITH_TRANSLATION'
            }
          });
        });
        cb(null, batchQuery);
      },
      (batchQuery, cb) => {
        return neo4jdb.batchQuery(batchQuery, function (err) {
          return cb(err);
        });
      }
    ], error => {
      if (error) {
        etDone(error);
      }
      etDone(null, pipe);
    });
  }

  function exportConcepts(pipe, ecDone) {
    const Concepts = mongoose.model('Concepts');

    async.waterfall([
      cb => Concepts.find({versions: pipe.version._id.toString()}).lean().exec(cb),
      (concepts, cb) => {
        pipe.concepts = _.keyBy(concepts, concept => concept._id.toString());
        const batchQuery = [];

        _.each(pipe.concepts, concept => {

          const batchId = batchQuery.length;

          batchQuery.push({
            method: 'POST',
            body: {
              gid: concept.gid
            },
            id: batchId,
            to: '/node'
          });

          batchQuery.push({
            method: 'POST',
            to: `{${batchId}}/labels`,
            id: batchQuery.length,
            body: 'Concepts'
          });
        });

        cb(null, batchQuery);
      },
      (batchQuery, cb) => {
        return neo4jdb.batchQuery(batchQuery, function (err, conceptNodes) {
          _.each(pipe.concepts, concept => {
            const conceptNode = _.find(conceptNodes, node => node.body && node.body.data.gid === concept.gid);
            concept.neoId = conceptNode.body.metadata.id;
          });
          return cb(err);
        });
      },
      cb => {
        const batchQuery = [];
        _.each(pipe.concepts, concept => {
          batchQuery.push({
            method: 'POST',
            to: '/node/' + pipe.version.neoId + '/relationships',
            body: {
              to: `${concept.neoId}`,
              type: 'HAS_CONCEPT'
            }
          });
        });
        cb(null, batchQuery);
      },
      (batchQuery, cb) => {
        return neo4jdb.batchQuery(batchQuery, function (err) {
          return cb(err);
        });
      }
    ], error => {
      if (error) {
        ecDone(error);
      }
      ecDone(null, pipe);
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
