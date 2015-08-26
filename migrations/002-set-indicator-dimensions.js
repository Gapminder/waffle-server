/*eslint-disable camelcase, no-console */
'use strict';

require('./common');
var async = require('async');
var mongoose = require('mongoose');

var Indicators = mongoose.model('Indicators');
var Coordinates = mongoose.model('Coordinates');

exports.up = function (next) {
  Coordinates.find({}).lean(true).exec(function (err, coordinates) {
    if (err) {
      return next(err);
    }

    async.eachLimit(coordinates, 10, function (coordinate, cb) {
      Indicators.update({coordinates: coordinate._id},
        {$set: {dimensions: coordinate.dimensions}}, {multi: true},
        function (updateErr, nUpdated) {
          console.log('Updated: ' + !nUpdated || nUpdated.length + ' indicators');
          return cb(updateErr);
        });
    }, next);
  });
};

exports.down = function (next) {
  next();
};
/*eslint-enable camelcase */
