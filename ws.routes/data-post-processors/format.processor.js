'use strict';

const _ = require('lodash');
const json2csv = require('json2csv');

module.exports = (wsJson, formatType, cb) => {
  let headers = wsJson.headers;
  let rows = wsJson.rows;

  switch(formatType) {
    case 'csv':
      return toCsv(headers, rows, cb);
    case 'json':
      return toJson(headers, rows, cb);
    case 'ddf':
      return toDdfJson(wsJson, cb);
    default:
      return cb(null, wsJson);
  }
};

function toCsv(headers, rows, cb) {
  toJson(headers, rows, (err, json) => {
    return json2csv({data: json, fields: headers, quotes: '"'}, (err, csv) => {
      if (err) {
        return cb(err);
      }

      return cb(null, csv);
    });
  });
}

function toJson(headers, rows, cb) {
  let json = _.map(rows, row => {
    return _.zipObject(headers, row);
  });

  return cb(null, json);
}

function toDdfJson(wsJson, cb) {
  let headers = wsJson.headers;
  let entities = wsJson.entities;
  let concepts = wsJson.concepts;
  let datapoints = wsJson.datapoints;

  let json = {
    concepts: _zipConcepts(concepts),
    entities: _zipEntities(entities, concepts),
    datapoints: _zipDatapoints(headers, datapoints, entities, concepts)
  };

  return cb(null, json);
}

function _zipConcepts(concepts) {
  let values = _.keys(concepts);

  let properties = _.chain(concepts)
    .flatMap(concept => _.keys(concept.properties))
    .uniq()
    .value();

  let propertyValues = _.chain(concepts)
    .flatMap(concept => _.values(concept.properties))
    .map((value) => _.isArray(value) || _.isObject(value) ?  JSON.stringify(value) : value)
    .uniq()
    .value();

  let _propertyValues = _.invert(propertyValues);

  let rows = _.map(values, (gid) => {
    let row = _.map(properties, (property) => {
      let value = concepts[gid].properties[property];
      let propertyValue = _.isArray(value) || _.isObject(value) ?  JSON.stringify(value) : value;

      return _.isNil(_propertyValues[propertyValue]) ? -1 : +_propertyValues[propertyValue];
    });

    return row;
  });

  return {
    values: values,
    properties: properties,
    propertyValues: propertyValues,
    rows: rows
  };
}

function _zipEntities(entities, concepts) {
  let isDomainOrSetOrTime = (value, key) => {
    return _.includes(['entity_domain', 'entity_set', 'time'], concepts[key].properties.concept_type);
  };
  let _conceptGids = _.chain(concepts).keys().invert().value();

  let _conceptValues = _.chain(_conceptGids)
    .pickBy(isDomainOrSetOrTime)
    .invert()
    .value();
  let conceptIndexs = _.keys(_conceptValues);
  let conceptsByOriginId = _.mapKeys(concepts, 'originId');

  let values = _.chain(entities).map('gid').uniq().value();
  let _values = _.invert(values);
  let properties = _.chain(entities)
    .flatMap(entity => _.keys(entity.properties))
    .uniq()
    .value();
  let propertyValues = _.chain(entities)
    .flatMap(entity => _.values(entity.properties))
    .map((value) => _.isArray(value) || _.isObject(value) ?  JSON.stringify(value) : value)
    .uniq()
    .value();
  let _propertyValues = _.invert(propertyValues);
  let rows = _.map(entities, (entity) => {
    let row = _.map(properties, (property) => {
      let value = entity.properties[property];
      let propertyValue = _.isArray(value) || _.isObject(value) ?  JSON.stringify(value) : value;

      return _.isNil(_propertyValues[propertyValue]) ? -1 : +_propertyValues[propertyValue];
    });

    let conceptMask = _.reduce(conceptIndexs, (result, ci) => {
      let getConceptGid = (setOriginId) => conceptsByOriginId[setOriginId] && conceptsByOriginId[setOriginId].gid;
      let entitySets = _.chain(entity.sets)
        .map(getConceptGid)
        .compact()
        .concat([conceptsByOriginId[entity.domain].gid])
        .value();
      let isExistedRelation = _.includes(entitySets, _conceptValues[ci]);

      result += isExistedRelation ? 1 : 0;

      return result;
    }, '');

    row.unshift(+_values[entity.gid], conceptMask);

    return row;
  });

  return {
    values: values,
    properties: properties,
    concepts: conceptIndexs,
    propertyValues: propertyValues,
    rows: rows
  };
}

function _zipDatapoints(headers, datapoints, entities, concepts) {
  let isMeasure = (value, key) => {
    return _.includes(['measure'], concepts[key].properties.concept_type)
      && _.includes(headers, concepts[key].properties.concept);
  };

  let _conceptGids = _.chain(concepts).keys().invert().value();
  let _conceptValues = _.chain(_conceptGids)
    .pickBy(isMeasure)
    .invert()
    .value();
  let conceptIndexes = _.keys(_conceptValues);
  let conceptsByOriginId = _.mapKeys(concepts, 'originId');

  let _entityGids = _.chain(entities).map('gid').uniq().value();
  let entitiesNGram = _entityGids.length.toString(2).length;
  let _entityIndexes = _.chain(_entityGids)
    .mapKeys((value, index) => {
      let indexBits = (+index).toString(2);
      let indexNGram = indexBits.length;

      return _.repeat('0', entitiesNGram - indexNGram) + indexBits;
    })
    .invert()
    .value();

  let values = _.chain(datapoints).map('value').uniq().value();
  let _values = _.invert(values);

  let rows = _.chain(datapoints)
    .reduce((result, datapoint) => {
      let mask = _.chain(datapoint.dimensions)
        .map((entityOriginId) => _entityIndexes[entities[entityOriginId].gid])
        .join('')
        .value();
      if (!result[mask]) {
        result[mask] = {};
      }
      result[mask][conceptsByOriginId[datapoint.measure].gid] = _values[datapoint.value];
      return result;
    }, {})
    .map((row, mask) => {
      return _.concat([mask], _.map(conceptIndexes, (conceptIndex) => {
        return row[_conceptValues[conceptIndex]] ? +row[_conceptValues[conceptIndex]] : -1;
      }));
    })
    .value();

  return {
    values: values,
    concepts: conceptIndexes,
    rows: rows
  };
}
