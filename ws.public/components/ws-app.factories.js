angular.module('admin.services')
  .factory('Publishers', ['$resource', function ($resource) {
    return $resource('/api/admin/collections/publishers', {}, {
      get: {
        method: 'GET'
      }
    });
  }])
  .factory('PublisherEntry', ['$resource', function ($resource) {
    return $resource('/api/admin/publisher/:id', {id: '@_id'}, {
      get: {
        method: 'GET'
      },
      update: {
        method: 'POST'
      },
      deleteRecord: {
        method: 'DELETE'
      }
    });
  }])
  .factory('PublisherCatalogs', ['$resource', function ($resource) {
    return $resource('/api/admin/collections/publisherCatalogs', {}, {
      get: {
        method: 'GET'
      }
    });
  }])
  .factory('PublisherCatalogEntry', ['$resource', function ($resource) {
    return $resource('/api/admin/publisher-catalog/:id', {id: '@_id'}, {
      get: {
        method: 'GET'
      },
      update: {
        method: 'POST'
      },
      deleteRecord: {
        method: 'DELETE'
      }
    });
  }])
  .factory('PublisherCatalogVersionsEntry', ['$resource', function ($resource) {
    return $resource('/api/admin/publisher-catalog-versions', {}, {
      get: {
        method: 'GET'
      }
    });
  }])
  .factory('PublisherCatalogVersionEntry', ['$resource', function ($resource) {
    return $resource('/api/admin/publisher-catalog-version/:id', {id: '@_id'}, {
      get: {
        method: 'GET'
      },
      update: {
        method: 'POST'
      },
      deleteRecord: {
        method: 'DELETE'
      }
    });
  }])
  .factory('OptionsHolder', ['Publishers', 'PublisherCatalogs', function (Publishers, PublisherCatalogs) {
    var factory = {};

    factory.fillPublishers = function fillPublishers(cb) {
      return Publishers.get({}, function (resp) {
        if (resp.error) {
          return cb(resp.error);
        }

        return cb(null, resp.data);
      });
    };

    factory.fillCatalogs = function fillCatalogs(cb) {
      return PublisherCatalogs.get({}, function (resp) {
        if (resp.error) {
          return cb(resp.error);
        }

        return cb(null, resp.data);
      });
    };

    return factory;
  }]);