'use strict';

var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');

module.exports = function (serviceLocator) {
  // data analysis
  return {
    analyse: function (options, cb) {
      // todo: consume import session entry or import session id
      var importSessionId = options.is._id;

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

        // update or create dimensions
        function _analyseDimensions(pipe, wcb) {
          console.log('dimensionValues:', pipe.dimensionValues);
          console.log('Analysing Dimensions...');

          analyseDimensions(pipe, wcb);
        },

        // update or create dimension values
        function _analyseDimensionValues(pipe, wcb) {
          console.log('analysedDimensions:', _.keys(pipe.analysedDimensions));
          console.log('Analysing Dimension Values...');

          analyseDimensionValues(pipe, wcb);
        },

        // update or create cordinates
        function _analyseCoordinates(pipe, wcb) {
          var analysisSessions = pipe.analysisSession;
          var analysedDimensions = pipe.analysedDimensions;
          var coordinateName = _.keys(analysedDimensions).join('-');

          var query = _.map(analysedDimensions, function (dm) {
            return {dimensions: {$elemMatch: {$eq: dm._id}}};
          });

          var dimensions = _.map(analysedDimensions, function (dm) {
            return dm._id;
          });

          var Coordinates = mongoose.model('Coordinates');
          // don't try to use $all query condition!
          Coordinates.findOneAndUpdate({
              $and: query
            }, {
              $set: {
                name: coordinateName,
                dimensions: dimensions
              },
              $addToSet: {
                analysisSessions: analysisSessions._id
              }
            },
            {'new': true, upsert: true},
            function (err, coordinates) {
              pipe.coordinates = coordinates;
              return wcb(err, pipe);
            });
        },

        // update or create indicator
        function _analyseIndicator(pipe, wcb) {
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
    async.waterfall([
      function (wcb) {
        updateOrCreateIndicator(pipe, wcb);
      },
      function (wcb) {
        mergeIndicatorValues(pipe, wcb);
      }
    ], function (err) {
      cb(err, pipe);
    });
  }

  function updateOrCreateIndicator(pipe, cb) {
    var Indicators = mongoose.model('Indicators');
    //var coordinates = pipe.coordinates;
    var analysisSession = pipe.analysisSession;

    Indicators.findOneAndUpdate({
        name: pipe.indicator.name
      }, {
        $set: {
          name: pipe.indicator.name,
          title: pipe.indicator.title
        },
        $addToSet: {
          //coordinates: coordinates._id,
          analysisSessions: analysisSession._id
        }
      }, {'new': true, upsert: true},
      function (err, indicator) {
        pipe.indicator = indicator;
        return cb(err);
      });
  }

  function mergeIndicatorValues(pipe, cb) {
    var importSession = pipe.is;
    var analysisSession = pipe.analysisSession;
    var indicator = pipe.indicator;
    var dimensionValues = pipe.dimensionValues;
    var coordinates = pipe.coordinates;
    var csv = serviceLocator.plugins.get('csv');
    var ImportData = mongoose.model('ImportData');
    var IndicatorValues = mongoose.model('IndicatorValues');

    async.waterfall([
      function _getIndicatorMeta(wcb) {
        ImportData.findOne({
          v: indicator.name,
          importSessions: importSession._id,
          ds: {$elemMatch: {d: csv.meta.dimensions.filename, v: pipe.dsuid}}
        }, function (err, indicatorMeta) {
          pipe.indicatorMeta = indicatorMeta;
          return wcb(err);
        });
      },
      function _getIndicatorData(wcb) {
        var col = _.find(pipe.indicatorMeta.ds, {d: csv.meta.dimensions.column});
        var colValue = _.result(col, 'v');
        var row = _.find(pipe.indicatorMeta.ds, {d: csv.meta.dimensions.row});
        var rowValue = _.result(row, 'v');

        // todo refactor: add new types of indicator values (cols, cells)
        if (indicator.type && indicator.type !== 'row') {
          pipe.indicatorData = [];
          return wcb();
        }

        ImportData.find({
          importSessions: importSession._id,
          $and: [
            {ds: {$elemMatch: {d: csv.meta.dimensions.filename, v: pipe.dsuid}}},
            {ds: {$elemMatch: {d: csv.meta.dimensions.column, v: colValue}}},
            {ds: {$elemMatch: {d: csv.meta.dimensions.row, v: {$gt: rowValue}}}}
          ]
        }, function (err, indicatorData) {
          //console.log('indicatorData: ', indicatorData);
          pipe.indicatorData = indicatorData;
          return wcb(err);
        });
      },
      function _mergeIndicatorValues(wcb) {
        async.eachSeries(pipe.indicatorData, function (data, ecb) {
          return ecb();
          IndicatorValues.update({
              v: data.v,
              coordinates: coordinates._id,
              indicator: indicator._id
            },
            {
              $set: {
                ds: dimensionsMapper(data, dimensionValues),
                v: data.v,

                coordinates: coordinates._id,
                indicator: indicator._id
              },
              $addToSet: {
                analysisSessions: analysisSession._id
              }
            },
            {'new': true, upsert: true},
            function (err) {
              return ecb(err);
            }
          );
        },
        function (err) {
          return wcb(err);
        });
      }
    ], function (err) {
      cb(err);
    });

    function dimensionsMapper (data, dimensionValues) {
      var ds = [];

      return ds;
    }
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

  function analyseDimensionValues(pipe, cb) {
    var dimensionValues = pipe.dimensionValues;
    var analysedDimensions = pipe.analysedDimensions;
    var dimensionValuesList = {};

    async.each(_.keys(dimensionValues), function (key, ecb) {
      async.each(dimensionValues[key], function (dmv, _ecb) {
        async.parallel({
          matchedRows: function (pcb) {
            getDimensionValuesMatchedRows(pipe, key, pcb);
          },
          matchedCols: function (pcb) {
            getDimensionValuesMatchedCols(pipe, key,  pcb);
          },
          dv: function (pcb) {
            createOrUpdateDimensionValue(pipe, dmv, key, pcb);
          }
        }, function (err, result) {
          //console.log(result);
          var dimensionConfig = _.find(pipe.dimensions, {subtype: key});
          var matchedValues = dimensionConfig.type === 'row' ? result.matchedRows : result.matchedCols;
          dimensionValuesList[key + '::' + dmv] = {
            // all index of rows or columns (depends on dimension type)
            // where the dimension value was come across
            matchedValues: matchedValues,
            dv: result.dv._id,
            d: analysedDimensions[key]._id
          };

          return _ecb(err);
        });
      }, function (err) {
        ecb(err);
      });
    }, function (err) {
      // is used for analysing indicator values
      pipe.dimensionValuesList = dimensionValuesList;
      //console.log('dimensionValuesList: ', dimensionValuesList);
      return cb(err, pipe);
    });
  }

  function getDimensionValuesMatchedRows(pipe, key, cb) {
    var dimensionConfig = _.find(pipe.dimensions, {subtype: key});
    var importSessionId = pipe.is._id;
    var csv = serviceLocator.plugins.get('csv');
    var ImportData = mongoose.model('ImportData');

    ImportData.find({
      importSessions: importSessionId,
      $and: [
        {ds: {$elemMatch: {d: csv.meta.dimensions.filename, v: pipe.dsuid}}},
        {ds: {$elemMatch: {d: csv.meta.dimensions.column, v: dimensionConfig.colNumber || 0}}},
        {ds: {$elemMatch: {d: csv.meta.dimensions.column, v: {$gt: dimensionConfig.rowNumber || 0}}}}
      ]
    }, function (err, docs) {
      var matchedRows = _.map(docs, function (data) {
        var row = _.find(data.ds, {d: csv.meta.dimensions.row});
        return _.result(row, 'v');
      });
      console.log(matchedRows);
      return cb(err, matchedRows);
    });
  }

  function getDimensionValuesMatchedCols(pipe, key, cb) {
    var dimensionConfig = _.find(pipe.dimensions, {subtype: key});
    var importSessionId = pipe.is._id;
    var csv = serviceLocator.plugins.get('csv');
    var ImportData = mongoose.model('ImportData');

    ImportData.find({
      importSessions: importSessionId,
      $and: [
        {ds: {$elemMatch: {d: csv.meta.dimensions.filename, v: pipe.dsuid}}},
        {ds: {$elemMatch: {d: csv.meta.dimensions.column, v: {$gt: dimensionConfig.colNumber || 0}}}},
        {ds: {$elemMatch: {d: csv.meta.dimensions.row, v: dimensionConfig.rowNumber || 0}}}
      ]
    }, function (err, docs) {
      var matchedCols = _.map(docs, function (ds) {
        var col = _.find(ds, {d: csv.meta.dimensions.column});
        return _.result(col, 'v');
      });

      return cb(err, matchedCols);
    });
  }

  function createOrUpdateDimensionValue(pipe, dmv, key, cb) {
    var analysedDimensions = pipe.analysedDimensions;
    var analysisSession = pipe.analysisSession;
    var DimensionValues = mongoose.model('DimensionValues');

    DimensionValues.findOneAndUpdate(
      {
        dimension: analysedDimensions[key]._id,
        value: dmv
      },
      {
        dimension: analysedDimensions[key]._id,
        value: dmv,
        $addToSet: {analysisSessions: analysisSession._id}
      },
      {upsert: true, new: true},
      function (err, dv) {
        return cb(err, dv);
      }
    );
  }

  function getDistinctDimensionValues(pipe, cb) {
    var dimensions = pipe.dimensions;
    var dimensionsValuesFnList = {};
    var csv = serviceLocator.plugins.get('csv');
    var ImportData = mongoose.model('ImportData');

    pipe.dimensionValues = {};

    // Get list of functions for getting distinct dimension values
    _.each(dimensions, function (dm) {
      dimensionsValuesFnList[dm.subtype] = function (pcb) {
        var tableQuery = pipe.dsuid;
        // set for searching how much rows should be skipped before getting dimension values
        var rowQuery = dm.rowNumber || 0;
        var columnQuery = dm.colNumber || 0;
        var query;

        rowQuery = dm.type === 'row' ? {$gt: rowQuery} : rowQuery;
        // set for searching how much columns should be skipped before getting dimension values
        columnQuery = dm.type === 'column' ? {$gt: columnQuery} : columnQuery;

        query = {
          $and: [
            {ds: {$elemMatch: {d: csv.meta.dimensions.filename, v: tableQuery}}},
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
