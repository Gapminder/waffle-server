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
      var indicator = req.indicator;
      var arr = _.isArray(req.body) ? req.body : [req.body];
      var tasks = _.map(arr, function (indicatorValue) {
        var task = {
          query: {
            indicator: indicator._id,
            value: indicatorValue.value},
          body: {
            $set: {
              indicator: indicator._id,
              indicatorName: indicator.name,
              value: indicatorValue.value
              // title: indicatorValue.title
            },
            $addToSet: {synonyms: {$each: indicatorValue.synonyms}}
          }
        };

        if (indicatorValue.title) {
          task.body.$set.title = indicatorValue.title;
        }

        return task;
      });
      var options = {upsert: true};
      var createdValues = 0;
      var updatedValues = 0;
      async.eachLimit(tasks, 50, function create(task, cb) {
        return IndicatorValues.update(task.query, task.body, options, function (err, result) {
          createdValues += result.n;
          updatedValues += result.nModified;
          return cb(err);
        });
      }, function (err, indicatorValues) {
        if (err) {
          return next(err);
        }

        return res.json({
          success: true,
          data: {indicatorValues: indicatorValues},
          stats: {created: createdValues, updated: updatedValues}
        });
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
