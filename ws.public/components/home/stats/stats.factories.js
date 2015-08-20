angular.module('admin.services')
  .factory('PublisherDetailStats', ['$resource', function ($resource) {
    return $resource('/api/admin/publisher/stats/:versionId', {id: '@versionId'}, {
      get: {
        method: 'GET'
      }
    });
  }])
  .factory('Chart', ['$resource', function ($resource) {
    return $resource('/api/admin/chart/:versionId/:indicatorId',
      {versionId: '@versionId', indicatorId: '@indicatorId'}, {
        get: {
          method: 'GET'
        }
      });
  }]);