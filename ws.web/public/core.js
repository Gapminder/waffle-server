// public/core.js
var adminPanel = angular.module('adminPanel', []);

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
