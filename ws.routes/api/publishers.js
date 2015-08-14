'use strict';

var mongoose = require('mongoose');
var _ = require('lodash');
var async = require('async');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var logger = app.get('log');
  var publishers = serviceLocator.repositories.get('publishers');

  app.get('/api/admin/publisher/:id', getPublisher);
  app.post('/api/admin/publisher/:id', updatePublisher);
  app.delete('/api/admin/publisher/:id', deletePublisher);

  function getPublisher(req, res) {
    return publishers.findById(req.params.id, function (err, publisher) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true, data: publisher});
    });
  }

  function updatePublisher(req, res) {
    return publishers.update(req.params.id, req.body, function (err) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true});
    });
  }

  function deletePublisher(req, res) {
    publishers.deleteRecord(req.params.id, function (err) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true});
    })
  }
};
