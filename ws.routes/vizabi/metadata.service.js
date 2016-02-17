'use strict';
let _ = require('lodash');
let mongoose = require('mongoose');

let metadataVizabi = mongoose.model('Metadata');

module.exports = {
  listMetadata: listMetadata,
  projectMetadata: projectMetadata
};

function projectMetadata(_select, cb) {
  let select = _select;

  let selectedCategories = _.chain(select)
    .reduce(function (result, item) {
      result.push(item.split('.')[0]);
      return result;
    }, [])
    .uniq()
    .value();

  let query = {};
  if (!_.isEmpty(select)) {
    query.gid = {$in: selectedCategories};
  }
  let projection = {_id: 0, __v: 0};

  return this.listMetadata(query, projection, mapMetadata(select, cb));
}

// list of all meta properties
function listMetadata(query, projection, cb) {
  return metadataVizabi.find(query, projection)
    .sort('gid')
    .lean()
    .exec(cb);
}

function mapMetadata(select, cb) {
  return (err, dataDb) => {
    if (_.isEmpty(select)) {

      let data = _.chain(dataDb)
        .keyBy('gid')
        .value();

      let result = {
        success: !err,
        error: err,
        data: data
      };
      return cb(null, result);
    }
    if (!err) {
      let data = _.chain(dataDb)
        .keyBy('gid')
        .at(select)
        .value();
      let formatData = _.zipObjectDeep(select, data);
      let result = {
        success: !err,
        error: err,
        data: formatData
      };
      return cb(null, result);
    }
    if (err) {
      console.error(err);
    }
  };
}