// todo: make list searchable and paged
// todo: make updates idempotent
// todo: support analysis sessions
var _ = require('lodash');
var async = require('async');
var express = require('express');
var mongoose = require('mongoose');

var ensureAuthenticated = require('../utils').ensureAuthenticated;

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  /*eslint new-cap:0*/
  var router = express.Router();

  var Indicators = mongoose.model('Indicators');
  var IndicatorValues = mongoose.model('IndicatorValues');
  var Dimensions = mongoose.model('Dimensions');
  var DimensionValues = mongoose.model('DimensionValues');

  // resolve indicator by id
  router.param('did', function (req, res, next, id) {
    Indicators.findOne({_id: id}, {analysisSessions: false})
      .exec(function (err, indicator) {
        if (err) {
          return next(err);
        }

        if (!indicator) {
          return next(new Error('Indicator with id: ' + id + 'not found!'));
        }

        req.indicator = indicator;
        return next();
      });
  });

  // resolve indicator value by id
  router.param('vid', function (req, res, next, id) {
    IndicatorValues.findOne({_id: id}, {analysisSessions: false})
      .exec(function (err, indicatorValue) {
        if (err) {
          return next(err);
        }

        if (!indicatorValue) {
          return next(new Error('Indicator value with id: ' + id + 'not found!'));
        }

        req.indicatorValue = indicatorValue;
        return next();
      });
  });

  // Indicators

  // list
  router.get('/api/indicators', ensureAuthenticated, listIndicators);
  // create
  router.post('/api/indicators', ensureAuthenticated, createIndicator);
  // read
  router.get('/api/indicators/:did', ensureAuthenticated, readIndicator);
  // update
  router.put('/api/indicators/:did', ensureAuthenticated, createIndicator);
  // delete
  router.delete('/api/indicators/:did', ensureAuthenticated, deleteIndicator);

  // Indicator values

  // list
  router.get('/api/indicators/:did/values', ensureAuthenticated, listIndicatorValues);
  // create
  router.post('/api/indicators/:did/values', ensureAuthenticated, createIndicatorValues);
  // read
  router.get('/api/indicators/:did/values/:vid', ensureAuthenticated, readIndicatorValue);
  // update
  router.put('/api/indicators/:did/values/:vid', ensureAuthenticated, createIndicatorValues);
  // delete
  router.delete('/api/indicators/:did/values/:vid', ensureAuthenticated, deleteIndicatorValue);

  return app.use(router);

  // Middle ware implementations

  // list indicators
  function listIndicators(req, res, next) {
    // todo: add listing, searching
    Indicators.find({}, {analysisSessions: false}).lean(true).exec(function (err, indicators) {
      if (err) {
        return next(err);
      }

      return res.json({success: true, data: {indicators: indicators}});
    });
  }

  // list indicator values
  function listIndicatorValues(req, res, next) {
    // todo: add listing, searching
    IndicatorValues.find({}, {analysisSessions: false}).lean(true).exec(function (err, indicatorValues) {
      if (err) {
        return next(err);
      }

      return res.json({success: true, data: {indicatorValues: indicatorValues}});
    });
  }

  // create or update indicator or indicators if req.body is array
  function createIndicator(req, res, next) {
    try {
      var body = req.body;
      var name = body.name.toLowerCase();
      var task = {
        query: {
          name: name
        },
        body: {
          $set: {
            name: name,
            dimensions: body.dimensions,
            // title: body.title || name,
            meta: body.meta || {}
          }
        }
      };
      if (body.title) {
        task.body.$set.title = body.title;
      }
      if (body.units) {
        task.body.$set.units = body.units;
      }
      var options = {upsert: true, 'new': true};
      Indicators.findOneAndUpdate(task.query, task.body, options, function (err, indicator) {
        if (err) {
          return next(err);
        }

        return res.json({
          success: true,
          data: {indicator: indicator}
        });
      });
    } catch (e) {
      return next(e);
    }
  }

  // create or update indicator value or values if req.body is array
  function createIndicatorValues(req, res, next) {
    // later: load existing indicator values, find diff, update only new
    // todo: load dimension values
    // todo: convert to hash maps _.indexBy
    // todo: create tasks to create indicators values
    try {
      async.waterfall([
        function initWaterfall(cb) {
          var indicator = req.indicator;
          var headers = req.body.headers;
          var rows = req.body.rows;

          var pipe = {
            indicator: indicator,
            headers: headers,
            rows: rows
          };
          return cb(null, pipe);
        },
        // load dimensions
        function loadDimensions(pipe, cb) {
          var headers = pipe.headers;
          pipe.dimensions = [];
          return async.eachLimit(headers, 10,
            function iterator(def, iterCb) {
              if (def.type !== 'dimension') {
                return iterCb();
              }

              Dimensions.findOne({_id: def._id}).lean(true).exec(function (err, dimension) {
                if (err) {
                  return iterCb(err);
                }

                var index = _.indexOf(headers, def);
                pipe.dimensions[index] = dimension;
                return iterCb(err);
              });
            },
            function done(err) {
              return cb(err, pipe);
            });
        },
        // build dimension values hash map
        function buildDimensionValuesHashMaps(pipe, cb) {
          var dimensions = pipe.dimensions;
          pipe.dimensionValues = new Array(dimensions.length);
          pipe.dimensionHashMaps = new Array(dimensions.length);
          async.eachLimit(dimensions, 10, function (dimension, iterCb) {
            DimensionValues
              .find({dimension: dimension._id}, {dimension: 1, value: 1, title: 1, dimensionName: 1})
              .lean(true)
              .exec(function (err, dimensionValues) {
                if (err) {
                  return iterCb(err);
                }

                var index = _.indexOf(dimensions, dimension);
                pipe.dimensionValues[index] = dimensionValues;
                pipe.dimensionHashMaps[index] = _.indexBy(dimensionValues, 'value');
                return iterCb(err);
              });
          }, function done(err) {
            return cb(err, pipe);
          });
        },
        // write values to mongo
        function updateIndicatorValues(pipe, cb) {
          var indicator = pipe.indicator;
          var dimensions = pipe.dimensions;
          var dimensionHashMaps = pipe.dimensionHashMaps;
          var saved = 0;
          var start = Date.now();
          async.eachLimit(pipe.rows, 100,
            function iterator(row, iterCb) {
              var indicatorValue = row[row.length - 1];
              if (!indicatorValue && indicatorValue !== 0) {
                return iterCb();
              }
              var coordinates = _.map(dimensionHashMaps, function (dhm, index) {
                var value = row[index];
                return {
                  value: value,
                  dimensionName: dimensions[index].name,

                  dimension: dimensions[index]._id,
                  dimensionValue: dhm[value]._id
                };
              });
              var queryCoordinates = _.map(coordinates, function (c) {
                return {
                  $elemMatch: {
                    dimension: c.dimension,
                    value: c.value
                  }
                };
              });
              var query = {
                indicator: indicator._id,
                coordinates: {$all: queryCoordinates}
              };
              var body = {
                $set: {
                  coordinates: coordinates,
                  value: indicatorValue,
                  // title?
                  indicator: indicator._id,
                  indicatorName: indicator.name
                }
              };
              IndicatorValues
                .update(query, body, {upsert: true})
                .hint({indicator: 1, 'coordinates.dimension': 1, 'coordinates.value': 1})
                .exec(function (err) {
                  saved++;
                  if (saved % 1000 === 0) {
                    console.log(saved, Date.now() - start, 'ms');
                    start = Date.now();
                  }
                  return iterCb(err);
                });
            },
            function done(err) {
              return cb(err, pipe);
            }
          );
        }
      ], function done(err, pipe) {
        if (err) {
          return res.throw(err);
        }
        // todo: give response
        return res.json({success: true});
      });
    } catch (e) {
      return next(e);
    }
  }

  // read indicator
  function readIndicator(req, res) {
    return res.json({success: true, data: {indicator: req.indicator}});
  }

  // read indicator value
  function readIndicatorValue(req, res) {
    return res.json({success: true, data: {indicator: req.indicatorValue}});
  }

  // delete indicator
  function deleteIndicator(req, res, next) {
    try {
      Indicators.remove({_id: req.indicator._id}, function (err) {
        if (err) {
          return next(err);
        }

        return res.json({success: true});
      });
    } catch (e) {
      return next(e);
    }
  }

  // delete indicator value
  function deleteIndicatorValue(req, res, next) {
    try {
      IndicatorValues.remove({_id: req.indicator._id}, function (err) {
        if (err) {
          return next(err);
        }

        return res.json({success: true});
      });
    } catch (e) {
      return next(e);
    }
  }
};
