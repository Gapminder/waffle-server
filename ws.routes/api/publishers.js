'use strict';
var async = require('async');
var _ = require('lodash');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var logger = app.get('log');
  var publishers = serviceLocator.repositories.get('Publishers');
  var publisherCatalogVersions = serviceLocator.repositories.get('PublisherCatalogVersions');

  app.get('/api/admin/publishers', getPublishers);
  app.get('/api/admin/publisher/:id', getPublisher);
  app.post('/api/admin/publisher/:id', updatePublisher);
  app.delete('/api/admin/publisher/:id', deletePublisher);
  app.get('/api/admin/publisher/dimensions/:versionId', getDimensions);
  app.get('/api/admin/publisher/indicators/:versionId', getIndicators);
  app.get('/api/admin/publisher/stats/:versionId', getStats);

  function getPublishers(req, res) {
    return publishers.pagedList(req.params, function (err, data) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      function getVersionsCountForPublisher(publisher) {
        return function (cb) {
          publisherCatalogVersions.countByPublisher({
            publisherId: publisher._id
          }, function (err, count) {
            publisher.versions = count;
            return cb(err);
          });
        };
      }

      var actions = [];
      data.data.forEach(function (record) {
        actions.push(getVersionsCountForPublisher(record));
      });

      return async.parallel(actions, function (err) {
        if (err) {
          logger.error(err);
          return res.json({error: err});
        }

        return res.json({success: true, data: data.data});
      });
    });
  }

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

  function getDimensions(req, res) {
    return res.json({success: true, data: []});
  }

  function getIndicators(req, res) {
    return res.json({success: true, data: []});
  }

  function getStats(req, res) {
    return res.json({success: true, data: []});
  }
};
