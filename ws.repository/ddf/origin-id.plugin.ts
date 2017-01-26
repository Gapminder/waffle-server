import { model } from 'mongoose';
import * as async from 'async';
import { logger } from '../../ws.config/log';

function lastModifiedPlugin (schema, settings) {
  schema.post('save', function (doc, next) {
    logger.debug('Extra query to set up originId for newly created document', settings.modelName);
    if (!doc.originId) {
      doc.originId = doc._id;
      model(settings.modelName).update({ _id: doc._id }, { $set: { originId: doc._id } }, (error, result) => {
        next(error, result);
      });
    } else {
      next();
    }
  });

  schema.post('find', function(result, next) {
    if (this.options && this.options.join) {
      return async.eachLimit(wrapArray(result), 10, (item, cb) => {
        return populateWithOrigin(item, this.options.join, settings, cb);
      },
      err => next(err));
    }

    return next();
  });

  function populateWithOrigin(document, query, settings, done) {

    return async.forEachOfLimit(
      query,
      2,
      (match: any, fieldName, cb) => {
        if (!settings[fieldName]) {
          return cb(new Error(`There is no field with name '${fieldName}' in settings of origin-id plugin for model '${settings.modelName}'`));
        }

        let subquery = Object.assign({originId: {$in: wrapArray(document[fieldName])}}, match.$find);

        return model(settings[fieldName])
          .find(subquery, null, match.$options)
          .lean()
          .exec((error: any, result: any[]) => {
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
}

export { lastModifiedPlugin as OriginIdPlugin };
