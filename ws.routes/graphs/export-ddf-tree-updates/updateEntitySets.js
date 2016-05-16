const _ = require('lodash');
const async = require('async');
const mongoose = require('mongoose');

const exportUtils = require('./../export.utils.js');
const makeBatchNode = exportUtils.makeBatchNode;
const makeBatchRelation = exportUtils.makeBatchRelation;
const makeBatchIdBasedRelation = exportUtils.makeBatchIdBasedRelation;
const flattenProperties = exportUtils.flattenProperties;

module.exports = neo4jdb => {
  return function updateEntitySets(pipe, onEntitySetsUpdated) {
    const Concepts = mongoose.model('Concepts');

    return async.waterfall([
      done => Concepts.find({type: 'entity_set', $or: [{from: pipe.version}, {to: pipe.version}]}).lean().exec(done),
      (entitySets, done) => {
        const entitySetsByOriginId = _.groupBy(entitySets, entitySet => entitySet.originId.toString());

        return async.eachLimit(entitySetsByOriginId, 10, (entitySetsForSameOriginId, onEntitySetUpdated) => {
          if (exportUtils.isDeleted(entitySetsForSameOriginId, pipe.version)) {
            return deleteEntitySet(_.first(entitySetsForSameOriginId), pipe.version, onEntitySetUpdated)
          }

          if (exportUtils.isNew(entitySetsForSameOriginId, pipe.version)) {
            return createEntitySet(_.first(entitySetsForSameOriginId), pipe.version, onEntitySetUpdated)
          }

          if (exportUtils.isUpdated(entitySetsForSameOriginId, pipe.version)) {
            return updateEntitySet(_.last(_.sortBy(entitySetsForSameOriginId, 'from')), pipe.version, onEntitySetUpdated)
          }

          return onEntitySetUpdated();
        }, done);
      }
    ], error => onEntitySetsUpdated(error, pipe));
  };

  function createEntitySet(entitySet, version, onCreated) {
    return neo4jdb.cypherQuery(`MATCH (n:EntityDomain {originId: '${entitySet.domain.toString()}'}) RETURN id(n) LIMIT 1`, (error, response) => {
      const domainNeoId = _.first(response.data);

      let batchQueryId = 0;
      const batchNode = makeBatchNode({
        id: batchQueryId,
        labelName: 'EntitySet',
        body: {originId: entitySet.originId.toString()}
      });

      batchNode.push(makeBatchIdBasedRelation({
        fromNodeId: `{${batchQueryId}}`,
        toNodeId: domainNeoId,
        relationName: 'IS_SUBSET_OF_ENTITY_DOMAIN',
        from: version
      }));

      const entitySetBatchId = batchQueryId;
      batchQueryId += 2;

      batchNode.push(makeBatchNode({
        id: batchQueryId,
        labelName: 'EntitySetState',
        body: _.extend({gid: entitySet.gid, originId: entitySet.originId.toString()}, flattenProperties(entitySet))
      }));

      batchNode.push(makeBatchIdBasedRelation({
        fromNodeId: `{${entitySetBatchId}}`,
        toNodeId: `{${batchQueryId}}`,
        relationName: 'WITH_ENTITY_SET_STATE',
        from: version
      }));

      return neo4jdb.batchQuery(batchNode, onCreated);
    });
  }

  function updateEntitySet(entitySet, version, onUpdated) {
    const findIdsOfEntitySetAndRelationQuery = `
      MATCH (n:EntitySet {originId: '${entitySet.originId}'})-[r:WITH_ENTITY_SET_STATE]->()
      WHERE 
        ${version} > r.from 
        AND ${version} < r.to 
        AND r.to = ${Number.MAX_SAFE_INTEGER} 
      RETURN DISTINCT id(n),id(r)`;

    return neo4jdb.cypherQuery(findIdsOfEntitySetAndRelationQuery, (error, response) => {
      const ids = _.flatten(response.data);
      const domainId = _.first(ids);
      const previousRelationId = _.last(ids);

      let batchQueryId = 0;

      const batchNode = makeBatchNode({
        id: batchQueryId,
        labelName: 'EntitySetState',
        body: _.extend({gid: entitySet.gid, originId: entitySet.originId}, flattenProperties(entitySet))
      });

      batchNode.push(makeBatchRelation({
        fromNodeId: domainId,
        toNodeId: `{${batchQueryId}}`,
        relationName: 'WITH_ENTITY_SET_STATE',
        from: version
      }));

      return neo4jdb.batchQuery(batchNode, error => {
        if (error) {
          return onUpdated(error);
        }

        neo4jdb.cypherQuery(`
          MATCH ()-[r:WITH_ENTITY_SET_STATE]->() 
          WHERE id(r) = ${previousRelationId} 
          SET r.to = ${version}`, onUpdated);
      });
    });
  }

  function deleteEntitySet(entitySet, version, onDeleted) {
    const cypher = `
      MATCH ()<-[r:IS_SUBSET_OF_ENTITY_DOMAIN]-(n:EntitySet {originId: '${entitySet.originId}'}) 
      SET r.to = ${version}`;

    return neo4jdb.cypherQuery(cypher, onDeleted);
  }
};
