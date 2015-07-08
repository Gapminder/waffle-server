'use strict';

/**
 * @callback DataSourcesSingleCallback
 * @param {Error} [err] - mongoose level error, if any
 * @param {Models.DataSourceTypes} [dataSourceType] - found data source type instance, if any
 */

/**
 * @callback DataSourcesArrayCallback
 * @param {Error} [err] - mongoose level error, if any
 * @param {Models.DataSourceTypes} [dataSourceType] - found data source type instance, if any
 */

var _ = require('lodash');
var mongoose = require('mongoose');
var DataSources = mongoose.model('DataSources');

function DataSourcesRepository() {
}

/**
 * Callback wrapper to return single item in callback
 * @param {DataSourcesSingleCallback} cb - callback
 * @returns {DataSourcesSingleCallback} - wrapped callback
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
 * @param {DataSourcesArrayCallback} cb - will be called when done
 * @private
 * @returns {DataSourcesRepository} - this, chainable
 */
DataSourcesRepository.prototype.find = function (query, projection, cb) {
  DataSources
    .find(query, projection)
    .lean()
    .exec(cb);

  return this;
};

/**
 * List all known Data Source
 * @param {Object|DataSourcesArrayCallback} [projection] - custom projection
 * @param {DataSourcesArrayCallback} cb - will be called when done
 * @returns {DataSourcesRepository} - this, chainable
 */
DataSourcesRepository.prototype.list = function listAll(projection, cb) {
  return this.find({}, projection || {dst: 1, dsuid: 1}, cb || projection);
};

/**
 * Adds new Data Source if not exists,
 * or update existing
 * @param {DataSources} ds - Data Source formatted instance
 * @param {ErrorOnlyCallback} cb - callback, to be called on finish
 * @returns {DataSourcesRepository} - this, chainable
 */
DataSourcesRepository.prototype.add = function addNewOrIgnore(ds, cb) {
  var query = _.pick(ds, ['dst', 'dsuid']);
  if (query.length < 2) {
    (new DataSources(ds)).validate(cb);
    return this;
  }
  return this.find(query, {}, wAtoS(findDataSource));

  function findDataSource(err, oldDataSource) {
    if (err) {
      return cb(err);
    }

    if (_.isEmpty(oldDataSource)) {
      return createNewDataSource(ds);
    }

    return updateExistingDataSource(ds);
  }

  function createNewDataSource(newDataSource) {
    return DataSources.create(newDataSource, cb);
  }

  function updateExistingDataSource(newDataSource) {
    return DataSources.update(query, {$set: _.pick(newDataSource, 'meta')}, cb);
  }
};

/**
 * Find Data Source Type by name
 * @param {String} name - name of data source type
 * @param {DataSourcesSingleCallback} cb - callback
 * @returns {DataSourcesRepository} - this, chainable
 */
DataSourcesRepository.prototype.findByName = function findByName(name, cb) {
  return this.find({name: name}, {}, wAtoS(cb));
};

/**
 * Find Data Source Type by id
 * @param {String|ObjectId} id - name of data source type
 * @param {DataSourcesSingleCallback} cb - callback
 * @returns {DataSourcesRepository} - this, chainable
 */
DataSourcesRepository.prototype.findById = function findById(id, cb) {
  return this.find({_id: id}, {}, wAtoS(cb));
};

module.exports = DataSourcesRepository;
