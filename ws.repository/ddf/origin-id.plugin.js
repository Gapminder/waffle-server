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
      return async.eachLimit(
        _result,
        10,
        (item, cb) => populateWithOrigin(item, this.options.join, settings, cb),
        err => next(err));
    }

    return next();
  });

  function populateWithOrigin(document, query, settings, done) {

    return async.forEachOfLimit(
      query,
      2,
      (match, fieldName, cb) => {
        if (!settings[fieldName]) {
          return cb(new Error(`There is no field with name '${fieldName}' in settings of origin-id plugin for model '${settings.modelName}'`));
        }

        let subquery = Object.assign({originId: {$in: wrapArray(document[fieldName])}}, match.$find);

        return mongoose.model(settings[fieldName])
          .find(subquery, null, match.$options)
          .lean()
          .exec((error, result) => {
            document[fieldName] = Array.isArray(document[fieldName]) ? result : result.shift();
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
