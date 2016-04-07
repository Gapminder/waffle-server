'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/**
 * @typedef {Object} Entities
 * @memberof Models
 *
 * @property {String} gid - entity value
 * @property {String} title - nice name for entity
 *
 * @property {Object} properties - all properties from data set
 *
 * @property {Models.EntityGroups} domain - of entity, reference to only one entity domain from EntityGroups collection
 * @property {Models.EntityGroups} sets - of entity, in which entity takes part of
 * @property {Models.Entities} drilldown - to lower-tier authorities (entity)
 * @property {Models.Entities} drillup - to higher authorities (entity)
 *
 * @property {Array<Models.DataSetVersions>} dataSetVersions - all versions of data set in which the entity was added
 * @property {Models.Entity} previous - of current entity (could be null)
 */
let Entities = new Schema({
  gid: {type: String, match: /^[a-z0-9_]*$/, index: true, required: true},
  title: String,
  properties: {},

  // should be required
  domain: {type: Schema.Types.ObjectId, ref: 'EntityGroups'},
  sets: [{type: Schema.Types.ObjectId, ref: 'EntityGroups'}],
  drilldown: {type: Schema.Types.ObjectId, ref: 'Entities'},
  drillup: {type: Schema.Types.ObjectId, ref: 'Entities'},

  dataSetVersions: [{type: Schema.Types.ObjectId, ref: 'DataSetVersions'}],
  previous: {type: Schema.Types.ObjectId, ref: 'Entities', sparse: true}
});

Entities.index({gid: 1, domain: 1});
Entities.index({gid: 1, sets: 1});
Entities.index({gid: 1, dataSetVersions: 1});
Entities.index({gid: 1, drilldown: 1});
Entities.index({gid: 1, drillup: 1});

module.exports = mongoose.model('Entities', Entities);
