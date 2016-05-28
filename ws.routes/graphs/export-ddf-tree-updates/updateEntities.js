const _ = require('lodash');
const async = require('async');
const mongoose = require('mongoose');

const exportUtils = require('./../export.utils.js');
const makeBatchNode = exportUtils.makeBatchNode;
const makeBatchRelation = exportUtils.makeBatchRelation;
const makeBatchIdBasedRelation = exportUtils.makeBatchIdBasedRelation;
const flattenProperties = exportUtils.flattenProperties;

module.exports = neo4jdb => {
  return function updateEntities(pipe, onEntitiesUpdated) {
    const Entities = mongoose.model('Entities');

    let changed = {
      updated: 0,
      created: 0,
      deleted: 0
    };
    return async.waterfall([
      done => Entities.find({dataset: pipe.dataset._id, $or: [{from: pipe.version}, {to: pipe.version}]}).lean().exec(done),
      (entities, done) => {
        const entitiesByOriginId = _.groupBy(entities, entity => entity.originId.toString());

        return async.eachLimit(entitiesByOriginId, 10, (entitiesForSameOriginId, onEntityUpdated) => {
          if (exportUtils.isDeleted(entitiesForSameOriginId, pipe.version)) {
            changed.deleted++;
            return deleteEntity(_.first(entitiesForSameOriginId), pipe.version, onEntityUpdated);
          }

          if (exportUtils.isNew(entitiesForSameOriginId, pipe.version)) {
            changed.created++;
            return createEntity(_.first(entitiesForSameOriginId), pipe.version, onEntityUpdated);
          }

          if (exportUtils.isUpdated(entitiesForSameOriginId, pipe.version)) {
            changed.updated++;
            return updateEntity(
              _.last(_.sortBy(entitiesForSameOriginId, 'from')),
              getUpdatedSetsDomainRelations(entitiesForSameOriginId),
              getUpdatedDrillups(entitiesForSameOriginId),
              pipe.version,
              onEntityUpdated
            );
          }

          return onEntityUpdated();
        }, done);
      }
    ], error => {
      console.log('Entities updated:', changed.updated);
      console.log('Entities created:', changed.created);
      console.log('Entities deleted:', changed.deleted);
      onEntitiesUpdated(error, pipe)
    });
  };

  function createEntity(entity, version, onCreated) {
    const conceptsToWhichEntityAttached = _(entity.sets)
      .concat([entity.domain])
      .map(item => `'${item.toString()}'`)
      .uniq()
      .value();

    const findIdsForConcepts = `
      MATCH (n)
      WHERE (n:EntitySet OR n:EntityDomain)
      AND n.originId in [${conceptsToWhichEntityAttached.join(',')}]
      RETURN id(n)`;

    return neo4jdb.cypherQuery(findIdsForConcepts, (error, response) => {
      const conceptNeoIds = response.data;

      let batchQueryId = 0;
      const batchQuery = [];

      batchQuery.push(makeBatchNode({
        id: batchQueryId,
        labelName: 'Entity',
        body: {originId: entity.originId.toString()}
      }));

      const entitySetBatchId = batchQueryId;

      _.each(conceptNeoIds, conceptNeoId => {
        batchQuery.push(makeBatchRelation({
          fromNodeId: conceptNeoId,
          toNodeId: `{${entitySetBatchId}}`,
          relationName: 'WITH_ENTITY',
          from: version
        }));

        batchQueryId += 2;
      });

      batchQuery.push(makeBatchNode({
        id: batchQueryId,
        labelName: 'EntityState',
        body: _.extend({gid: entity.gid, originId: entity.originId.toString()}, flattenProperties(entity))
      }));

      batchQuery.push(makeBatchIdBasedRelation({
        fromNodeId: `{${entitySetBatchId}}`,
        toNodeId: `{${batchQueryId}}`,
        relationName: 'WITH_ENTITY_STATE',
        from: version
      }));

      return neo4jdb.batchQuery(batchQuery, onCreated);
    });
  }

  function updateEntity(entity, updatedSetsDomainRelations, updatedDrillups, version, onUpdated) {
    return async.waterfall([
      async.constant({}),
      (pipe, done) => {
        const findIdsOfEntityAndRelationQuery = `
          MATCH (n:Entity {originId: '${entity.originId}'})-[r:WITH_ENTITY_STATE]->()
          WHERE
            ${version} > r.from
            AND ${version} < r.to
            AND r.to = ${Number.MAX_SAFE_INTEGER}
          RETURN DISTINCT id(n),id(r)`;

        return neo4jdb.cypherQuery(findIdsOfEntityAndRelationQuery, (error, response) => {
          const ids = _.flatten(response.data);
          pipe.entityNeoId = _.first(ids);
          pipe.previousStateRelationId = _.last(ids);
          return done(error, pipe);
        });
      },
      (pipe, done) => {
        let batchQueryId = 0;
        const batchNode = makeBatchNode({
          id: batchQueryId,
          labelName: 'EntityState',
          body: _.extend({gid: entity.gid, originId: entity.originId}, flattenProperties(entity))
        });

        batchNode.push(makeBatchRelation({
          fromNodeId: pipe.entityNeoId,
          toNodeId: `{${batchQueryId}}`,
          relationName: 'WITH_ENTITY_STATE',
          from: version
        }));

        const originIds = _.join(_.map(_.union(updatedSetsDomainRelations.created, updatedDrillups.created), id => `'${id}'`), ',');
        return neo4jdb.cypherQuery(`
              MATCH (n)
              WHERE (n:EntitySet OR n:EntityDomain OR n:Entity) AND n.originId in [${originIds}] 
              RETURN [n.originId, id(n)]`, (error, response) => {
          if (error) {
            return done(error);
          }

          const originIdToNeoId = _.fromPairs(response.data);
          _.each(updatedDrillups.created, newDrillup => {
            batchNode.push(makeBatchRelation({
              fromNodeId: pipe.entityNeoId,
              toNodeId: originIdToNeoId[newDrillup],
              relationName: 'WITH_DRILLUP',
              from: version
            }));
          });

          _.each(updatedSetsDomainRelations.created, withEntityRelation => {
            batchNode.push(makeBatchRelation({
              fromNodeId: originIdToNeoId[withEntityRelation],
              toNodeId: pipe.entityNeoId,
              relationName: 'WITH_ENTITY',
              from: version
            }));
          });

          return neo4jdb.batchQuery(batchNode, error => done(error, pipe));
        });
      },
      (pipe, done) => {
        neo4jdb.cypherQuery(`MATCH ()-[r:WITH_ENTITY_STATE]->() WHERE id(r) = ${pipe.previousStateRelationId} SET r.to = ${version}`, error => done(error, pipe));
      },
      (pipe, done) => {
        const originIds = _.join(_.map(updatedSetsDomainRelations.deleted, id => `'${id}'`), ',');
        neo4jdb.cypherQuery(`
              MATCH (n)-[r:WITH_ENTITY]->(e:Entity) 
              WHERE (n:EntitySet OR n:EntityDomain) AND n.originId in [${originIds}] AND e.originId = '${entity.originId}'
              SET r.to = ${version}`, error => done(error, pipe));
      },
      (pipe, done) => {
        const originIds = _.join(_.map(updatedDrillups.deleted, id => `'${id}'`), ',');
        neo4jdb.cypherQuery(`
              MATCH (e:Entity)-[r:WITH_DRILLUP]->(drillup:Entity) 
              WHERE drillup.originId in [${originIds}] AND e.originId = '${entity.originId}'
              SET r.to = ${version}`, error => done(error, pipe));
      }
    ], onUpdated);
  }

  function deleteEntity(entity, version, onDeleted) {
    const cypher = `
      MATCH ()-[r:WITH_ENTITY]->(n:Entity {originId: '${entity.originId}'}),
            (:DimensionValues {originId: '${entity.originId}'})-[wiv:WITH_INDICATOR_VALUE]->()
      SET r.to = ${version}, wiv.to = ${version}`;

    return neo4jdb.cypherQuery(cypher, onDeleted);
  }

  function getUpdatedSetsDomainRelations(entitiesForSameOriginId) {
    const entities = _.sortBy(entitiesForSameOriginId, 'from');

    const prevEntity = _.first(entities);
    const actualEntity = _.last(entities);

    const deleted = [];
    const created = [];

    if (prevEntity.domain.toString() !== actualEntity.domain.toString()) {
      deleted.push(prevEntity.domain.toString());
      created.push(actualEntity.domain.toString());
    }

    const unchangedSets = _.map(_.intersectionWith(prevEntity.sets, actualEntity.sets, (prevSet, actualSet) => {
      return prevSet.toString() === actualSet.toString()
    }), _.toString);

    deleted.push(... _.without(_.map(prevEntity.sets, _.toString), unchangedSets));
    created.push(... _.without(_.map(actualEntity.sets, _.toString), unchangedSets));

    return {
      deleted,
      created
    }
  }

  function getUpdatedDrillups(entitiesForSameOriginId) {
    const entities = _.sortBy(entitiesForSameOriginId, 'from');

    const prevEntity = _.first(entities);
    const actualEntity = _.last(entities);

    const deleted = [];
    const created = [];

    const unchangedDrillups = _.map(_.intersectionWith(prevEntity.drillups, actualEntity.drillups, (prevDrillup, actualDrillup) => {
      return prevDrillup.toString() === actualDrillup.toString()
    }), _.toString);

    deleted.push(... _.without(_.map(prevEntity.drillups, _.toString), unchangedDrillups));
    created.push(... _.without(_.map(actualEntity.drillups, _.toString), unchangedDrillups));

    return {
      deleted,
      created
    }
  }
};
