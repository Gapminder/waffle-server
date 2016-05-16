const _ = require('lodash');
const async = require('async');
const mongoose = require('mongoose');

const exportUtils = require('./../export.utils.js');
const makeBatchNode = exportUtils.makeBatchNode;
const makeBatchRelation = exportUtils.makeBatchRelation;
const makeBatchIdBasedRelation = exportUtils.makeBatchIdBasedRelation;
const flattenProperties = exportUtils.flattenProperties;

module.exports = neo4jdb => {
  return function updateDatapoints(pipe, onDatapointsUpdated) {
    const Datapoints = mongoose.model('Datapoints');

    return async.waterfall([
      done => Datapoints.find({$or: [{from: pipe.version}, {to: pipe.version}]}, null, {join: {dimensions: ''}}).lean().exec(done),
      (datapoints, done) => {
        const datapointsByOriginId = _.groupBy(datapoints, datapoint => datapoint.originId.toString());

        return async.eachLimit(datapointsByOriginId, 10, (datapointsForSameOriginId, onDatapointUpdated) => {
          if (exportUtils.isDeleted(datapointsForSameOriginId, pipe.version)) {
            return deleteDatapoint(_.first(datapointsForSameOriginId), pipe.version, onDatapointUpdated)
          }

          if (exportUtils.isNew(datapointsForSameOriginId, pipe.version)) {
            return createDatapoint(_.first(datapointsForSameOriginId), pipe.version, pipe.dataset, onDatapointUpdated)
          }

          if (exportUtils.isUpdated(datapointsForSameOriginId, pipe.version)) {
            return updateDatapoint(_.last(_.sortBy(datapointsForSameOriginId, 'from')), pipe.version, onDatapointUpdated)
          }

          return onDatapointUpdated();
        }, done);
      }
    ], error => onDatapointsUpdated(error, pipe));
  };

  function createDatapoint(datapoint, version, dataset, onCreated) {
    return async.waterfall([
      (done) => {
        let batchQueryId = 0;
        const batchNode = makeBatchNode({
          id: batchQueryId,
          labelName: 'IndicatorValues',
          body: {originId: datapoint.originId.toString()}
        });

        const datapointBatchId = batchQueryId;
        batchQueryId += 2;

        batchNode.push(makeBatchNode({
          id: batchQueryId,
          labelName: 'IndicatorValueState',
          body: _.extend({originId: datapoint.originId.toString()}, flattenProperties(datapoint))
        }));

        batchNode.push(makeBatchIdBasedRelation({
          fromNodeId: `{${datapointBatchId}}`,
          toNodeId: `{${batchQueryId}}`,
          relationName: 'WITH_INDICATOR_VALUE_STATE',
          from: version
        }));

        return neo4jdb.batchQuery(batchNode, done);
      },
      (done) => {
        async.eachSeries(datapoint.dimensions, (entity, onEntityProcessed) => {
          const conceptsAsOriginIds = _(entity.sets)
            .concat([entity.domain])
            .map(_.toString)
            .uniq()
            .value();

          let conceptCounter = 0;

          const getDimensionValueCypher = once(`(dv:DimensionValues {originId: '${entity.originId.toString()}'})`, '(dv)');

          let createDatapointQuery = `
            MERGE (i:Indicators {originId: '${datapoint.measure.toString()}'}) 
            MERGE (iv:IndicatorValues {originId: '${datapoint.originId.toString()}'}) 
            MERGE (ds:Dataset {originId: '${dataset._id.toString()}'})-[wi:WITH_INDICATOR]->(i) 
              ON CREATE wi.from = ${version} wi.to = ${Number.MAX_SAFE_INTEGER}`;

          createDatapointQuery = _.reduce(conceptsAsOriginIds, (result, originId) => {
            result += ` MERGE (i)-[wd${conceptCounter}:WITH_DIMENSION]->(d${conceptCounter}:Dimensions {originId: '${originId}'}) 
                          ON CREATE SET wd${conceptCounter}.from = ${version}, wd${conceptCounter}.to = ${Number.MAX_SAFE_INTEGER}`;

            result += ` MERGE (d${conceptCounter})-[wdv${conceptCounter}:WITH_DIMENSION_VALUE]->${getDimensionValueCypher()} 
                          ON CREATE SET wdv${conceptCounter}.from = ${version}, wdv${conceptCounter}.to = ${Number.MAX_SAFE_INTEGER}`;

            result += ` MERGE (dv)-[wiv${conceptCounter}:WITH_INDICATOR_VALUE]->(iv) 
                          ON CREATE SET wiv${conceptCounter}.from = ${version}, wiv${conceptCounter}.to = ${Number.MAX_SAFE_INTEGER}`;

            return result;
          }, createDatapointQuery);


          neo4jdb.cypherQuery(createDatapointQuery, onEntityProcessed);
        }, done);
      }
    ], onCreated);
  }

  function updateDatapoint(datapoint, version, onUpdated) {
    const findIdsOfDomainAndRelationQuery = `
      MATCH (n:EntityDomain {originId: '${datapoint.originId}'})-[r:WITH_ENTITY_DOMAIN_STATE]->()
      WHERE 
        ${version} > r.from 
        AND ${version} < r.to 
        AND r.to = ${Number.MAX_SAFE_INTEGER} 
      RETURN DISTINCT id(n),id(r)`;

    return neo4jdb.cypherQuery(findIdsOfDomainAndRelationQuery, (error, response) => {
      const ids = _.flatten(response.data);
      const domainId = _.first(ids);
      const previousRelationId = _.last(ids);

      let batchQueryId = 0;

      const batchNode = makeBatchNode({
        id: batchQueryId,
        labelName: 'EntityDomainState',
        body: _.extend({gid: datapoint.gid, originId: datapoint.originId}, flattenProperties(datapoint))
      });

      batchNode.push(makeBatchRelation({
        fromNodeId: domainId,
        toNodeId: `{${batchQueryId}}`,
        relationName: 'WITH_ENTITY_DOMAIN_STATE',
        from: version
      }));

      return neo4jdb.batchQuery(batchNode, error => {
        if (error) {
          return onUpdated(error);
        }

        neo4jdb.cypherQuery(`
          MATCH ()-[r:WITH_ENTITY_DOMAIN_STATE]->() 
          WHERE id(r) = ${previousRelationId} 
          SET r.to = ${version}`, onUpdated);
      });
    });
  }

  function deleteDatapoint(datapoint, version, onDeleted) {
    const cypher = `
      MATCH ()-[r:WITH_INDICATOR_VALUE]->(n:IndicatorValues {originId: '${datapoint.originId}'}) 
      SET r.to = ${version}`;

    return neo4jdb.cypherQuery(cypher, onDeleted);
  }

  function once(firstTime, otherwise) {
    let called = false;
    return function() {
      if (!called) {
        called = true;
        return firstTime;
      } else {
        return otherwise;
      }
    }
  }
};
