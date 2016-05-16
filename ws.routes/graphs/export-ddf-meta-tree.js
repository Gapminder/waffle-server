'use strict';

var _ = require('lodash');
var async = require('async');
var express = require('express');
var mongoose = require('mongoose');

const exportUtils = require('./export.utils');
const makeBatchNode = exportUtils.makeBatchNode;
const makeBatchRelation = exportUtils.makeBatchRelation;
const flattenProperties = exportUtils.flattenProperties;

module.exports = (app, done, datasetName) => {
  var neo4jdb = app.get('neo4jDb');
  var logger = app.get('log');

  console.time('Ddf meta tree is exported');
  async.waterfall([
    async.constant({}),
    exportDataset,
    // exportTranslations,
    // exportConcepts,
    exportMeasures,
    exportEntitySetsAndDomains,
    exportEntities
  ], function (err) {
    if (err) {
      return done(err);
    }
    console.timeEnd('Ddf meta tree is exported');
    done(null);
  });

  function exportDataset(pipe, onDatasetExported) {
    console.time('Dataset is exported');
    console.log(`Dataset "${datasetName}" is going to be exported`);
    const Datasets = mongoose.model('Datasets');
    async.waterfall([
        done => Datasets.findOne({name: datasetName}).lean().exec(done),
        (dataset, done) => {
          pipe.dataset = dataset;
          pipe.currentVersion = Number(_.first(dataset.versions));

          console.log(`Dataset version to be exported: "${pipe.currentVersion}"`);

          return done(null, makeBatchNode({
            id: 0,
            labelName: 'Dataset',
            body: {
              name: dataset.name,
              versions: dataset.versions,
              path: dataset.path,
              type: dataset.type,
              commit: dataset.commit,
              defaultLanguage: dataset.defaultLanguage,
              dataProvider: dataset.dataProvider
            }
          }));
        },
        (batchQuery, done) => {
          return neo4jdb.batchQuery(batchQuery, function (err, datasetNodes) {
            const dsIdToNeoId = datasetNodes.reduce((result, next) => {
              if (!next.body) {
                return result;
              }

              result[pipe.dataset._id.toString()] = next.body.metadata.id;
              return result;
            }, {});
            pipe.dataset.neoId = dsIdToNeoId[pipe.dataset._id.toString()];
            return done(err);
          });
        }
      ],
      error => {
        console.timeEnd('Dataset is exported');
        onDatasetExported(error, pipe)
      });
  }

  function exportMeasures(pipe, onMeasuresExported) {
    console.time('Measures are exported');

    const Concepts = mongoose.model('Concepts');
    async.waterfall([
      done => Concepts.find({dataset: pipe.dataset._id, type: 'measure', from: {$lte: pipe.currentVersion}, to: {$gt: pipe.currentVersion}}, {gid: 1, originId: 1, properties: 1}).lean().exec(done),
      (measures, done) => {
        pipe.measures = measures;

        let batchQueryId = 0;
        const batchQuery = _.map(measures, measure => {

          let batchNode = makeBatchNode({
            id: batchQueryId,
            labelName: 'Measure',
            body: {originId: measure.originId.toString()}
          });

          batchNode.push(makeBatchRelation({
            fromNodeId: pipe.dataset.neoId,
            toNodeId: `{${batchQueryId}}`,
            relationName: 'WITH_MEASURE',
            from: pipe.currentVersion
          }));

          batchQueryId += 2;
          return batchNode;
        });

        return neo4jdb.batchQuery(batchQuery, (error, measureNodes) => {
          const measureNodesByOriginId = _.chain(measureNodes)
            .filter(node => node.body)
            .keyBy(node => node.body.data.originId)
            .mapValues(node => node.body.metadata.id)
            .value();

          pipe.measures = _.reduce(pipe.measures, (result, measure)=> {
            measure.neoId = measureNodesByOriginId[measure.originId.toString()];
            result[measure._id.toString()] = measure;
            return result;
          }, {});

          return done(error);
        });
      },
      done => {
        let batchQueryId = 0;
        const batchQuery = _.map(pipe.measures, measure => {
          let batchNode = makeBatchNode({
            id: batchQueryId,
            labelName: 'MeasureState',
            body: _.extend({gid: measure.gid, originId: measure.originId}, flattenProperties(measure))
          });

          batchNode.push(makeBatchRelation({
            fromNodeId: measure.neoId,
            toNodeId: `{${batchQueryId}}`,
            relationName: 'WITH_MEASURE_STATE',
            from: pipe.currentVersion
          }));

          batchQueryId += 2;
          return batchNode;
        });

        return neo4jdb.batchQuery(batchQuery, error => {
          return done(error);
        });
      }
    ], err => {
      // we don't need measures at this point and further, hence there is no sense to keep them in pipe
      delete pipe.measures;

      console.timeEnd('Measures are exported');
      onMeasuresExported(err, pipe)
    });
  }

  function exportEntitySetsAndDomains(pipe, onEntitySetsAndDomainsExported) {
    console.time('Entity sets and domains are exported');

    const Concepts = mongoose.model('Concepts');
    async.waterfall([
      done => {
        const query = {$or: [{type: 'entity_set'}, {type: 'entity_domain'}], from: {$lte: pipe.currentVersion}, to: {$gt: pipe.currentVersion}, dataset: pipe.dataset._id};
        const projection = {gid: 1, domain: 1, originId: 1, properties: 1};

        return Concepts.find(query, projection).lean().exec((error, setsAndDomains) => {
          pipe.entitySetsAndDomains = _.keyBy(setsAndDomains, setOrDomain => setOrDomain.originId.toString());
          return done(null);
        });
      },
      done => {
        let batchQueryId = 0;
        const batchQuery = _.map(pipe.entitySetsAndDomains, setOrDomain => {

        let batchNode = makeBatchNode({
          id: batchQueryId,
          labelName: setOrDomain.domain ? 'EntitySet' : 'EntityDomain',
          body: {originId: setOrDomain.originId.toString()}
        });

        if (!setOrDomain.domain) {
          batchNode.push(makeBatchRelation({
            fromNodeId: pipe.dataset.neoId,
            toNodeId: `{${batchQueryId}}`,
            relationName: 'WITH_ENTITY_DOMAIN',
            from: pipe.currentVersion
          }));
        }

          batchQueryId += 2;
          return batchNode;
        });

        return neo4jdb.batchQuery(batchQuery, function (error, setsAndDomainsNodes) {
          const setsAndDomainsNodesByOriginId = _.chain(setsAndDomainsNodes)
            .filter(node => node.body)
            .keyBy(node => node.body.data.originId)
            .mapValues(node => node.body.metadata.id)
            .value();

          pipe.entitySetsAndDomains = _.reduce(pipe.entitySetsAndDomains, (result, setOrDomain)=> {
            setOrDomain.neoId = setsAndDomainsNodesByOriginId[setOrDomain.originId.toString()];
            result[setOrDomain._id.toString()] = setOrDomain;
            return result;
          }, {});

          return done(error);
        });
      },
      done => {
        let batchQueryId = 0;
        const batchQuery = _.chain(pipe.entitySetsAndDomains)
          .filter(setOrDomain => setOrDomain.domain)
          .map(entitySet => {

            const batchNode = makeBatchRelation({
              fromNodeId: entitySet.neoId,
              toNodeId: pipe.entitySetsAndDomains[entitySet.domain.toString()].neoId,
              relationName: 'IS_SUBSET_OF_ENTITY_DOMAIN',
              from: pipe.currentVersion
            });

            batchQueryId += 2;
            return batchNode;
          })
          .value();

        return neo4jdb.batchQuery(batchQuery, error => {
          return done(error);
        });
      },
      done => {
        let batchQueryId = 0;
        const batchQuery = _.map(pipe.entitySetsAndDomains, setOrDomain => {
          let batchNode = makeBatchNode({
            id: batchQueryId,
            labelName: setOrDomain.domain ? 'EntitySetState' : 'EntityDomainState',
            body: _.extend({gid: setOrDomain.gid, originId: setOrDomain.originId}, flattenProperties(setOrDomain))
          });

          batchNode.push(makeBatchRelation({
            fromNodeId: setOrDomain.neoId,
            toNodeId: `{${batchQueryId}}`,
            relationName: setOrDomain.domain ? 'WITH_ENTITY_SET_STATE' : 'WITH_ENTITY_DOMAIN_STATE',
            from: pipe.currentVersion
          }));

          batchQueryId += 2;
          return batchNode;
        });

        return neo4jdb.batchQuery(batchQuery, error => {
          return done(error);
        });
      }
    ], error => {

      console.timeEnd('Entity sets and domains are exported');
      onEntitySetsAndDomainsExported(error, pipe)
    });
  }

  function exportEntities(pipe, onEntitiesExported) {
    console.time('Entities are exported');

    async.waterfall([
      done => mongoose.model('Entities').find({from: {$lte: pipe.currentVersion}, to: {$gt: pipe.currentVersion}, dataset: pipe.dataset._id}).lean().exec(done),
      (entities, done) => {
        pipe.entities = _.keyBy(entities, entity => entity.originId.toString());

        let batchQueryId = 0;
        const batchQuery = _.map(pipe.entities, entity => {
          entity.batchQueryId = batchQueryId;
          let batchNode = makeBatchNode({
            id: batchQueryId,
            labelName: 'Entity',
            body: {originId: entity.originId}
          });

          const setOrDomainObjectIdsAsStrings =
            _.chain(entity.sets)
            .union([entity.domain])
            .keyBy(group => group.toString())
            .value();

          _.each(setOrDomainObjectIdsAsStrings, setOrDomainObjectIdAsString => {
            const foundSetOrDomain = pipe.entitySetsAndDomains[setOrDomainObjectIdAsString];
            if (foundSetOrDomain) {
              batchNode.push(makeBatchRelation({
                fromNodeId: foundSetOrDomain.neoId,
                toNodeId: `{${batchQueryId}}`,
                relationName: 'WITH_ENTITY',
                from: pipe.currentVersion
              }));
            }
          });

          batchQueryId += 2;
          return batchNode;
        });

        return neo4jdb.batchQuery(batchQuery, function (error, entityNodes) {
          const entityNodesByGid =
            _.chain(entityNodes)
              .filter(node => node.body)
              .keyBy(node => node.id)
              .mapValues(node => node.body.metadata.id)
              .value();

          _.each(pipe.entities, entity => {
            entity.neoId = entityNodesByGid[entity.batchQueryId];
          });

          return done(error);
        });
      },
      done => {
        let batchQueryId = 0;
        const batchQuery = _.map(pipe.entities, entity => {
          let batchNode = makeBatchNode({
            id: batchQueryId,
            labelName: 'EntityState',
            body: _.extend({gid: entity.gid, originId: entity.originId}, flattenProperties(entity))
          });

          batchNode.push(makeBatchRelation({
            fromNodeId: entity.neoId,
            toNodeId: `{${batchQueryId}}`,
            relationName: 'WITH_ENTITY_STATE',
            from: pipe.currentVersion
          }));

          _.each(entity.drillups, parentEntityObjectId => {
            if (!parentEntityObjectId) {
              return;
            }

            batchNode.push(makeBatchRelation({
              fromNodeId: entity.neoId,
              toNodeId: pipe.entities[parentEntityObjectId.toString()].neoId,
              relationName: 'WITH_DRILLUP',
              from: pipe.currentVersion
            }));
          });

          batchQueryId += 2;
          return batchNode;
        });

        return neo4jdb.batchQuery(batchQuery, error => {
          return done(error);
        });
      }
    ], error => {
      delete pipe.dataset;
      delete pipe.entities;
      delete pipe.entitySetsAndDomains;

      console.timeEnd('Entities are exported');
      onEntitiesExported(error, pipe)
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

        return cb(null, batchQuery);
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
        return cb(null, batchQuery);
      },
      (batchQuery, cb) => {
        return neo4jdb.batchQuery(batchQuery, function (err) {
          return cb(err);
        });
      }
    ], error => etDone(error, pipe));
  }

  function createIndexes(pipe, cb) {
    async.eachSeries([
      'create index on :Indicators(gid)',
      'create index on :Dimensions(gid)',
      'create index on :DimensionValues(value)'
    ], (query, cb) => {
      console.time(query);
      return neo4jdb.cypherQuery(query, {}, function (err) {
        console.timeEnd(query);
        return cb(err);
      });
    }, cb);
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

          const conceptNode = _.extend({
            gid: concept.gid
          }, flattenProperties(concept));

          batchQuery.push({
            method: 'POST',
            body: conceptNode,
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

        return cb(null, batchQuery);
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
        return cb(null, batchQuery);
      },
      (batchQuery, cb) => {
        return neo4jdb.batchQuery(batchQuery, function (err) {
          return cb(err);
        });
      }
    ], error => ecDone(null, pipe));
  }
};
