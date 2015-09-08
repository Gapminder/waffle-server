module.exports = function (app) {
  app
    .config(['$stateProvider', function ($stateProvider) {
      $stateProvider
        .state('admin.file-upload', {
          url: '/file-upload',
          templateUrl: '/components/file-management/file-upload/file-upload.html',
          controller: 'FileUploadController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: 'File upload',
            parent: 'admin.landing'
          }
        })
        .state('admin.file-list', {
          url: '/file-list',
          templateUrl: '/components/file-management/file-list/file-list.html',
          controller: 'FileListController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: 'File list',
            parent: 'admin.landing'
          }
        });
    }]);
};
