'use strict';

angular.module('adminPanel.controllers', []);
angular.module('adminPanel.services', []);
angular.module('adminPanel.directives', []);

angular.module('adminPanel', [
    'ngResource',
    'ui.router',
    'ui.bootstrap',
    'adminPanel.controllers',
    'adminPanel.services',
    'adminPanel.directives'
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
