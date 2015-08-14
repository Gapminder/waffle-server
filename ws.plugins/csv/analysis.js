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
      var ObjectId = mongoose.Schema.Types.ObjectId;

      async.waterfall([
        function (wcb) {
          wcb(null, options);
        },

        // create analysis session
        function _createAnalysisSession(pipe, wcb) {
          //todo: refactor getting user
          var user = {
            _id: '55a779dd1083ec4c438f347b',
            email: 'gapdata@gmail.com',
            name: 'gapdata'
          };

          var AnalysisSessions = mongoose.model('AnalysisSessions');

          console.log('  Creating Analysis Session...');

          AnalysisSessions.create({
            user: user,
            importSession: importSessionId
          }, function (err, analysisSession) {
            pipe.user = user;
            pipe.analysisSession = analysisSession;

            return wcb(err, pipe);
          });
        },

        // get unique dimensions values
        function _getDistinctDimensionValues(pipe, wcb) {
          console.log('  Getting distinct Dimension Values...');

          getDistinctDimensionValues(pipe, wcb);
        },

        // update or create dimensions
        function _analyseDimensions(pipe, wcb) {
          console.log('    dimensionValues:', pipe.dimensionValues);
          console.log('  Analysing Dimensions...');

          analyseDimensions(pipe, wcb);
        },

        // update or create dimension values
        function _analyseDimensionValues(pipe, wcb) {
          console.log('    analysedDimensions:', _.keys(pipe.analysedDimensions));
          console.log('  Analysing Dimension Values...');

          analyseDimensionValues(pipe, wcb);
        },

        // update or create cordinates
        function _analyseCoordinates(pipe, wcb) {
          var analysisSession = pipe.analysisSession;
          var analysedDimensions = pipe.analysedDimensions;
          var coordinateName = _.keys(analysedDimensions).join('-');

          var dimensions = _.map(analysedDimensions, function (dm) {
            return dm._id;
          });

          var Coordinates = mongoose.model('Coordinates');

          console.log('  Analysing Coordinates...');

          // don't try to use $all query condition!
          Coordinates.findOneAndUpdate({
              name: coordinateName,
              dimensions: dimensions
            }, {
              $set: {
                name: coordinateName,
                dimensions: dimensions
              },
              $addToSet: {
                analysisSessions: analysisSession._id
              }
            },
            {'new': true, upsert: true})
            .lean()
            .exec(function (err, coordinates) {
              if (err) {
                return wcb(err);
              }

              pipe.coordinates = coordinates;

              return wcb(err, pipe);
            });
        },

        // update or create indicator
        function _analyseIndicator(pipe, wcb) {
          console.log('  Analysing Indicator...');
          analyseIndicator(pipe, wcb);
        }
      ], function (err) {
        if (err) {
          return cb(err);
        }

        console.log('Analysis is done!');

        return cb();
      });
    }
  };

  function analyseIndicator(pipe, cb) {
    async.waterfall([
      function (wcb) {
        console.log('  Update or create Indicator..');
        updateOrCreateIndicator(pipe, wcb);
      },
      function (wcb) {
        console.log('  Merge Indicator Values...');
        mergeIndicatorValues(pipe, wcb);
      }
    ], function (err) {
      cb(err, pipe);
    });
  }

  function updateOrCreateIndicator(pipe, cb) {
    var Indicators = mongoose.model('Indicators');
    var ObjectId = mongoose.Schema.Types.ObjectId;
    var coordinates = pipe.coordinates;
    var analysisSession = pipe.analysisSession;

    Indicators.findOneAndUpdate({
        name: pipe.indicator.name
      }, {
        $set: {
          name: pipe.indicator.name,
          title: pipe.indicator.title
        },
        $addToSet: {
          coordinates: coordinates._id,
          analysisSessions: analysisSession._id
        }
      }, {'new': true, upsert: true})
      .lean()
      .exec(function (err, indicator) {
        console.log('    analysedIndicator:', indicator.name);
        pipe.indicator = indicator;
        return cb(err);
      });
  }

  function mergeIndicatorValues(pipe, cb) {
    var importSession = pipe.is;
    var indicator = pipe.indicator;
    var csv = serviceLocator.plugins.get('csv');
    var ImportData = mongoose.model('ImportData');

    async.waterfall([
      function _getIndicatorMeta(wcb) {
        ImportData.findOne({
          v: indicator.name,
          importSessions: importSession,
          ds: {$elemMatch: {d: csv.meta.dimensions.filename, v: pipe.dsuid}}
        }).lean().exec(function (err, indicatorMeta) {
          pipe.indicatorMeta = indicatorMeta;
          return wcb(err);
        });
      },
      function _getIndicatorData(wcb) {
        getIndicatorData(pipe, wcb);
      },
      function _mergeIndicatorValues(wcb) {
        doMergeIndicatorValues(pipe, wcb);
      }
    ], function (err) {
      cb(err);
    });
  }

  function getIndicatorData(pipe, cb) {
    var indicator = pipe.indicator;
    var importSession = pipe.is;
    var csv = serviceLocator.plugins.get('csv');
    var ImportData = mongoose.model('ImportData');

    var col = _.find(pipe.indicatorMeta.ds, {d: csv.meta.dimensions.column});
    var colValue = _.result(col, 'v');
    var row = _.find(pipe.indicatorMeta.ds, {d: csv.meta.dimensions.row});
    var rowValue = _.result(row, 'v');
    var query = {
      importSessions: importSession,
      $and: [
        {ds: {$elemMatch: {d: csv.meta.dimensions.filename, v: pipe.dsuid}}},
        {ds: {$elemMatch: {d: csv.meta.dimensions.column, v: colValue}}},
        {ds: {$elemMatch: {d: csv.meta.dimensions.row, v: {$gt: rowValue}}}}
      ]
    };

    // todo refactor: add new types of indicator values (cols, cells)
    if (indicator.type && indicator.type !== 'row') {
      pipe.indicatorData = [];
      return cb();
    }

    console.log('query', JSON.stringify(query));
    ImportData.find(query).lean().exec(function (err, indicatorData) {
      console.log(indicatorData);
      pipe.indicatorData = indicatorData;
      return cb(err);
    });
  }

  function doMergeIndicatorValues(pipe, cb) {
    var indicator = pipe.indicator;
    var coordinates = pipe.coordinates;
    var analysisSession = pipe.analysisSession;
    var indicatorDimensions = pipe.indicatorDimensions;
    var IndicatorValues = mongoose.model('IndicatorValues');
    var ObjectId = mongoose.Schema.Types.ObjectId;
    var bulk = IndicatorValues.collection.initializeOrderedBulkOp();

    async.forEachOfSeries(pipe.indicatorData, function (data, key, ecb) {
      async.waterfall([
        function _getDimensionValuesMeta(_wcb) {
          getDimensionValuesMeta(pipe, data, _wcb);
        },
        function _createOrUpdateIndiactorValue(_wcb) {
          console.log('process ' + (key + 1) + ' indicator value...')
          bulk.find({
            v: data.v,
            coordinates: ObjectId(coordinates._id),
            indicator: ObjectId(indicator._id),
            ds: {$all: indicatorDimensions[data._id], $size: indicatorDimensions[data._id].length}
          }).upsert().updateOne({
            $set: {
              v: data.v,
              coordinates: coordinates._id,
              indicator: indicator._id,
              analysisSessions: [],
              ds: indicatorDimensions[data._id]
            },
            $addToSet: {
              analysisSessions: analysisSession._id
            }
          });

          return _wcb();
        }
      ], function (err) {
        return ecb(err);
      });
    },
    function (err) {
      if (err) {
        return cb(err);
      }

      if (!pipe.indicatorData.length) {
        return cb();
      }

      bulk.execute(function (_err) {
        console.log(bulk);
        return cb(_err.errmsg);
      });
    });
  }

  function getDimensionValuesMeta(pipe, data, cb) {
    var dimensionsConfig = pipe.dimensions;
    var dimensions = pipe.analysedDimensions;
    var analysedDimensionValues = pipe.analysedDimensionValues;
    var importSession = pipe.is;
    var ImportData = mongoose.model('ImportData');
    var csv = serviceLocator.plugins.get('csv');
    var dataRowNumber = _.result(_.find(data.ds, {d: csv.meta.dimensions.row}), 'v');
    //var dataColNumber = _.result(_.find(data.ds, {d: csv.meta.dimensions.column}), 'v');
    var ds = [];

    async.forEachOfSeries(dimensions, function (dm, key, ecb) {
      var dc = _.find(dimensionsConfig, {subtype: key});
      var dv;
      var query = {};

      // todo: add queries for indicator type column
      if (!pipe.indicator.type || pipe.indicator.type === 'row') {
        query = {
          importSessions: importSession,
          $and: [
            {ds: {$elemMatch: {d: csv.meta.dimensions.filename, v: pipe.dsuid}}},
            {ds: {$elemMatch: {d: csv.meta.dimensions.row, v: dataRowNumber}}},
            {ds: {$elemMatch: {d: csv.meta.dimensions.column, v: dc.colNumber || 0}}}
          ]
        };
      }

      ImportData.findOne(query).lean().exec(function (err, doc) {
        if (!doc) {
          return ecb('No dimension value!');
        }

        dv = _.find(analysedDimensionValues, {dimension: dm._id, value: doc.v});

        if (!dv) {
          return ecb('Something went wrong!');
        }

        if (!ds[data._id]) {
          ds[data._id] = [];
        }

        ds[data._id].push({dv: dv._id, d: dm._id, v: doc.v});

        return ecb(err);
      });
    }, function (err) {
      pipe.indicatorDimensions = ds;
      return cb(err);
    });
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
        $addToSet: {analysisSessions: analysisSession._id}
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
    var analysisSession = pipe.analysisSession;
    var DimensionValues = mongoose.model('DimensionValues');
    var ObjectId = mongoose.Schema.Types.ObjectId;
    var analysedDimensionValues = [];

    async.eachSeries(_.keys(dimensionValues), function (key, ecb) {
      async.eachSeries(dimensionValues[key], function (dmv, _ecb) {
        DimensionValues.findOneAndUpdate(
          {
            dimension: analysedDimensions[key]._id,
            value: dmv
          },
          {
            $set: {
              dimension: analysedDimensions[key]._id,
              value: dmv
            },
            $addToSet: {
              analysisSessions: analysisSession._id
            }
          },
          {upsert: true, 'new': true})
          .lean()
          .exec(function (err, dv) {
            analysedDimensionValues.push(dv);
            return _ecb(err);
          }
        );
      }, function (err) {
        ecb(err);
      });
    }, function (err) {
      if (err) {
        return cb(err);
      }

      pipe.analysedDimensionValues = analysedDimensionValues;

      return cb(err, pipe);
    });
  }

  function getDistinctDimensionValues(pipe, cb) {
    var dimensions = pipe.dimensions;
    var importSession = pipe.is;
    var tableQuery = pipe.dsuid;
    var csv = serviceLocator.plugins.get('csv');
    var ImportData = mongoose.model('ImportData');
    var ObjectId = mongoose.Types.ObjectId;
    var dimensionValues = {};

    // Get distinct dimension values
    async.eachSeries(dimensions, function (dm, ecb) {
      // set for searching how much rows should be skipped before getting dimension values
      var rowQuery = dm.rowNumber || 0;
      var columnQuery = dm.colNumber || 0;
      var query;

      console.log(typeof rowQuery);
      //rowQuery = dm.type === 'row' ? {$gt: rowQuery} : rowQuery;
      // set for searching how much columns should be skipped before getting dimension values
      //columnQuery = dm.type === 'column' ? {$gt: columnQuery} : columnQuery;

      var _ = require('lodash');

      query = {
        importSessions: importSession,
        $where: function () {
          var record = this;
          var isValid = true;

          for (var index in record.ds) {
            var d = record.ds[index];

            switch(d.d) {
              case csv.meta.dimensions.filename:
                isValid *= d.v == tableQuery;
                break;
              case csv.meta.dimensions.column:
                isValid *= d.v > rowQuery;
                break;
              case csv.meta.dimensions.row:
                isValid *= d.v == columnQuery;
                break;
            }
          };

          return isValid;
        }
      };

      console.log(ObjectId.isValid(importSession.toString()));
      console.log('query: ', JSON.stringify(query));

      ImportData.distinct('v', query)
        .lean()
        .exec(function (err, dv) {
          if (err) {
            return ecb(err);
          }

          console.log(dv);
          dimensionValues[dm.subtype] = dv;

          return ecb();
        });
    }, function (err) {
      if (err) {
        return cb(err);
      }
      pipe.dimensionValues = dimensionValues;

      return cb(null, pipe);
    });
  }
};
