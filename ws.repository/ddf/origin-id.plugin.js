'use strict';
const mongoose = require('mongoose');
const async = require('async');

module.exports = exports = function lastModifiedPlugin (schema, settings) {
  schema.post('save', function (doc, next) {
    if (!doc.originId) {
      doc.originId = doc._id;
      mongoose.model(settings.modelName).update({ _id: doc._id }, { $set: { originId: doc._id } }, (error, result) => {
        next(error, result);
      });
    } else {
      next();
    }
  });

  schema.post('find', function(result, next) {
    const _result = wrapArray(result);

    if (this.options.join) {
      return async.eachSeries(
        _result,
        (item, cb) => populateWithOrigin(item, this.options.join, settings, cb),
        err => next(err));
    }

    return next();
  });

  function populateWithOrigin(item, query, settings, done) {

    return async.forEachOfSeries(
      query,
      (match, fieldName, cb) => {
        if (!settings[fieldName]) {
          return cb(new Error(`There is no field with name '${fieldName}' in settings of origin-id plugin for model '${settings.modelName}'`));
        }

        let _query = Object.assign({originId: {$in: wrapArray(item[fieldName])}}, match.$find);

        return mongoose.model(settings[fieldName])
          .find(_query, null, match.$options)
          .lean()
          .exec((error, result) => {
            item[fieldName] = Array.isArray(item[fieldName]) ? result : result.shift();
            return cb(error);
          });
      },
      err => {
        return done(err);
      }
    );
  }

  function wrapArray(value) {
    return Array.isArray(value) ? value : [value];
  }
};
