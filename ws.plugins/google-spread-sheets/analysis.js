'use strict';

var _ = require('lodash');
var async = require('async');

module.exports = function (serviceLocator) {
  // data analysis
  var mongoose = require('mongoose');
  var ObjectId = mongoose.Schema.Types.ObjectId;
  // where (worksheet:Data, row:1, column:{$gt:1}) what (dimension:year(type: Number))
  var ImportData = mongoose.model('ImportData');
  var gs = serviceLocator.plugins.get('google-spread-sheets');

  // todo: consume import session entry or import session id
  var importSessionId = '559e8065d364f1db783ca02c';

  // todo: consume table name or table id
  var tableName = 'Data';
  var tableQuery = 'od6';

  var rowQuery = 1;
  var columnQuery = {$gt: 1};

  var dimensionName = 'Year';

  ImportData.distinct('v', {
    $and: [
      {ds: {$elemMatch: {d: gs.meta.dimensions.worksheet, v: tableQuery}}},
      {ds: {$elemMatch: {d: gs.meta.dimensions.row, v: rowQuery}}},
      {ds: {$elemMatch: {d: gs.meta.dimensions.column, v: columnQuery}}}
    ],
    importSessions: importSessionId
  })
    .lean()
    .exec(function (err, dimensionValues) {
      console.log(dimensionValues.length);

      // todo: create model Dimensions
      // todo: create model DimensionValues
      // todo: create model Indicators
      // todo: create model Coordinates {set of indicator related sets of dimensions}
    });

  // where ({worksheet:Data, row:{$gt:1}, column:1}) what ({dimension:country(type: Number)})

  // todo: consume table name or table id
  var tableName = 'Data';
  var tableQuery = 'od6';

  var rowQuery =  {$gt: 1};
  var columnQuery = 1;

  ImportData.distinct('v', {
    $and: [
      {ds: {$elemMatch: {d: gs.meta.dimensions.worksheet, v: tableQuery}}},
      {ds: {$elemMatch: {d: gs.meta.dimensions.row, v: rowQuery}}},
      {ds: {$elemMatch: {d: gs.meta.dimensions.column, v: columnQuery}}}
    ],
    importSessions: importSessionId
  })
    .lean()
    .exec(function (err, dimensionValues) {
      console.log(dimensionValues.length);
    });
  // where (worksheet:Data) what (indicator:life_expectancy_at_birth)

  // steps
  // create dimensions if not exists
  // create indicators
  // create indicator values
};
