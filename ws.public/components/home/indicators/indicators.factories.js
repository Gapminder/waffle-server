angular.module('admin.services')
  .factory('PublisherDetailIndicators', ['$resource', function ($resource) {
    return $resource('/api/admin/publisher/indicators/:versionId', {id: '@versionId'}, {
      get: {
        method: 'GET'
      }
    });
  }]);
