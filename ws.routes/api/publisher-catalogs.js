'use strict';

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var logger = app.get('log');
  var publisherCatalogs = serviceLocator.repositories.get('PublisherCatalogs');

  app.get('/api/admin/publisher-catalog/:id', getPublisherCatalog);
  app.post('/api/admin/publisher-catalog/:id', updatePublisherCatalog);
  app.delete('/api/admin/publisher-catalog/:id', deletePublisherCatalog);

  function getPublisherCatalog(req, res) {
    return publisherCatalogs.findById({id: req.params.id}, function (err, publisherCatalog) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true, data: publisherCatalog});
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
