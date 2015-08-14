angular.module('admin.services')
  .factory('PublisherEntry', ['$resource', function ($resource) {
    return $resource('/api/admin/publisher/:id');
  }]);