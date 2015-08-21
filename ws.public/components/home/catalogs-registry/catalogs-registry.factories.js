angular.module('admin.services')
  .factory('PublisherCatalogVersions', ['$resource', function ($resource){
    'use strict';


  }])
  .factory('PublisherCatalogs', ['$resource', function ($resource) {
    'use strict';

    var service = {
      getData: getData
    };

    var apiResource = $resource('/api/admin/publisher-catalog', {});

    return service;

    function getData(params, cb) {
      apiResource.get(params, function (resp) {
        return cb(resp.error, {data: resp.data, totalItems: resp.totalItems}, resp);
      });
    }
  }])
  .factory('PublisherCatalogEntry', ['$resource', function ($resource) {
    'use strict';

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
  }]);
