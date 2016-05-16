const _ = require('lodash');
const async = require('async');
const mongoose = require('mongoose');

const exportUtils = require('./../export.utils.js');
const makeBatchNode = exportUtils.makeBatchNode;
const makeBatchRelation = exportUtils.makeBatchRelation;
const makeBatchIdBasedRelation = exportUtils.makeBatchIdBasedRelation;
const flattenProperties = exportUtils.flattenProperties;

module.exports = neo4jdb => {
  return function updateEntityDomains(pipe, onDomainsUpdated) {
    const Concepts = mongoose.model('Concepts');

    return async.waterfall([
      done => Concepts.find({type: 'entity_domain', $or: [{from: pipe.version}, {to: pipe.version}]}).lean().exec(done),
      (domains, done) => {
        const domainsByOriginId = _.groupBy(domains, domain => domain.originId.toString());

        return async.eachLimit(domainsByOriginId, 10, (domainsForSameOriginId, onDomainUpdated) => {
          if (exportUtils.isDeleted(domainsForSameOriginId, pipe.version)) {
            return deleteDomain(_.first(domainsForSameOriginId), pipe.version, onDomainUpdated)
          }

          if (exportUtils.isNew(domainsForSameOriginId, pipe.version)) {
            return createDomain(_.first(domainsForSameOriginId), pipe.version, pipe.dataset, onDomainUpdated)
          }

          if (exportUtils.isUpdated(domainsForSameOriginId, pipe.version)) {
            return updateDomain(_.last(_.sortBy(domainsForSameOriginId, 'from')), pipe.version, onDomainUpdated)
          }

          return onDomainUpdated();
        }, done);
      }
    ], error => onDomainsUpdated(error, pipe));
  };

  function createDomain(domain, version, dataset, onCreated) {
    let batchQueryId = 0;
    const batchNode = makeBatchNode({
      id: batchQueryId,
      labelName: 'EntityDomain',
      body: {originId: domain.originId.toString()}
    });

    batchNode.push(makeBatchRelation({
      fromNodeId: dataset.neoId,
      toNodeId: `{${batchQueryId}}`,
      relationName: 'WITH_ENTITY_DOMAIN',
      from: version
    }));

    const domainBatchId = batchQueryId;
    batchQueryId += 2;

    batchNode.push(makeBatchNode({
      id: batchQueryId,
      labelName: 'EntityDomainState',
      body: _.extend({gid: domain.gid, originId: domain.originId.toString()}, flattenProperties(domain))
    }));

    batchNode.push(makeBatchIdBasedRelation({
      fromNodeId: `{${domainBatchId}}`,
      toNodeId: `{${batchQueryId}}`,
      relationName: 'WITH_ENTITY_DOMAIN_STATE',
      from: version
    }));

    return neo4jdb.batchQuery(batchNode, onCreated);
  }

  function updateDomain(domain, version, onUpdated) {
    const findIdsOfDomainAndRelationQuery = `
      MATCH (n:EntityDomain {originId: '${domain.originId}'})-[r:WITH_ENTITY_DOMAIN_STATE]->()
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
        body: _.extend({gid: domain.gid, originId: domain.originId}, flattenProperties(domain))
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

  function deleteDomain(domain, version, onDeleted) {
    const cypher = `
      MATCH ()-[r:WITH_ENTITY_DOMAIN]->(n:EntityDomain {originId: '${domain.originId}'}) 
      SET r.to = ${version}`;

    return neo4jdb.cypherQuery(cypher, onDeleted);
  }
};
