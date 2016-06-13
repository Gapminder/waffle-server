'use strict';

const _ = require('lodash');

const mongoose = require('mongoose');
const Entities = mongoose.model('Entities');
const Concepts = mongoose.model('Concepts');

const utils = require('../../utils');
const constants = require('../../../ws.utils/constants');

module.exports = EntitiesRepositoryWrapper;

function EntitiesRepositoryWrapper(options) {
  this.version = options.version;
  this.datasetId = options.datasetId;
}

EntitiesRepositoryWrapper.prototype.currentVersion = function () {
  const versionQueryFragment = {
    from: {$lte: this.version},
    to: {$gt: this.version},
    dataset: this.datasetId
  };
  return new EntitiesRepository(versionQueryFragment)
};

function EntitiesRepository(versionQueryFragment) {
  this.versionQueryFragment = versionQueryFragment;
}

EntitiesRepository.prototype.findEntityProperties = function(entityDomainGid, select, where, onPropertiesFound) {
  const conceptQuery = _.merge({}, this.versionQueryFragment, {
      gid: entityDomainGid,
      'properties.concept_type': entityDomainGid === 'time' ? 'time' : 'entity_domain'
  });

  return Concepts.findOne(conceptQuery).lean().exec((error, concept) => {
    if (error) {
      return onPropertiesFound(error);
    }

    const projection = makePositiveProjectionFor(_.without(select, entityDomainGid));
    if (_.includes(select, entityDomainGid)) {
      projection.gid = 1;
    }

    where = toPropertiesDotNotation(_.mapKeys(where, (value, key) => {
      if (key === entityDomainGid) {
        return 'gid';
      }
      return key;
    }));

    const entitiesQuery = _.merge({}, this.versionQueryFragment, {domain: concept.originId}, where);

    return Entities.find(entitiesQuery, projection).lean().exec(onPropertiesFound);
  });
};

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  EntitiesRepository.prototype[actionName] = utils.actionFactory(actionName)(Entities, this);
});


function makePositiveProjectionFor(properties) {
  const positiveProjectionValues = _.fill(new Array(_.size(properties)), 1);
  return toPropertiesDotNotation(_.chain(properties).zipObject(positiveProjectionValues).value());
}

function toPropertiesDotNotation(object) {
  return _.mapKeys(object, (value, property) => property === 'gid' ? property : `properties.${property}`);
}
