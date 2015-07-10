'use strict';

var _ = require('lodash');
var async = require('async');

module.exports = function (serviceLocator) {
  // data analysis
  var mongoose = require('mongoose');
  var ObjectId = mongoose.Schema.Types.ObjectId;
  var ImportData = mongoose.model('ImportData');
  var gs = serviceLocator.plugins.get('google-spread-sheets');

  // todo: consume import session entry or import session id
  var importSessionId = '559e8065d364f1db783ca02c';

  // todo: consume table name or table id
  async.waterfall([
    function (cb) {
      cb(null, {})
    },
    // where (worksheet:Data, row:1, column:{$gt:1}) what (dimension:year(type: Number))
    function distinctCountryValues(cb, pipe) {
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
          pipe.countryNames = dimensionValues;
          return cb(err, pipe);
        });
    },
    // where ({worksheet:Data, row:{$gt:1}, column:1}) what ({dimension:country(type: Number)})
    function distinctYearValues(cb, pipe) {
      var tableName = 'Data';
      var tableQuery = 'od6';

      var rowQuery = {$gt: 1};
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
          pipe.yearNames = dimensionValues;
          return cb(err, pipe);
        });
    },

    // create analysis session
    function createAnalysisSession(cb, pipe) {
      var Users = mongoose.model('Users');
      var user = new Users({
        _id: mongoose.Types.ObjectId(),
        name: 'test',
        email: 'test@test.com'
      });
      /** @type GoogleSpreadSheetPlugin */

      var AnalysisSessions = mongoose.model('AnalysisSessions');
      AnalysisSessions.create({user: user}, function (err, analysisSession) {
        pipe.user = user;
        pipe.analysisSession = analysisSession;
        return cb(err, pipe);
      });
    },

    // country dimension
    function updateOrCreateDimensionCountry(cb, pipe) {
      var analysisSession = pipe.analysisSession;

      var dimension = {
        name: 'countries',
        title: 'Countries',
        $addToSet: {analysisSessions: analysisSession}
      };

      var Dimensions = mongoose.models('Dimensions');
      Dimensions.findOneAndUpdate(
        {name: dimension.name},
        dimension,
        {upsert: true})
        .lean()
        .exec(function (err, dim) {
          pipe.dimensionCountry = dim;
          return cb(err, pipe);
        });
    },
    function updateOrCreateDimensionValuesCountry(cb, pipe) {
      var values = pipe.countryNames;
      var dimension = pipe.dimensionCountry;
      var analysisSession = pipe.analysisSession;

      var DimensionValues = mongoose.model('DimensionValues');

      async.each(values, function (value, cb) {
        DimensionValues.update(
          {
            dimension: dimension._id,
            value: value
          },
          {
            dimension: dimension._id,
            value: value,
            $addToSet: {analysisSessions: analysisSession._id}
          },
          {upsert: true},
          function (err) {
            return cb(err);
          }
        );
      }, function (err) {
        return cb(err, pipe);
      });
    },

    // year dimension
    function updateOrCreateDimensionCountry(cb, pipe) {
      var analysisSession = pipe.analysisSession;

      var dimension = {
        name: 'year',
        title: 'Year',
        $addToSet: {analysisSessions: analysisSession}
      };

      var Dimensions = mongoose.models('Dimensions');
      Dimensions.findOneAndUpdate(
        {name: dimension.name},
        dimension,
        {upsert: true})
        .lean()
        .exec(function (err, dim) {
          pipe.dimensionYear = dim;
          return cb(err, pipe);
        });
    },
    function updateOrCreateDimensionValuesCountry(cb, pipe) {
      var values = pipe.yearNames;
      var dimension = pipe.dimensionYear;
      var analysisSession = pipe.analysisSession;

      var DimensionValues = mongoose.model('DimensionValues');

      async.each(values, function (value, cb) {
        DimensionValues.update(
          {
            dimension: dimension._id,
            value: value
          },
          {
            dimension: dimension._id,
            value: value,
            $addToSet: {analysisSessions: analysisSession._id}
          },
          {upsert: true},
          function (err) {
            return cb(err);
          }
        );
      }, function (err) {
        return cb(err, pipe);
      });
    },

    // cordinates
    function updateOrCreateCoordinates(cb, pipe) {
      var analysisSessions = pipe.analysisSessions;
      var countryDimension = pipe.dimensionCountry;
      var yearDimension = pipe.dimensionYear;

      var Coordinates = mongoose.model('Coordinates');
      Coordinates.findOneAndUpdate({
          $and: [
            {dimensions: countryDimension._id},
            {dimensions: yearDimension._id}
          ]
        }, {
          $set: {name: 'year-country'},
          $addToSet: {
            dimensions: {
              $each: [countryDimension, yearDimension]
            },
            analysisSessions: analysisSessions._id
          }
        },
        {upsert: true},
        function (err, coordinates) {
          pipe.coordinates = coordinates;
          return cb(err, pipe);
        });
    },

    // indicator
    function updateOrCreateIndicator(cb, pipe) {
      // todo: should be created not as a part of this flow\
      var Indicators = mongoose.models('Indicators');
      var indicatorName = 'some-indicator';
      var title = 'Awesome stats here!';

      var coordinates = pipe.coordinates;
      var analysisSession = pipp.analysisSession;

      Indicators.findOneAndUpdate({
        name: indicatorName
      }, {
        $set: {
          name: indicatorName,
          title: title
        },
        $addToSet: {
          coordinates: coordinates._id,
          analysisSession: analysisSession._id
        }
      }, function (err, indicator) {
        pipe.indicator = indicator;
        return cb(err, indicator);
      });
    },

    // create indicator values
    // where (worksheet:Data) what (indicator:life_expectancy_at_birth)
    function (cb, pipe) {
      // map row+column into set of dimensions
      // and save to db
    }
  ], function (err) {
    if (err) {
      throw err;
    }

    console.log('done!');
  });
};
