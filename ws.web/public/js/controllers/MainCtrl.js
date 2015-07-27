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

    $rootScope.$on('$stateChangeSuccess', function (event, toState) {
      $http.get('/api/collection' + toState.url)
        .success(function(data) {
          $scope.data = data.data;
        });
    });
  }
]);
