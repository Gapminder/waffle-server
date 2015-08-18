'use strict';

module.exports = function (serviceLocator) {
  var app = serviceLocator.getApplication();
  var logger = app.get('log');
  var publisherCatalogVersions = serviceLocator.repositories.get('PublisherCatalogVersions');

  app.get('/api/admin/publisher-catalog-versions', getPublisherCatalogVersions);
  app.get('/api/admin/publisher-catalog-version-counters/:versionId', detailsCounts);
  app.get('/api/admin/publisher-catalog-version/:id', getPublisherCatalogVersion);
  app.post('/api/admin/publisher-catalog-version/:id', updatePublisherCatalogVersion);
  app.delete('/api/admin/publisher-catalog-version/:id', deletePublisherCatalogVersion);

  function getPublisherCatalogVersions(req, res) {
    return publisherCatalogVersions.lastVersionByPublisher({
      publisherId: req.query.publisherId
    }, function (err, data) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true, data: data});
    });
  }

  function detailsCounts(req, res) {
    return publisherCatalogVersions.detailsCounts({
      versionId: req.params.versionId
    }, function (err, data) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true, data: data});
    });
  }

  function getPublisherCatalogVersion(req, res) {
    return publisherCatalogVersions.findById(req.params.id, function (err, record) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true, data: record});
    });
  }

  function updatePublisherCatalogVersion(req, res) {
    return publisherCatalogVersions.update(req.params.id, req.body, function (err) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true});
    });
  }

  function deletePublisherCatalogVersion(req, res) {
    publisherCatalogVersions.deleteRecord(req.params.id, function (err) {
      if (err) {
        logger.error(err);
        return res.json({error: err});
      }

      return res.json({success: true});
    })
  }
};
