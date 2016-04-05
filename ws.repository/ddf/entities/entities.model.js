'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * @typedef {Object} Entities
 * @memberof Models
 *
 * @property {String} gid - entity value
 * @property {String} title - nice name for entity
 *
 * @property {Object} properties - all properties from data set
 *
 * @property {Models.EntityGroups} parent - of entity, reference to entity domain or entity set
 * @property {Models.EntityGroups} parents - of entity, reference to entities group in which entity takes part of
 * @property {Models.Entities} drilldown - to lower-tier authorities (entity)
 * @property {Models.Entities} drillup - to higher authorities (entity)
 *
 * @property {Array<Models.DataSetVersions>} dataSetVersions - all versions of data set in which the entity was added
 * @property {Models.Entity} previousValue - of current entity (could be null)
 */
var Entities = new Schema({
  gid: {type: String, match: /^[a-z0-9_]*$/, index: true, required: true},
  title: String,
  properties: {},

  // should be required
  parent: {type: Schema.Types.ObjectId, ref: 'EntityGroups'},
  parents: [{type: Schema.Types.ObjectId, ref: 'EntityGroups'}],
  drilldown: {type: Schema.Types.ObjectId, ref: 'Entities'},
  drillup: {type: Schema.Types.ObjectId, ref: 'Entities'},

  dataSetVersions: [{type: Schema.Types.ObjectId, ref: 'DataSetVersions'}],
  previousValue: {type: Schema.Types.ObjectId, ref: 'EntityGroups', sparse: true}
});

Entities.index({gid: 1, parent: 1});
Entities.index({gid: 1, parents: 1});
Entities.index({gid: 1, dataSetVersions: 1});
Entities.index({gid: 1, drilldown: 1});
Entities.index({gid: 1, drillup: 1});

module.exports = mongoose.model('Entities', Entities);
