'use strict';

const _ = require('lodash');

module.exports = (data, cb) => {

  if (_.get(data, 'datapoints.values.0', false)) {
    return cb(null, __packDdfDatapoints(data));
  }

  if (_.get(data, 'entities.values.0', false)) {
    return cb(null, __packDdfEntities(data))
  }

  return cb(null, __packDdfConcepts(data));
};

function __packDdfConcepts(data) {
  const rows = data.concepts.rows;
  const properties = data.concepts.properties;
  const propertyValues = data.concepts.propertyValues;

  return _.map(rows, (row) => {
    return _.reduce(properties, (result, property, index) => {
      result[property] = _.get(propertyValues, row[index], null);
      return result;
    }, {});
  });
}

function __packDdfEntities(data) {
  const rows = data.entities.rows;
  const properties = data.entities.properties;
  const propertyValues = data.entities.propertyValues;
  const offsetKey = 2;

  return _.map(rows, (row) => {

    return _.reduce(properties, (result, property, index) => {
      result[property] = _.get(propertyValues, row[index + offsetKey], null);
      return result;
    }, {});
  });
}

function __packDdfDatapoints(data) {
  const entitiesNGram = _.size(data.entities.rows).toString(2).length;
  const dimensions = _.map(data.datapoints.dimensions, (conceptIndex => data.concepts.values[conceptIndex]));
  const indicators = _.map(data.datapoints.indicators, (conceptIndex => data.concepts.values[conceptIndex]));
  const entityValues = _.map(data.entities.rows, (row) => data.entities.values[_.first(row)]);
  const rows = data.datapoints.rows;
  const offsetKey = 1;

  return _.map(rows, (row) => {
    const entitiesIndexes = _.chain(_.first(row))
      .chunk(entitiesNGram)
      .mapValues((entityBitMask) => parseInt(_.join(entityBitMask, ''), 2))
      .value();

    let datapoint = _.reduce(entitiesIndexes, (result, entityIndex, key) => {
      result[dimensions[key]] = entityValues[entityIndex];
      return result;
    }, {});

    return _.chain(row).drop(offsetKey).reduce((result, value, index) => {
      result[indicators[index]] = data.datapoints.values[value] || "";
      return result;
    }, datapoint).value();
  });
}
