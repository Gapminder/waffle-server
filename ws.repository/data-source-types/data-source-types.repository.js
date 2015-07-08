'use strict';

/**
 * @callback DataSourcesTypesSingleCallback
 * @param {Error} [err] - mongoose level error, if any
 * @param {DataSourceTypes} [dataSourceType] - found data source type instance, if any
 */

/**
 * @callback DataSourcesTypesArrayCallback
 * @param {Error} [err] - mongoose level error, if any
 * @param {DataSourceTypes} [dataSourceType] - found data source type instance, if any
 */

var mongoose = require('mongoose');
var DataSourceTypes = mongoose.model('DataSourceTypes');

function DataSourceTypesRepository() {
}

/**
 * List all known Data Source Types
 * @param {DataSourcesTypesArrayCallback} cb - will be called when done
 * @returns {DataSourceTypesRepository} - this, chainable
 */
DataSourceTypesRepository.prototype.list = function listAll(cb) {
  DataSourceTypes
    .find({})
    .lean()
    .exec(cb);
  return this;
};

/**
 * Adds new Data Source Type if not exists,
 * or update existing
 * @param {DataSourceTypes} dst - Data Source Type formatted instance
 * @param {ErrorOnlyCallback} cb - callback, to be called on finish
 * @returns {DataSourceTypesRepository} - this, chainable
 */
DataSourceTypesRepository.prototype.add = function addNewOrIgnore(dst, cb) {
  DataSourceTypes.update({name: dst.name}, {$set: dst}, {$upsert: true}, function (err) {
    return cb(err);
  });
  return this;
};

/**
 * Find Data Source Type by name
 * @param {String} name - name of data source type
 * @param {DataSourcesTypesSingleCallback} cb - callback
 * @returns {DataSourceTypesRepository} - this, chainable
 */
DataSourceTypesRepository.prototype.findByName = function findByName(name, cb) {
  DataSourceTypes
    .findOne({name: name})
    .lean()
    .exec(cb);
  return this;
};

/**
 * Find Data Source Type by id
 * @param {String|ObjectId} id - name of data source type
 * @param {DataSourcesTypesSingleCallback} cb - callback
 * @returns {DataSourceTypesRepository} - this, chainable
 */
DataSourceTypesRepository.prototype.findByName = function findByName(id, cb) {
  DataSourceTypes
    .findOne({_id: id})
    .lean()
    .exec(cb);
  return this;
};

module.exports = DataSourceTypesRepository;
