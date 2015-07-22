'use strict';

/**
 * @callback DataSourceTypesSingleCallback
 * @param {Error} [err] - mongoose level error, if any
 * @param {Models.DataSourceTypes} [dataSourceType] - found data source type instance, if any
 */

/**
 * @callback DataSourceTypesArrayCallback
 * @param {Error} [err] - mongoose level error, if any
 * @param {Models.DataSourceTypes} [dataSourceType] - found data source type instance, if any
 */

var _ = require('lodash');
var mongoose = require('mongoose');
var DataSourceTypes = mongoose.model('DataSourceTypes');

function DataSourceTypesRepository() {
}

/**
 * Callback wrapper to return single item in callback
 * @param {DataSourceTypesSingleCallback} cb - callback
 * @returns {DataSourceTypesSingleCallback} - wrapped callback
 */
function wAtoS(cb) {
  return function (err, list) {
    return cb(err, _.first(list));
  };
}

/**
 * Generic Data Source find
 * @param {Object} query - custom search query
 * @param {Object} projection - custom projection
 * @param {DataSourceTypesArrayCallback} cb - will be called when done
 * @private
 * @returns {DataSourceTypesRepository} - this, chainable
 */
DataSourceTypesRepository.prototype.find = function (query, projection, cb) {
  DataSourceTypes
    .find(query, projection)
    .lean()
    .exec(cb);

  return this;
};

/**
 * List all known Data Source Types
 * @param {DataSourceTypesArrayCallback} cb - will be called when done
 * @returns {DataSourceTypesRepository} - this, chainable
 */
DataSourceTypesRepository.prototype.list = function listAll(cb) {
  return this.find({}, {}, cb);
};

/**
 * Adds new Data Source Type if not exists,
 * or update existing
 * @param {Models.DataSourceTypes} dst - Data Source Type formatted instance
 * @param {ErrorOnlyCallback} cb - callback, to be called on finish
 * @returns {DataSourceTypesRepository} - this, chainable
 */
DataSourceTypesRepository.prototype.add = function addNewOrIgnore(dst, cb) {
  DataSourceTypes.update({name: dst.name}, {$set: dst}, {upsert: true}, cb);
  return this;
};

/**
 * Find Data Source Type by name
 * @param {String} name - name of data source type
 * @param {DataSourceTypesSingleCallback} cb - callback
 * @returns {DataSourceTypesRepository} - this, chainable
 */
DataSourceTypesRepository.prototype.findByName = function findByName(name, cb) {
  return this.find({name: name}, {}, wAtoS(cb));
};

/**
 * Find Data Source Type by id
 * @param {String|ObjectId} id - name of data source type
 * @param {DataSourceTypesSingleCallback} cb - callback
 * @returns {DataSourceTypesRepository} - this, chainable
 */
DataSourceTypesRepository.prototype.findById = function findById(id, cb) {
  return this.find({_id: id}, {}, wAtoS(cb));
};

module.exports = DataSourceTypesRepository;
