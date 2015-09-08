module.exports = function (app) {
  app
    .config(['$stateProvider', function ($stateProvider) {
      $stateProvider
        .state('admin', {
          url: '/admin',
          'abstract': true,
          views: {
            '@': {
              template: '<ui-view />'
            },
            topnavbar: {
              templateUrl: '/components/shared/navigation/top-navbar.html'
            },
            navigation: {
              templateUrl: '/components/shared/navigation/navigation.html'
            }
          },
          resolve: {
            authentication: [
              '$http', '$state', '$rootScope',
              function ($http, $state, $rootScope) {
                $http.get('/api/users/me').success(function (res) {
                  if (!res.success) {
                    $state.go('login');
                  }
                  $rootScope.user = res.data && res.data.user;
                });
              }]
          }
        })
        .state('admin.landing', {
          url: '',
          templateUrl: '/components/landing/landing.html',
          controller: 'LandingController',
          controllerAs: 'mainCtrl',
          ncyBreadcrumb: {
            label: 'Home'
          }
        })
        .state('admin.home', {
          'abstract': true,
          url: '/home',
          template: '<ui-view/>'
        })
        .state('admin.home.publishers', {
          'abstract': true,
          url: '/publishers',
          template: '<ui-view/>'
        })
        .state('admin.home.publishers.list', {
          url: '/list',
          templateUrl: '/components/home/publishers/publishers-list.html',
          controller: 'PublishersListController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: 'Publishers',
            parent: 'admin.landing'
          }
        })
        .state('admin.home.publishers.catalogVersions', {
          url: '/catalog/:publisherId',
          templateUrl: '/components/home/versions/versions.html',
          controller: 'PublishersCatalogVersionsController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: '{{ctrl.publisherRecord.name}}',
            parent: 'admin.home.publishers.list'
          }
        })
        .state('admin.home.publishers.catalogVersionDetails', {
          url: '/version/:publisherId/:versionId',
          templateUrl: '/components/home/versions/version-details.html',
          controller: 'PublishersCatalogVersionDetailsController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: '{{ctrl.versionRecord.catalog.name}} ({{ctrl.versionRecord.version}})',
            parent: 'admin.home.publishers.catalogVersions'
          }
        })
        .state('admin.home.publishers.dimensions', {
          url: '/dimensions/:publisherId/:versionId',
          templateUrl: '/components/home/dimensions/dimensions.html',
          controller: 'DetailDimensionsController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: 'Dimensions',
            parent: 'admin.home.publishers.catalogVersionDetails'
          }
        })
        .state('admin.home.publishers.dimensionValues', {
          'abstract': true,
          url: '/dimension-values/:publisherId',
          template: '<ui-view/>'
        })
        .state('admin.home.publishers.dimensionValues.list', {
          url: '/:versionId/:dimensionId',
          templateUrl: '/components/home/dimension-values/dimension-values.html',
          controller: 'DetailDimensionValuesController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: '{{ctrl.currentDimension.name}}',
            parent: 'admin.home.publishers.dimensions'
          }
        })
        .state('admin.home.publishers.dimensionValues.edit', {
          url: '/:versionId/:dimensionId/:id',
          templateUrl: '/components/home/dimension-values/dimension-values-edit.html',
          controller: 'DetailDimensionValuesEditController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: '{{ctrl.record.value}}',
            parent: 'admin.home.publishers.dimensionValues.list'
          }
        })
        .state('admin.home.publishers.indicators', {
          url: '/indicators/:publisherId/:versionId',
          templateUrl: '/components/home/indicators/indicators.html',
          controller: 'DetailIndicatorsController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: 'Indicators',
            parent: 'admin.home.publishers.catalogVersionDetails'
          }
        })
        .state('admin.home.publishers.indicatorValues', {
          'abstract': true,
          url: '/indicator-values/:publisherId',
          template: '<ui-view/>'
        })
        .state('admin.home.publishers.indicatorValues.list', {
          url: '/:versionId/:indicatorId',
          templateUrl: '/components/home/indicator-values/indicator-values.html',
          controller: 'DetailIndicatorValuesController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: '{{ctrl.currentIndicator.name}}',
            parent: 'admin.home.publishers.indicators'
          }
        })
        .state('admin.home.publishers.indicatorValues.edit', {
          url: '/:versionId/:indicatorId/:id',
          templateUrl: '/components/home/indicator-values/indicator-values-edit.html',
          controller: 'DetailIndicatorValuesEditController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: '{{ctrl.record._id ? ctrl.record.ds[0].v + " - " + ctrl.record.ds[1].v : "New Indicator Value"}}',
            parent: 'admin.home.publishers.indicatorValues.list'
          }
        })
        .state('admin.home.publishers.stats', {
          url: '/stats/:publisherId/:versionId',
          templateUrl: '/components/home/stats/stats.html',
          controller: 'DetailStatsController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: 'Stats',
            parent: 'admin.home.publishers.catalogVersionDetails'
          }
        })
        .state('admin.home.publishers.edit', {
          url: '/edit/:id',
          templateUrl: '/components/home/publishers/publishers-edit.html',
          controller: 'PublishersEditController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: '{{ctrl.record._id ? ctrl.record.name : "New Publisher"}}',
            parent: 'admin.home.publishers.list'
          }
        })
        .state('admin.home.publisherCatalogs', {
          'abstract': true,
          url: '/catalogs',
          template: '<ui-view/>'
        })
        .state('admin.home.publisherCatalogs.list', {
          url: '/list',
          templateUrl: '/components/home/catalogs-registry/catalogs-registry-list.html',
          controller: 'PublisherCatalogsListController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: 'Publisher Catalogs',
            parent: 'admin.landing'
          }
        })
        .state('admin.home.publisherCatalogs.edit', {
          url: '/edit/:id',
          templateUrl: '/components/home/catalogs-registry/catalogs-registry-edit.html',
          controller: 'PublisherCatalogsEditController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: '{{ctrl.record._id ? ctrl.record.name : "New Publisher Catalog"}}',
            parent: 'admin.home.publisherCatalogs.list'
          }
        })
        .state('admin.home.publisherCatalogVersions', {
          'abstract': true,
          url: '/versions',
          template: '<ui-view/>'
        })
        .state('admin.home.publisherCatalogVersions.list', {
          url: '/list',
          templateUrl: '/components/home/versions-registry/versions-registry-list.html',
          controller: 'PublisherCatalogVersionsListController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: 'Publisher Catalog Versions',
            parent: 'admin.landing'
          }
        })
        .state('admin.home.publisherCatalogVersions.edit', {
          url: '/edit/:id',
          templateUrl: '/components/home/versions-registry/versions-registry-edit.html',
          controller: 'PublisherCatalogVersionsEditController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: '{{ctrl.record._id ? ctrl.record.catalog.name + " by " + ctrl.record.publisher.name + ' +
            '"(" + ctrl.record.version + ")" : "New Publisher Catalog Version"}}',
            parent: 'admin.home.publisherCatalogVersions.list'
          }
        })
        .state('admin.profile', {
          url: '/profile',
          templateUrl: '/components/users/profile.html',
          controller: 'UserController',
          controllerAs: 'authCtrl'
        })
        .state('admin.playground', {
          url: '/playground',
          templateUrl: '/components/playground/cyper-editor.html',
          controller: 'CyperEditorController',
          controllerAs: 'ctrl',
          ncyBreadcrumb: {
            label: 'Playground',
            parent: 'admin.landing'
          }
        })
        .state('admin.importData', {
          url: '/import-data?importSession',
          templateUrl: 'components/collections/import-data/import-data-spreadsheet.html',
          controller: 'ImportDataSpreadsheetController',
          controllerAs: 'ctrl',
          data: {
            pageTitle: 'Import Data Spreadsheet',
            pageType: 'spreadsheet',
            pageParentTitle: 'Collection Import Sessions List',
            pageParentType: 'importSessions'
          }
        })

        //  AUTENTICATION
        .state('login', {
          url: '/login',
          templateUrl: '/components/auth/login/login.html',
          controller: 'UserController',
          data: {
            page: 'login',
            pageTitle: 'Login',
            specialClass: 'gray-bg'
          }
        })
        .state('register', {
          url: '/register',
          templateUrl: '/components/auth/signup/register.html',
          controller: 'UserController',
          data: {
            page: 'login',
            pageTitle: 'Register',
            specialClass: 'gray-bg'
          }
        })
        .state('forgot_password', {
          url: '/forgot_password',
          templateUrl: '/components/auth/forgot-password/forgot_password.html',
          controller: 'UserController',
          data: {
            page: 'login',
            pageTitle: 'Forgot password',
            specialClass: 'gray-bg'
          }
        })
        .state('error404', {
          url: '/error404',
          templateUrl: '/components/shared/errors/error404.html',
          data: {
            pageTitle: '404',
            specialClass: 'gray-bg'
          }
        })
        .state('error500', {
          url: '/error500',
          templateUrl: '/components/shared/errors/error500.html',
          data: {
            pageTitle: '500',
            specialClass: 'gray-bg'
          }
        });
    }]);
};
