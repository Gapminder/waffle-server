module.exports = function (app) {
  app
    .config(['$stateProvider', function ($stateProvider) {
      $stateProvider
        .state('admin.piping', {
          url: '/piping',
          template: require('./piping/piping.html'),
          controller: 'PipingController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: 'Piping',
            parent: 'admin.landing'
          }
        });
    }]);
};
