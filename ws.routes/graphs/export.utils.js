'use strict';

const _ = require('lodash');

module.exports = {
  makeBatchNode,
  makeBatchRelation,
  flattenProperties,
  makeBatchIdBasedRelation,
  isDeleted,
  isNew,
  isUpdated
};

function makeBatchNode({id, body, method = 'POST', labelName}) {
  const node = {
    body,
    to: '/node',
    id,
    method: method
  };

  const label = {
    method: method,
    to: `{${id}}/labels`,
    id: ++id,
    body: labelName
  };

  return [node, label];
}

function makeBatchRelation({id, fromNodeId, toNodeId , method = 'POST', relationName, from = 1, to = Number.MAX_SAFE_INTEGER}) {
  return {
    method,
    to: `/node/${fromNodeId}/relationships`,
    id: id,
    body: {
      to: `${toNodeId}`,
      type: relationName,
      data : {
        from,
        to
      }
    }
  };
}

function makeBatchIdBasedRelation({id, fromNodeId, toNodeId , method = 'POST', relationName, from = 1, to = Number.MAX_SAFE_INTEGER}) {
  return {
    method,
    to: `${fromNodeId}/relationships`,
    id: id,
    body: {
      to: `${toNodeId}`,
      type: relationName,
      data : {
        from,
        to
      }
    }
  };
}

function flattenProperties(obj) {
  if (!obj.properties) {
    return {};
  }

  return _.chain(obj.properties)
    .omitBy(_.isNil)
    .mapValues(value => JSON.stringify(value))
    .mapKeys((value, key) => `properties.${key}`)
    .value();
}


function isDeleted(docsForOriginId, version) {
  if (docsForOriginId.length !== 1) {
    return false;
  }

  const doc = _.first(docsForOriginId);
  return doc.from < version && doc.to === version;
}

function isNew(docsForOriginId, version) {
  if (docsForOriginId.length !== 1) {
    return false;
  }

  const doc = _.first(docsForOriginId);
  return doc.from === version && version < doc.to;
}

function isUpdated(docsForOriginId, version) {
  if (docsForOriginId.length !== 2) {
    return false;
  }

  docsForOriginId = _.sortBy(docsForOriginId, 'from');
  const origin = _.first(docsForOriginId);
  const updated = _.last(docsForOriginId);

  return (origin.from < version && version === origin.to)
    && (updated.from === version && version < updated.to)
}
