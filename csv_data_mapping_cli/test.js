const mongoose = require('mongoose');

const DimensionValues = mongoose.model('DimensionValues');

module.exports = function (app, done) {
  logger = app.get('log');
  config = app.get('config');

  DimensionValues.findOneAndUpdate({value: 'low_income'}, {$set: {
    'properties.test': 'GGGGGGGGGGGGGGGg'
  }}, function (err) {
    return done(err);
  });
};
