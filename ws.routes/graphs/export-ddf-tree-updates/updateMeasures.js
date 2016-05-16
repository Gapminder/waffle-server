const _ = require('lodash');
const async = require('async');
const mongoose = require('mongoose');

const exportUtils = require('./../export.utils.js');
const makeBatchNode = exportUtils.makeBatchNode;
const makeBatchRelation = exportUtils.makeBatchRelation;
const makeBatchIdBasedRelation = exportUtils.makeBatchIdBasedRelation;
const flattenProperties = exportUtils.flattenProperties;

module.exports = neo4jdb => {
  return function updateMeasures(pipe, onMeasuresUpdated) {
    const Concepts = mongoose.model('Concepts');

    return async.waterfall([
      done => Concepts.find({type: 'measure', $or: [{from: pipe.version}, {to: pipe.version}]}).lean().exec(done),
      (measures, done) => {
        const measuresByOriginId = _.groupBy(measures, measure => measure.originId.toString());

        return async.eachLimit(measuresByOriginId, 10, (measuresForSameOriginId, onMeasureUpdated) => {
          if (exportUtils.isDeleted(measuresForSameOriginId, pipe.version)) {
            return deleteMeasure(_.first(measuresForSameOriginId), pipe.version, onMeasureUpdated)
          }

          if (exportUtils.isNew(measuresForSameOriginId, pipe.version)) {
            return createMeasure(_.first(measuresForSameOriginId), pipe.version, pipe.dataset, onMeasureUpdated)
          }

          if (exportUtils.isUpdated(measuresForSameOriginId, pipe.version)) {
            return updateMeasure(_.last(_.sortBy(measuresForSameOriginId, 'from')), pipe.version, onMeasureUpdated)
          }

          return onMeasureUpdated();
        }, done);
      }
    ], error => onMeasuresUpdated(error, pipe));
  };

  function createMeasure(measure, version, dataset, onCreated) {
    let batchQueryId = 0;
    const batchNode = makeBatchNode({
      id: batchQueryId,
      labelName: 'Measure',
      body: {originId: measure.originId.toString()}
    });

    batchNode.push(makeBatchRelation({
      fromNodeId: dataset.neoId,
      toNodeId: `{${batchQueryId}}`,
      relationName: 'WITH_MEASURE',
      from: version
    }));

    const measureBatchId = batchQueryId;
    batchQueryId += 2;

    batchNode.push(makeBatchNode({
      id: batchQueryId,
      labelName: 'MeasureState',
      body: _.extend({gid: measure.gid, originId: measure.originId.toString()}, flattenProperties(measure))
    }));

    batchNode.push(makeBatchIdBasedRelation({
      fromNodeId: `{${measureBatchId}}`,
      toNodeId: `{${batchQueryId}}`,
      relationName: 'WITH_MEASURE_STATE',
      from: version
    }));

    return neo4jdb.batchQuery(batchNode, onCreated);
  }

  function updateMeasure(measure, version, onUpdated) {
    const findIdsOfMeasureAndStateRelationQuery = `
      MATCH (n:Measure {originId: '${measure.originId}'})-[r:WITH_MEASURE_STATE]->()
      WHERE
        ${version} > r.from 
        AND ${version} < r.to 
        AND r.to = ${Number.MAX_SAFE_INTEGER} 
      RETURN DISTINCT id(n),id(r)`;

    return neo4jdb.cypherQuery(findIdsOfMeasureAndStateRelationQuery, (error, response) => {
      const ids = _.flatten(response.data);
      const measureNeoId = _.first(ids);
      const previousStateRelationNeoId = _.last(ids);

      let batchQueryId = 0;
      const batchNode = makeBatchNode({
        id: batchQueryId,
        labelName: 'MeasureState',
        body: _.extend({gid: measure.gid, originId: measure.originId}, flattenProperties(measure))
      });

      batchNode.push(makeBatchRelation({
        fromNodeId: measureNeoId,
        toNodeId: `{${batchQueryId}}`,
        relationName: 'WITH_MEASURE_STATE',
        from: version
      }));

      return neo4jdb.batchQuery(batchNode, error => {
        if (error) {
          return onUpdated(error);
        }

        neo4jdb.cypherQuery(`
          MATCH ()-[r:WITH_MEASURE_STATE]->() 
          WHERE id(r) = ${previousStateRelationNeoId} 
          SET r.to = ${version}`, onUpdated);
      });
    });
  }

  function deleteMeasure(measure, version, onDeleted) {
    const cypher = `
      MATCH ()-[r:WITH_MEASURE]->(n:Measure {originId: '${measure.originId}'}) 
      SET r.to = ${version}`;

    return neo4jdb.cypherQuery(cypher, onDeleted);
  }
};
