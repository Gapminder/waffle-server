'use strict';

var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');

module.exports = function (serviceLocator) {
  // data analysis
  var ImportData = mongoose.model('ImportData');

  return {
    analyse: function (options, cb) {
      // todo: consume import session entry or import session id
      var importSessionId = options.is._id;
      var indicatorName = options.indicator.name;
      var indicatorTitle = options.indicator.title;
      var tableQuery = options.dsuid;

      async.waterfall([
        function (wcb) {
          wcb(null, options);
        },
        // create analysis session
        function _createAnalysisSession(pipe, wcb) {
          console.log('Creating Analysis Session...');
          //todo: refactor getting user
          var user = {
            _id: '55a779dd1083ec4c438f347b',
            email: 'gapdata@gmail.com',
            name: 'gapdata'
          };

          var AnalysisSessions = mongoose.model('AnalysisSessions');
          AnalysisSessions.create({
            user: user,
            importSession: importSessionId
          }, function (err, analysisSession) {
            pipe.user = user;
            pipe.analysisSession = analysisSession.toJSON();

            return wcb(err, pipe);
          });
        },

        // get unique dimensions values
        function _getDistinctDimensionValues(pipe, wcb) {
          console.log('Getting distinct Dimension Values...');

          getDistinctDimensionValues(pipe, wcb);
        },

        function _analyseDimensions(pipe, wcb) {
          console.log('dimensionValues:', pipe.dimensionValues);
          console.log('Analysing Dimensions...');

          analyseDimensions(pipe, wcb);
        },

        // cordinates
        //function updateOrCreateCoordinates(pipe, wcb) {
        //  var analysisSessions = pipe.analysisSession;
        //  var countryDimension = pipe.dimensionCountry;
        //  var yearDimension = pipe.dimensionYear;
        //
        //  var Coordinates = mongoose.model('Coordinates');
        //  // don't try to use $all query condition!
        //  Coordinates.findOneAndUpdate({
        //      $and: [
        //        {dimensions: {$elemMatch: {$eq: countryDimension._id}}},
        //        {dimensions: {$elemMatch: {$eq: yearDimension._id}}}
        //      ]
        //    }, {
        //      $set: {
        //        name: 'year-country',
        //        'dimensions': [countryDimension, yearDimension]
        //      },
        //      $addToSet: {
        //        analysisSessions: analysisSessions._id
        //      }
        //    },
        //    {'new': true, upsert: true},
        //    function (err, coordinates) {
        //      pipe.coordinates = coordinates;
        //      return cb(err, pipe);
        //    });
        //},

        // indicator
        function _analyseIndicator(pipe, wcb) {
          console.log('analysedDimensions:', _.keys(pipe.analysedDimensions));
          console.log('Analysing Indicator...');
          analyseIndicator(pipe, wcb);
        }
      ], function (err) {
        console.log('analysis done!');
        return cb(err);
      });
    }
  };

  function analyseIndicator(pipe, cb) {
    //function updateOrCreateIndicator(pipe, cb) {
    //  // todo: should be created not as a part of this flow\
    //  var Indicators = mongoose.model('Indicators');
    //  var coordinates = pipe.coordinates;
    //  var analysisSession = pipe.analysisSession;
    //
    //  Indicators.findOneAndUpdate({
    //      name: indicatorName
    //    }, {
    //      $set: {
    //        name: indicatorName,
    //        title: indicatorTitle
    //      },
    //      $addToSet: {
    //        coordinates: coordinates._id,
    //        analysisSessions: analysisSession._id
    //      }
    //    }, {'new': true, upsert: true},
    //    function (err, indicator) {
    //      pipe.indicator = indicator;
    //      return cb(err, pipe);
    //    });
    //},
    //
    //// todo: how to vary by selector?
    //// create indicator values
    //// where (worksheet:Data) what (indicator:life_expectancy_at_birth)
    //function mergeIndicatorValues(pipe, cb) {
    //  var analysisSession = pipe.analysisSession;
    //  var indicator = pipe.indicator;
    //  var coordinates = pipe.coordinates;
    //
    //  var ImportData = mongoose.model('ImportData');
    //  var Dimensions = mongoose.model('Dimensions');
    //
    //  async.parallel({
    //      // where (worksheet:Data, row:1, column:{$gt:1}) what (dimension:year(type: Number))
    //      years: function distinctCountryValues(cb) {
    //        var rowQuery = 1;
    //        var columnQuery = {$gt: 1};
    //
    //        ImportData.find({
    //          $and: [
    //            {ds: {$elemMatch: {d: gs.meta.dimensions.worksheet, v: tableQuery}}},
    //            {ds: {$elemMatch: {d: gs.meta.dimensions.row, v: rowQuery}}},
    //            {ds: {$elemMatch: {d: gs.meta.dimensions.column, v: columnQuery}}}
    //          ],
    //          importSessions: importSessionId
    //        }, {ds: 1, v: 1, _id: -1})
    //          .lean()
    //          .exec(cb);
    //      },
    //      // where ({worksheet:Data, row:{$gt:1}, column:1}) what ({dimension:country(type: Number)})
    //      countries: function distinctYearValues(cb) {
    //        var rowQuery = {$gt: 1};
    //        var columnQuery = 1;
    //
    //        ImportData.find({
    //          $and: [
    //            {ds: {$elemMatch: {d: gs.meta.dimensions.worksheet, v: tableQuery}}},
    //            {ds: {$elemMatch: {d: gs.meta.dimensions.row, v: rowQuery}}},
    //            {ds: {$elemMatch: {d: gs.meta.dimensions.column, v: columnQuery}}}
    //          ],
    //          importSessions: importSessionId
    //        }, {ds: 1, v: 1, _id: -1})
    //          .lean()
    //          .exec(cb);
    //      },
    //      // get table data
    //      data: function (cb) {
    //        ImportData.find({
    //          $and: [
    //            {ds: {$elemMatch: {d: gs.meta.dimensions.worksheet, v: tableQuery}}},
    //            {ds: {$elemMatch: {d: gs.meta.dimensions.row, v: {$gt: 1}}}},
    //            {ds: {$elemMatch: {d: gs.meta.dimensions.column, v: {$gt: 1}}}}
    //          ],
    //          importSessions: importSessionId
    //        }, {ds: 1, v: 1, id: -1})
    //          .lean()
    //          .exec(cb);
    //      },
    //      dimensions: function (cb) {
    //        return cb(null, {
    //          year: pipe.dimensionYear,
    //          country: pipe.dimensionCountry
    //        });
    //      }
    //    },
    //    /**
    //     * @param err
    //     * @param {Object} results
    //     * @param {Array} results.years
    //     * @param {Array} results.countries
    //     * @param {Array} results.data
    //     * @param {Object} results.dimensions
    //     * @param {Models.Dimensions} results.dimensions.year
    //     * @param {Models.Dimensions} results.dimensions.country
    //     */
    //    function (err, results) {
    //      // use indicator and analysis-pattern?
    //      // match-pattern, data-pattern
    //      // todo: make it generic
    //      // todo: should produce map function ds to ds
    //
    //      /**
    //       *
    //       * @param {Array<Models.ImportData>}importedDimensions
    //       */
    //      var options = [
    //        {
    //          id: results.dimensions.year._id.toString(),
    //          values: results.years
    //        },
    //        {
    //          id: results.dimensions.country._id.toString(),
    //          values: results.countries
    //        }
    //      ];
    //
    //      return produceMapper(options, function (err, dimensionsMapper) {
    //        if (err) {
    //          return cb(err);
    //        }
    //
    //        var l = results.data.length;
    //        console.log('Analysis values to save: ', l);
    //        return async.eachLimit(results.data, 100, function (importData, cb) {
    //          l--;
    //          // if (l % 100 === 0 || l < 100 && l % 10 === 0 || l < 10) {
    //          // console.time('Analysis left to save: ' + l);
    //          // }
    //          var IndicatorValues = mongoose.model('IndicatorValues');
    //          var dimensionValues = dimensionsMapper(importData.ds);
    //          var query = _.merge(mapCoordinatesToQuery(dimensionValues), {
    //            v: importData.v,
    //            coordinates: coordinates._id,
    //            indicator: indicator._id
    //          });
    //
    //          return IndicatorValues.update(query,
    //            {
    //              $set: {
    //                ds: dimensionValues,
    //                v: importData.v,
    //
    //                coordinates: coordinates._id,
    //                indicator: indicator._id
    //              },
    //              $addToSet: {
    //                analysisSessions: analysisSession._id
    //              }
    //            },
    //            {'new': true, upsert: true}, function (err) {
    //              // if (l % 100 === 0 || l < 100 && l % 10 === 0 || l < 10) {
    //              // console.timeEnd('Analysis left to save: ' + l);
    //              // }
    //              return cb(err);
    //            });
    //        }, function (err) {
    //          return cb(err);
    //        });
    //      });
    //
    //      function mapCoordinatesToQuery(coordinates) {
    //        return {
    //          $and: _.map(coordinates, function (dimensionSet) {
    //            return {ds: {$elemMatch: dimensionSet}};
    //          })
    //        };
    //      }
    //
    //      /**
    //       *
    //       * @param {Array<{values:Array<Models.ImportData>, id: ObjectId}>} options
    //       * @returns {Function}
    //       */
    //      function produceMapper(options, cb) {
    //        var DimensionValues = mongoose.model('DimensionValues');
    //        var dimensionValuesHash = {};
    //        async.each(options, function (opt, cb) {
    //          DimensionValues
    //            .find({dimension: opt.id}, {_id: 1, value: 1})
    //            .lean()
    //            .exec(function (err, dimValues) {
    //              if (err) {
    //                return cb(err);
    //              }
    //
    //              dimensionValuesHash[opt.id] = _.reduce(dimValues, function (res, dimValue) {
    //                res[dimValue.value] = dimValue._id;
    //                return res;
    //              }, {});
    //              cb();
    //            });
    //        }, function (err) {
    //          if (err) {
    //            return cb(err);
    //          }
    //
    //          var maps = _.map(options, function (opt) {
    //            var res = {};
    //            var map = {};
    //            /** @param {Models.ImportData} year */
    //            _.each(opt.values, function (importDataEntry) {
    //              _.each(importDataEntry.ds, function (entryDimensionsEntry) {
    //                res[entryDimensionsEntry.d] = res[entryDimensionsEntry.d] || [];
    //                map[entryDimensionsEntry.d] = map[entryDimensionsEntry.d] || {};
    //
    //                if (res[entryDimensionsEntry.d].indexOf(entryDimensionsEntry.v) === -1) {
    //                  res[entryDimensionsEntry.d].push(entryDimensionsEntry.v);
    //                  map[entryDimensionsEntry.d][entryDimensionsEntry.v] = {
    //                    dv: dimensionValuesHash[opt.id][importDataEntry.v],
    //                    d: opt.id,
    //                    v: importDataEntry.v
    //                  };
    //                }
    //              });
    //            });
    //
    //            var mapping = _.pick(map, function (dimention, dimName) {
    //              return res[dimName].length > 1;
    //            });
    //            return mapping;
    //          });
    //          var dimHashMap = _.merge.apply(null, maps);
    //          // merge
    //          /**
    //           * @param {Array<Models.DimensionsSet>} dataEntry
    //           */
    //          var mapperFn = function mapDimensions(dimensions) {
    //            return _(dimensions)
    //              .filter(function (dimension) {
    //                return dimension.d in dimHashMap;
    //              })
    //              .map(function (dimension) {
    //                var result = dimHashMap[dimension.d][dimension.v];
    //                if (!result) {
    //                  // todo: log analysis session, and all data required to understand where is issue came from
    //                  console.error(dimensions, ' not found');
    //                }
    //                return result;
    //              })
    //              .compact()
    //              .value();
    //          };
    //          return cb(null, mapperFn);
    //        });
    //      }
    //    });
    //  // map row+column into set of dimensions
    //  // and save to db
    //}

    return cb(null, pipe);
  }

  function analyseDimensions(pipe, cb) {
    var dimensionValues = pipe.dimensionValues;
    var csv = serviceLocator.plugins.get('csv');
    var analysisSession = pipe.analysisSession;
    var Dimensions = mongoose.model('Dimensions');
    var dimension;
    pipe.analysedDimensions = {};

    async.eachSeries(_.keys(dimensionValues), function (key, fcb) {
      if (!csv.meta.dimensionTypes[key]) {
        return fcb('No dimension type in the meta data of plugin');
      }

      dimension = {
        $set: csv.meta.dimensionTypes[key],
        $addToSet: {analysisSessions: analysisSession}
      };

      Dimensions.findOneAndUpdate(
        {name: dimension.$set.name},
        dimension,
        {upsert: true, 'new': true})
        .lean()
        .exec(function (err, dim) {
          if (err) {
            return fcb(err);
          }

          pipe.analysedDimensions[key] = dim;

          return fcb();
        });
    }, function (err) {
      return cb(err, pipe);
    });
  }

  function getDistinctDimensionValues(pipe, cb) {
    var dimensions = pipe.dimensions;
    var dimensionsValuesFnList = {};
    var csv = serviceLocator.plugins.get('csv');
    pipe.dimensionValues = {};

    // Get list of functions for getting distinct dimension values
    _.each(dimensions, function (dm) {
      dimensionsValuesFnList[dm.subtype] = function (pcb) {
        var tableQuery = pipe.dsuid;
        // set for searching how much rows should be skipped before getting dimension values
        var rowQuery = (dm.type === 'row') ? {$gt: dm.rowNumber} : (dm.rowNumber || 0);
        // set for searching how much columns should be skipped before getting dimension values
        var columnQuery = (dm.type === 'column') ? {$gt: dm.colNumber} : (dm.colNumber || 0);
        var query = {
          $and: [
            {ds: {$elemMatch: {d: csv.meta.dimensions.worksheet, v: tableQuery}}},
            {ds: {$elemMatch: {d: csv.meta.dimensions.row, v: rowQuery}}},
            {ds: {$elemMatch: {d: csv.meta.dimensions.column, v: columnQuery}}}
          ],
          importSessions: pipe.is._id
        };

        ImportData.distinct('v', query)
          .lean()
          .exec(function (err, dimensionValues) {
            if (err) {
              return pcb(err);
            }

            return pcb(null, dimensionValues);
          });
      };
    });

    // Running functions list in parallel mode
    async.parallel(dimensionsValuesFnList, function (err, dimensionValues) {
      if (err) {
        return cb(err);
      }

      pipe.dimensionValues = dimensionValues;
      return cb(null, pipe);
    });
  }
};
