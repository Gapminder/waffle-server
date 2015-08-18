angular.module('admin.services')
  .factory('PublisherDetailDimensions', ['$resource', function ($resource) {
    return $resource('/api/admin/publisher/dimensions/:versionId', {id: '@versionId'}, {
      get: {
        method: 'GET'
      }
    });
  }]);
