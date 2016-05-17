'use strict';
const mongoose = require('mongoose');
const async = require('async');

module.exports = exports = function lastModifiedPlugin (schema, options) {
  schema.post('save', function (doc, next) {
    if (!doc.originId) {
      doc.originId = doc._id;
      mongoose.model(options.modelName).update({ _id: doc._id }, { $set: { originId: doc._id } }, (error, result) => {
        next(error, result);
      });
    } else {
      next();
    }
  });

  schema.post('find', function(result, next) {
    const _result = result.push ? result : [result];
    return async.waterfall(
      _result.map(item => populateWithOrigin(item, this.options.join)),
      err => next(err));
  });

  function populateWithOrigin(item, query) {

    return done => {
      return mongoose.model(options.modelName).find(
        Object.assign({originId: {$in: item.originId}}, query)).lean().exec((error, res) => {
        done(error);
      });
    }
  }
};
