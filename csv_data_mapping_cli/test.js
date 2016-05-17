'use strict';

let mongoose = require('mongoose');

mongoose.connect('mongodb://@localhost:27017/ws_ddf', (err, db) => {
  mongoose.model('DataPoints').find({measureGid: 'energy_use_total'})
    .populate({path: 'measure', match: { gid: 'energy_use_total' } })
    .populate({path: 'dimensions.entity', match: { gid: { $in: ['dza', '2000', '2001', 'alb']} } })
    .populate({path: 'dimensions.concept', match: { gid: { $in: ['geo', 'time']} } })
    .lean()
    .exec(function (err, data) {
      let _data = _.filter(data, item => item.measure && _.every(item.dimensions, dm => !_.isNull(dm.entity)) && _.every(item.dimensions, dm => !_.isNull(dm.concept)) );

      return cb(null, data);
    });
});
