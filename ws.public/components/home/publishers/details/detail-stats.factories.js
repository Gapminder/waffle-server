angular.module('admin.services')
  .factory('PublisherDetailStats', ['$resource', function ($resource) {
    return $resource('/api/admin/publisher/stats/:versionId', {id: '@versionId'}, {
      get: {
        method: 'GET'
      }
    });
  }]);
