angular.module('admin.services')
  .factory('PublisherDetailDimensionValues', ['$resource', function ($resource) {
    return $resource('/api/admin/publisher/dimension-values/:versionId/:dimensionId',
      {versionId: '@versionId', dimensionId: '@dimensionId'}, {
        get: {
          method: 'GET'
        }
      });
  }])
  .factory('DimensionValueEntity', ['$resource', function ($resource) {
    return $resource('/api/admin/dimension-values/:id', {id: '@_id'}, {
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