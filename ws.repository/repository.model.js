'use strict';
const _ = require('lodash');
const constants = require('../ws.utils/constants');

module.exports = VersionedModelRepository;

function VersionedModelRepository(versionQueryFragment) {
  this.versionQueryFragment = versionQueryFragment;
}

VersionedModelRepository.prototype._composeQuery = function () {
  return _.merge.bind(_, {}, this.versionQueryFragment).apply(undefined, arguments);
};

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
