'use strict';

// public/js/controllers/MainCtrl.js
angular.module('MainCtrl', []).controller('MainController', ['$rootScope', '$http', '$scope',
  function($rootScope, $http, $scope) {
    $scope.tagline = 'Waffle Server';

    $scope.data = [];
    $scope.gridCollections = {
      data: 'data',
      columnDefs: [
        {field: 'name', displayName: 'Name'},
        {field: 'count', displayName: 'Count Docs'},
        {field: 'fields', displayName: 'Fields'}
      ]
    }

    $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams) {
      debugger;
      $http.get('/api/collection/' + (toParams.type || 'list'))
        .success(function(data) {
          $scope.data = data.data;
        })
        .error(function(data, status, headers, config) {
          console.error(data, status);
        });
    });
  }
]);
