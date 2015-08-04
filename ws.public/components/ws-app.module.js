'use strict';

angular.module('admin.controllers', []);
angular.module('admin.services', []);
angular.module('admin.directives', []);

angular.module('admin', [
    'ngResource',
    'ui.router',
    'ui.bootstrap',
    'admin.controllers',
    'admin.services',
    'admin.directives'
  ]);
// Other libraries are loaded dynamically in the config.js file using the library ocLazyLoad

// todo: remove?
function mainController($scope, $http) {
  $scope.formData = {};

  $http.get('/api/collections/list')
    .success(function(data) {
      $scope.collections = data;
      console.log(data);
    })
    .error(function(data) {
      console.log('Error: ' + data);
    });

  $scope.getData = function() {
    $http.get('/api/collections', $scope.formData)
      .success(function(data) {
        $scope.formData = {};
        $scope.data = data;
        console.log(data);
      })
      .error(function(data) {
        console.log('Error: ' + data);
      });
  };
}
