'use strict';

const _ = require('lodash');
const constants = require('../ws.utils/constants');
const mongoose = require('mongoose');

module.exports = VersionedModelRepository;

function VersionedModelRepository(versionQueryFragment, datasetId, version) {
  this.versionQueryFragment = versionQueryFragment;
  this.datasetId = datasetId;
  this.version = version;
}

VersionedModelRepository.prototype._composeQuery = function () {
  return _.merge.bind(_, {}, this.versionQueryFragment).apply(undefined, arguments);
};

VersionedModelRepository.prototype.create = function (documents, onCreated) {
  documents = Array.isArray(documents) ? setId(documents) : setId([documents]);
  return this._getModel().insertMany(documents, onCreated);
};

function setId(documents) {
  _.forEach(documents, document => {
    const id = mongoose.Types.ObjectId();
    document._id = id;
    if (!document.originId) {
      document.originId = id;
    }
  });
  return documents;
}

VersionedModelRepository.prototype._normalizeWhereClause = function (where) {
  return _.reduce(where, normalizeValue, {});

  function normalizeValue(result, setOfValues, key) {
    // geo.is--country
    if ( _.includes(key, constants.IS_OPERATOR) ) {
      result[key] = !!_.first(setOfValues);

      return result;
    }

    // time = 1800,1900,2000
    // time = 1900, 1905, 1910:1920, 1930
    // geo = usa, ukr, dza
    if ( _.isArray(setOfValues) ) {
      const restoredValues = _.flatMap(setOfValues, (value) => {
        if (_.isArray(value)) {
          return _.range(_.first(value), _.last(value) + 1);
        }

        return [value];
      });

      result[key] = {$in: restoredValues};

      return result;
    }

    result[key] = setOfValues;

    return result;
  }

  function _normalizeKey(value, key) {
    return key.slice(key.indexOf('.') + 1);
  }
};
