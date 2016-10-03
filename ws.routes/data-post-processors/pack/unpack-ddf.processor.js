'use strict';

const _ = require('lodash');

module.exports = {
  unpackDdfConcepts,
  unpackDdfEntities,
  unpackDdfDatapoints
};

function unpackDdfConcepts(data) {
  const rows = _.get(data, 'concepts.rows', []);
  const properties = _.get(data, 'concepts.properties', []);
  const propertyValues = _.get(data, 'concepts.propertyValues', []);

  return _.map(rows, (row) => {
    return _.reduce(properties, (result, property, index) => {
      result[property] = _.get(propertyValues, row[index], null);
      return result;
    }, {});
  });
}

function unpackDdfEntities(data) {
  const rows = _.get(data, 'entities.rows', []);
  const properties = _.get(data, 'entities.properties', []);
  const propertyValues = _.get(data, 'entities.propertyValues', []);
  const offsetKey = 2;

  return _.map(rows, (row) => {
    return _.reduce(properties, (result, property, index) => {
      result[property] = _.get(propertyValues, row[index + offsetKey], null);
      return result;
    }, {});
  });
}

function unpackDdfDatapoints(data) {
  const entitiesRows = _.get(data, 'entities.rows', []);
  const entitiesValues = _.get(data, 'entities.values', []);
  const entitiesNGram = _.size(entitiesRows).toString().length;
  const datapointsDimensions = _.get(data, 'datapoints.dimensions', []);
  const conceptsValues = _.get(data, 'concepts.values', []);
  const dimensions = _.map(datapointsDimensions, (conceptIndex => conceptsValues[conceptIndex]));
  const datapointsIndicators = _.get(data, 'datapoints.indicators', []);
  const indicators = _.map(datapointsIndicators, (conceptIndex => conceptsValues[conceptIndex]));
  const entityValues = _.map(entitiesRows, (row) => entitiesValues[_.first(row)]);
  const rows = _.get(data, 'datapoints.rows', []);
  const datapointsValues = _.get(data, 'datapoints.values', []);
  const offsetKey = 1;

  return _.map(rows, (row) => {
    const entitiesIndexes = _.chain(_.first(row))
      .chunk(entitiesNGram)
      .mapValues((entityDecimalMask) => parseInt(_.join(entityDecimalMask, ''), 10))
      .value();

    let datapoint = _.reduce(entitiesIndexes, (result, entityIndex, key) => {
      result[conceptsValues[datapointsDimensions[key]]] = entityValues[entityIndex];
      return result;
    }, {});

    return _.chain(row).drop(offsetKey).reduce((result, value, index) => {
      result[indicators[index]] = _.isNil(datapointsValues[value]) ? null : '' + datapointsValues[value];
      return result;
    }, datapoint).value();
  });
}
