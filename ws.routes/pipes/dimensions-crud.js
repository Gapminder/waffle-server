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

  var Dimensions = mongoose.model('Dimensions');
  var DimensionValues = mongoose.model('DimensionValues');

  // resolve dimension by id
  router.param('did', function (req, res, next, id) {
    Dimensions.findOne({_id: id}, {analysisSessions: false})
      .exec(function (err, dimension) {
        if (err) {
          return next(err);
        }

        if (!dimension) {
          return next(new Error('Dimension with id: ' + id + 'not found!'));
        }

        req.dimension = dimension;
        return next();
      });
  });

  // resolve dimension value by id
  router.param('vid', function (req, res, next, id) {
    DimensionValues.findOne({_id: id}, {analysisSessions: false})
      .exec(function (err, dimensionValue) {
        if (err) {
          return next(err);
        }

        if (!dimensionValue) {
          return next(new Error('Dimension value with id: ' + id + 'not found!'));
        }

        req.dimensionValue = dimensionValue;
        return next();
      });
  });

  // Dimensions

  // list
  router.get('/api/dimensions', ensureAuthenticated, listDimensions);
  // create
  router.post('/api/dimensions', ensureAuthenticated, createDimension);
  // read
  router.get('/api/dimensions/:did', ensureAuthenticated, readDimension);
  // update
  router.put('/api/dimensions/:did', ensureAuthenticated, createDimension);
  // delete
  router.delete('/api/dimensions/:did', ensureAuthenticated, deleteDimension);

  // Dimension values

  // list
  router.get('/api/dimensions/:did/values', ensureAuthenticated, listDimensionValues);
  // create
  router.post('/api/dimensions/:did/values', ensureAuthenticated, createDimensionValues);
  // read
  router.get('/api/dimensions/:did/values/:vid', ensureAuthenticated, readDimensionValue);
  // update
  router.put('/api/dimensions/:did/values/:vid', ensureAuthenticated, createDimensionValues);
  // delete
  router.delete('/api/dimensions/:did/values/:vid', ensureAuthenticated, deleteDimensionValue);

  return app.use(router);

  // Middle ware implementations

  // list dimensions
  function listDimensions(req, res, next) {
    // todo: add listing, searching
    Dimensions.find({}, {analysisSessions: false}).lean(true).exec(function (err, dimensions) {
      if (err) {
        return next(err);
      }

      return res.json({success: true, data: {dimensions: dimensions}});
    });
  }

  // list dimension values
  function listDimensionValues(req, res, next) {
    // todo: add listing, searching
    DimensionValues.find({}, {analysisSessions: false}).lean(true).exec(function (err, dimensionValues) {
      if (err) {
        return next(err);
      }

      return res.json({success: true, data: {dimensionValues: dimensionValues}});
    });
  }

  // create or update dimension or dimensions if req.body is array
  function createDimension(req, res, next) {
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
      var options = {upsert: true, 'new': true};
      Dimensions.findOneAndUpdate(task.query, task.body, options, function (err, dimension) {
        if (err) {
          return next(err);
        }

        return res.json({
          success: true,
          data: {dimension: dimension}
        });
      });
    } catch (e) {
      return next(e);
    }
  }

  // create or update dimension value or values if req.body is array
  function createDimensionValues(req, res, next) {
    try {
      var dimension = req.dimension;
      var arr = _.isArray(req.body) ? req.body : [req.body];
      var tasks = _.map(arr, function (dimensionValue) {
        var task = {
          query: {dimension: dimension._id, value: dimensionValue.value},
          body: {
            $set: {
              dimension: dimension._id,
              dimensionName: dimension.name,
              value: dimensionValue.value
              // title: dimensionValue.title
            },
            $addToSet: {synonyms: {$each: dimensionValue.synonyms}}
          }
        };

        if (dimensionValue.title) {
          task.body.$set.title = dimensionValue.title;
        }

        return task;
      });
      var options = {upsert: true};
      var createdValues = 0;
      var updatedValues = 0;
      async.eachLimit(tasks, 50, function create(task, cb) {
        return DimensionValues.update(task.query, task.body, options, function (err, result) {
          createdValues += result.n;
          updatedValues += result.nModified;
          return cb(err);
        });
      }, function (err, dimensionValues) {
        if (err) {
          return next(err);
        }

        return res.json({
          success: true,
          data: {dimensionValues: dimensionValues},
          stats: {created: createdValues, updated: updatedValues}
        });
      });
    } catch (e) {
      return next(e);
    }
  }

  // read dimension
  function readDimension(req, res) {
    return res.json({success: true, data: {dimension: req.dimension}});
  }

  // read dimension value
  function readDimensionValue(req, res) {
    return res.json({success: true, data: {dimension: req.dimensionValue}});
  }

  // delete dimension
  function deleteDimension(req, res, next) {
    try {
      Dimensions.remove({_id: req.dimension._id}, function (err) {
        if (err) {
          return next(err);
        }

        return res.json({success: true});
      });
    } catch (e) {
      return next(e);
    }
  }

  // delete dimension value
  function deleteDimensionValue(req, res, next) {
    try {
      DimensionValues.remove({_id: req.dimension._id}, function (err) {
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
