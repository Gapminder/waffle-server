// todo: make list searchable and paged
// todo: make updates idempotent
// todo: support analysis sessions
var mongoose = require('mongoose');
var express = require('express');

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
  router.put('/api/dimensions/:did', ensureAuthenticated, updateDimension);
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
  router.put('/api/dimensions/:did/values/:vid', ensureAuthenticated, updateDimensionValue);
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

  // create dimension or dimensions if req.body is array
  function createDimension(req, res, next) {
    try {
      Dimensions.create(req.body, function (err, dimension) {
        if (err) {
          return next(err);
        }

        return res.json({success: true, data: {dimension: dimension}});
      });
    } catch (e) {
      return next(e);
    }
  }

  // create dimension value or values if req.body is array
  function createDimensionValues(req, res, next) {
    try {
      Dimensions.create(req.body, function (err, dimensionValues) {
        if (err) {
          return next(err);
        }

        return res.json({success: true, data: {dimensionValues: dimensionValues}});
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

  // update dimension
  function updateDimension(req, res, next) {
    try {
      var body = req.body;
      delete body._id;
      Dimensions.update({_id: req.dimension._id}, {$set: body}, function (err) {
        if (err) {
          return next(err);
        }

        return res.json({success: true});
      });
    } catch (e) {
      return next(e);
    }
  }

  // update dimension value
  function updateDimensionValue(req, res, next) {
    try {
      var body = req.body;
      delete body._id;
      DimensionValues.update({_id: req.dimensionValue._id}, {$set: body}, function (err) {
        if (err) {
          return next(err);
        }

        return res.json({success: true});
      });
    } catch (e) {
      return next(e);
    }
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
