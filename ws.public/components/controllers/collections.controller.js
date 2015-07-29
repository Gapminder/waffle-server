'use strict';

angular.module('adminPanel.controllers').controller('CollectionsController', ['$rootScope', '$http', '$state',
  function CollectionsController($rootScope, $http, $state) {
    var self = this;
    self.tagline = 'Waffle Server';

    self.data = [];
    self.gridCollections = {
      data: 'data',
      columnDefs: [
        {field: 'name', displayName: 'Name'},
        {field: 'count', displayName: 'Count Docs'},
        {field: 'fields', displayName: 'Fields'}
      ]
    }

    $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams) {
      $http.get('/api/collection/' + (toParams.type || 'list'))
        .success(function(data) {
          self.data = data.data;
        })
        .error(function(data, status) {
          console.error(data, status);
        });
    });
  }
]);
