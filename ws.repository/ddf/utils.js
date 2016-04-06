'use strict';
var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');

exports.actionFactory = function actionFactory(actionType) {
  var options = {
    update: function update(Model, obj) {
      return function updateFun(id, data, cb) {
        var isNew = !mongoose.Types.ObjectId.isValid(id);

        if (!isNew) {
          Model.update({_id: id}, {$set: data}, function (err) {
            cb(err);
          });
        } else {
          // data._id = id;
          var record = new Model(data);
          record.isNew = isNew;
          record.validate(function (err) {
            if (err) {
              cb(err);
            } else {
              record.save(function (err) {
                cb(err);
              });
            }
          });
        }

        return obj;
      };
    },
    pagedList: function pagedList(Model, obj) {
      return function pagedListFun(params, cb) {
        var limit = params.limit || 1000;
        var skip = params.skip || 0;
        var filter = params.filter || {};
        var projection = params.projection || null;
        var populate = !params.populate || _.isArray(params.populate) ? params.populate : [params.populate];

        var query = Model.find(filter, projection, {skip: skip, limit: limit});

        if (populate) {
          _.each(populate, function (pop) {
            query = query.populate(pop);
          });
        }

        async.parallel({
          data: function (acb) {
            return query.lean(true).exec(acb);
          },
          totalItems: function (acb) {
            return Model.count(filter, acb);
          }
        }, function getPagedListDone(err, result) {
          // todo: return only data! do not format as response in helpers
          return cb(err, {success: !err, error: err, data: result.data, totalItems: result.totalItems});
        });

        return obj;
      };
    },
    findById: function findById(Model, obj, populations) {
      return function findByIdFun(params, cb) {
        if (!mongoose.Types.ObjectId.isValid(params.id)) {
          return cb(null, {});
        }

        var query = Model.find({_id: params.id}, params.projection || null);

        if (populations || params.populate) {
          query.populate(populations || params.populate);
        }

        query
          .lean(true)
          .exec(function (err, data) {
            cb(err, data && data.length ? data[0] : null);
            return obj;
          });
      };
    },
    deleteRecord: function deleteRecord(Model, obj) {
      return function deleteRecordFun(id, cb) {
        Model.remove({_id: id}, function (err) {
          cb(err);
        });

        return obj;
      };
    }
  };

  return options[actionType];
};
