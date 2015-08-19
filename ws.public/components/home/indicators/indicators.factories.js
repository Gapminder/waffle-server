angular.module('admin.services')
  .factory('PublisherDetailIndicators', ['$resource', function ($resource) {
    return $resource('/api/admin/publisher/indicators/:versionId', {id: '@versionId'}, {
      get: {
        method: 'GET'
      }
    });
  }])
  .factory('IndicatorEntity', ['$resource', function ($resource) {
    return $resource('/api/admin/indicators/:id', {id: '@_id'}, {
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
