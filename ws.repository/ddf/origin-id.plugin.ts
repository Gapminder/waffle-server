import { model } from 'mongoose';
import * as async from 'async';
import { logger } from '../../ws.config/log';
import {NextFunction} from 'express';

function lastModifiedPlugin (schema: any, settings: any): void {
  schema.post('save', function (doc: any, next: Function): void {
    logger.debug('Extra query to set up originId for newly created document', settings.modelName);
    if (!doc.originId) {
      doc.originId = doc._id;
      model(settings.modelName).update({ _id: doc._id }, { $set: { originId: doc._id } }, (error: string, result: any) => {
        next(error, result);
      });
    } else {
      next();
    }
  });

  schema.post('find', function(result: any, next: NextFunction): void {
    // tslint:disable-next-line
    const self = this;
    if (self.options && self.options.join) {
      return async.eachLimit(wrapArray(result), 10, (item: any, cb: Function) => {
        return populateWithOrigin(item, self.options.join, settings, cb);
      },
      (err: string) => next(err));
    }

    return next();
  });

  function populateWithOrigin(document: any, query: any, _settings: any, done: Function): void {

    return async.forEachOfLimit(
      query,
      2,
      (match: any, fieldName: any, cb: Function) => {
        if (!_settings[fieldName]) {
          return cb(new Error(`There is no field with name '${fieldName}' in settings of origin-id plugin for model '${_settings.modelName}'`));
        }

        let subquery = Object.assign({originId: {$in: wrapArray(document[fieldName])}}, match.$find);

        return model(_settings[fieldName])
          .find(subquery, null, match.$options)
          .lean()
          .exec((error: string, result: any[]) => {
            document[fieldName] = Array.isArray(document[fieldName]) ? result : result.shift();
            return cb(error);
          });
      },
      (err: string) => {
        return done(err);
      }
    );
  }

  function wrapArray(value: any): any {
    return Array.isArray(value) ? value : [value];
  }
}

export { lastModifiedPlugin as OriginIdPlugin };
