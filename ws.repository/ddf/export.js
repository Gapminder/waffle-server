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
  'datasets',
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

  console.time('Mission complete!');
  async.waterfall([
    async.constant({}),
    cleanGraph,
    exportCurrentDatasetVersion,
    exportDataset,
    exportTranslations,
    exportConcepts,
    exportMeasures,
    exportEntityGroups,
    exportEntities,
    exportDatapoints
    // createIndexes
  ], function (err) {
    if (err) {
      console.error(err);
      return;
    }

    console.timeEnd('Mission complete!');
    process.exit(0);
  });

  function cleanGraph(pipe, cb) {
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

        return cb(null, pipe);
      });
    });
  }

  function exportCurrentDatasetVersion(pipe, ecdvDone) {
    const DatasetVersions = mongoose.model('DatasetVersions');

    async.waterfall([
      cb => DatasetVersions.findOne({isCurrent: true}).lean().exec(cb),
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

        if (pipe.version.isCurrent) {
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
          return Measures.update({_id: measure._id}, {$set: {nodeId: measure.nodeId}}, err => cb(err, memo));
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
      cb => Concepts.find({type: {$or: ['entity_set', 'entity_domain']}}, {name: 1, gid: 1, type: 1, drilldowns: 1, drillups: 1, _id: 1, domain: 1}).lean().exec(cb),
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
      eeDone => mongoose.model('Entities').find().lean().exec(eeDone),
      (entities, eeDone) => {
        pipe.entities = _.keyBy(entities, entity => entity._id.toString());
        let batchQuery = [];

        _.each(pipe.entities, entity => {
          const indexId = batchQuery.length;
          batchQuery.push({
            method: 'POST',
            to: '/node',
            body: {gid: entity.gid, 'properties.name': 'hello'},
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

          meta[datapoint._id.toString()] = id;
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
              to: `${datapoint.neoId}`,
              type: 'WITH_MEASURE_VALUE'
            }
          });
          _.each(datapoint.coordinates, coordinate => {
            batchQuery.push({
              method: 'POST',
              to: '/node/' + pipe.entities[coordinate.entity.toString()].neoId + '/relationships',
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
