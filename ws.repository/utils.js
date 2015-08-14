var _ = require('lodash');
var mongoose = require('mongoose');

exports.actionFactory = function actionFactory(actionType) {
  var options = {
    update: function update(Model, obj) {
      return function updateFun(id, data, cb) {
        var isNew = !mongoose.Types.ObjectId.isValid(id);
        if (!isNew) {
          data._id = id;
        }

        var record = new Model(data);
        record.isNew = isNew;
        record.validate(function (err) {
          if (err) {
            cb(err);
          } else {
            record.save(function (err, updatedRecord) {
              cb(err, updatedRecord);
            });
          }
        });

        return obj;
      };
    },
    findById: function findById(Model, obj) {
      return function findByIdFun(id, cb) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return cb(null, {});
        }

        Model.find({_id: id}, {}, function (err, data) {
          if (err || (!data || !data.length || data.length < 1)) {
            cb(err);
            return obj;
          }

          cb(err, data[0]);
          return obj;
        });
      }
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