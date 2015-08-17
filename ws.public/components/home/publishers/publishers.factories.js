angular.module('admin.services')
  .factory('Publishers', ['$resource', function ($resource) {
    return $resource('/api/admin/publishers', {}, {
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
  }]);