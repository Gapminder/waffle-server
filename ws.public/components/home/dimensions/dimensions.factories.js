angular.module('admin.services')
  .factory('PublisherDetailDimensions', ['$resource', function ($resource) {
    return $resource('/api/admin/publisher/dimensions/:versionId', {id: '@versionId'}, {
      get: {
        method: 'GET'
      }
    });
  }])
  .factory('DimensionEntity', ['$resource', function ($resource) {
    return $resource('/api/admin/dimensions/:id', {id: '@_id'}, {
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
