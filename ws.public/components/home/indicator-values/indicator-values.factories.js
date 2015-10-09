module.exports = function (app) {
  app
    .factory('PublisherDetailIndicatorValues', ['$resource', function ($resource) {
      return $resource('/api/admin/publisher/indicator-values/:versionId/:indicatorId',
        {versionId: '@versionId', indicatorId: '@indicatorId'}, {
          get: {
            method: 'GET'
          }
        });
    }])
    .factory('IndicatorValueEntity', ['$resource', function ($resource) {
      return $resource('/api/admin/indicator-values/:id', {id: '@_id'}, {
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
};
