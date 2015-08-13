'use strict';

var mongoose = require('mongoose');
var _ = require('lodash');
var async = require('async');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var logger = app.get('log');
  var publishers = serviceLocator.repositories.get('publishers');

  app.post('/api/admin/publisher/:id', updatePublisher);

  function updatePublisher(req, res) {
    publishers.update(req.params.id, req.body, function (err) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true, data: data});
    });
  }
};
