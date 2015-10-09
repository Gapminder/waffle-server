module.exports = function (app) {
  app
    .config([
      '$locationProvider', '$urlRouterProvider',
      function ($locationProvider, $urlRouterProvider) {
        $locationProvider.html5Mode({
          enabled: true,
          requireBase: false
        });

        $locationProvider.hashPrefix('!');

        $urlRouterProvider.otherwise('/admin');
      }])
    .run(['$state', '$rootScope', function ($state, $rootScope) {
      $rootScope.$on('$stateChangeError', function () {
        $state.go('error500');
      });

      $rootScope.$on('$stateNotFound', function () {
        $state.go('error404');
      });
    }]);
};
