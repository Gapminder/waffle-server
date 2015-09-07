module.exports = function (app) {
  app
    .config(['$stateProvider', function ($stateProvider) {
      $stateProvider
        .state('admin.files', {
          url: '/files',
          templateUrl: '/components/file-management/file-upload/file-upload.html',
          controller: 'FileUploadController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: 'File upload',
            parent: 'admin.landing'
          }
        });
    }]);
};
