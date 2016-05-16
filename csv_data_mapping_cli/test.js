'use strict';

let mongoose = require('mongoose');

mongoose.connect('mongodb://@localhost:27017/ws_ddf', (err, db) => {
  mongoose.model('DataPoints').findOne({})
    .populate({path: 'measure', match: { gid: 'energy_use_total' } })
    .populate({path: 'dimensions.entity', match: { gid: { $in: ['alb', '1997']} } })
    .populate({path: 'dimensions.concept', match: { gid: { $in: ['geo', 'time']} } })
    .lean()
    .exec(function (err, data) {
      console.log(data);


      return cb(null, data);
    });
});
