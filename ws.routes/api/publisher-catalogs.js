'use strict';
var _ = require('lodash');

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var logger = app.get('log');
  var publisherCatalogs = serviceLocator.repositories.get('PublisherCatalogs');

  app.get('/api/admin/publisher-catalog', getPublisherCatalogs);
  app.get('/api/admin/publisher-catalog/:id', getPublisherCatalog);
  app.post('/api/admin/publisher-catalog/:id', updatePublisherCatalog);
  app.delete('/api/admin/publisher-catalog/:id', deletePublisherCatalog);

  function getPublisherCatalogs(req, res) {
    var params = _.merge({}, req.params, {
      populate: [{path: 'publisher', select: 'name'}]
    });
    return publisherCatalogs.pagedList(params, function(err, json){
      if (err) {
        logger.error(err);
      }
      return res.json(json);
    });
  }

  function getPublisherCatalog(req, res) {
    return publisherCatalogs.findById({
        id: req.params.id,
        populate: {
          path: 'publisher',
          select: 'name'
        }
      },
      function (err, publisherCatalog) {
        if (err) {
          logger.error(err);
        }

        return res.json({success: !err, error: err, data: publisherCatalog});
      });
  }

  function updatePublisherCatalog(req, res) {
    return publisherCatalogs.update(req.params.id, req.body, function (err) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true});
    });
  }

  function deletePublisherCatalog(req, res) {
    publisherCatalogs.deleteRecord(req.params.id, function (err) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true});
    })
  }
};
