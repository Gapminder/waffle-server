'use strict';

angular.module('admin')
  .config(function ($stateProvider) {
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
          isAdmin: ['$state', '$stateParams', function ($state, $stateParams) {
            // todo: use api request
            if (false) {
              $state.transitionTo('login');
              return false;
            }

            return true;
          }]
        }
      })
      .state('admin.landing', {
        url: '',
        templateUrl: '/components/landing/landing.html',
        controller: 'MainController',
        controllerAs: 'mainCtrl'
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
        data: {
          pageTitle: 'Publishers',
          pageType: 'list'
        }
      })
      .state('admin.home.publishers.catalogVersions', {
        url: '/catalog/:publisherId',
        templateUrl: '/components/home/publishers/publishers-catalog-versions.html',
        controller: 'PublishersCatalogVersionsController',
        controllerAs: 'ctrl',
        data: {
          pageTitle: 'Publishers',
          pageType: 'list'
        }
      })
      .state('admin.home.publishers.catalogVersionDetails', {
        url: '/version/:versionId',
        templateUrl: '/components/home/publishers/publishers-catalog-version-details.html',
        controller: 'PublishersCatalogVersionDetailsController',
        controllerAs: 'ctrl',
        data: {
          pageTitle: 'Publishers',
          pageType: 'list'
        }
      })
      .state('admin.home.publishers.dimensions', {
        url: '/dimensions/:versionId',
        templateUrl: '/components/home/publishers/details/detail-dimensions.html',
        controller: 'DetailDimensionsController',
        controllerAs: 'ctrl',
        data: {
          pageTitle: 'Publishers',
          pageType: 'list'
        }
      })
      .state('admin.home.publishers.indicators', {
        url: '/indicators/:versionId',
        templateUrl: '/components/home/publishers/details/detail-indicators.html',
        controller: 'DetailIndicatorsController',
        controllerAs: 'ctrl',
        data: {
          pageTitle: 'Publishers',
          pageType: 'list'
        }
      })
      .state('admin.home.publishers.stats', {
        url: '/stats/:versionId',
        templateUrl: '/components/home/publishers/details/detail-stats.html',
        controller: 'DetailStatsController',
        controllerAs: 'ctrl',
        data: {
          pageTitle: 'Publishers',
          pageType: 'list'
        }
      })
      .state('admin.home.publishers.edit', {
        url: '/edit/:id',
        templateUrl: '/components/home/publishers/publishers-edit.html',
        controller: 'PublishersEditController',
        controllerAs: 'ctrl',
        data: {
          pageTitle: 'Publisher'
        }
      })
      .state('admin.home.publisherCatalogs', {
        'abstract': true,
        url: '/publisher-catalogs',
        template: '<ui-view/>'
      })
      .state('admin.home.publisherCatalogs.list', {
        url: '/list',
        templateUrl: '/components/home/publisher-catalogs/publisher-catalogs-list.html',
        controller: 'PublisherCatalogsListController',
        controllerAs: 'ctrl',
        data: {
          pageTitle: 'Publisher Catalogs',
          pageType: 'list'
        }
      })
      .state('admin.home.publisherCatalogs.edit', {
        url: '/edit/:id',
        templateUrl: '/components/home/publisher-catalogs/publisher-catalogs-edit.html',
        controller: 'PublisherCatalogsEditController',
        controllerAs: 'ctrl',
        data: {
          pageTitle: 'Publisher Catalog'
        }
      })
      .state('admin.home.publisherCatalogVersions', {
        'abstract': true,
        url: '/publisher-catalog-versions',
        template: '<ui-view/>'
      })
      .state('admin.home.publisherCatalogVersions.list', {
        url: '/list',
        templateUrl: '/components/home/publisher-catalog-versions/publisher-catalog-versions-list.html',
        controller: 'PublisherCatalogVersionsListController',
        controllerAs: 'ctrl',
        data: {
          pageTitle: 'Publisher Catalog Versions',
          pageType: 'list'
        }
      })
      .state('admin.home.publisherCatalogVersions.edit', {
        url: '/edit/:id',
        templateUrl: '/components/home/publisher-catalog-versions/publisher-catalog-versions-edit.html',
        controller: 'PublisherCatalogVersionsEditController',
        controllerAs: 'ctrl',
        data: {
          pageTitle: 'Publisher Catalog Version'
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
        controllerAs: 'ctrl'
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
      .state('admin.collections', {
        'abstract': true,
        url: '/collections',
        template: '<ui-view/>'
      })
      .state('admin.collections.list', {
        url: '/list',
        templateUrl: 'components/collections/collections.html',
        controller: 'CollectionsBreadcrumbController',
        controllerAs: 'ctrl',
        data: {
          pageTitle: 'Collections List',
          pageType: 'list'
        }
      })
      .state('admin.collections.users', {
        url: '/users',
        views: {
          '@': {
            templateUrl: 'components/collections/users/users-collection.html'
          }
        },
        data: {
          pageTitle: 'Collection Users List',
          pageType: 'users'
        }
      })
      .state('admin.collections.dataSourceTypes', {
        url: '/data-source-types',
        views: {
          '@': {
            templateUrl: 'components/collections/data-sources-types/data-sources-types-collection.html'
          }
        },
        data: {
          pageTitle: 'Collection Data Source Types List',
          pageType: 'dataSourceTypes'
        }
      })
      .state('admin.collections.dataSources', {
        url: '/data-sources',
        views: {
          '@': {
            templateUrl: 'components/collections/data-sources/data-sources-collection.html'
          }
        },
        data: {
          pageTitle: 'Collection Data Sources List',
          pageType: 'dataSources'
        }
      })
      .state('admin.collections.importData', {
        url: '/import-data',
        views: {
          '@': {
            templateUrl: 'components/collections/import-data/import-data-collection.html'
          }
        },
        data: {
          pageTitle: 'Collection Import Data List',
          pageType: 'importData'
        }
      })
      .state('admin.collections.importSessions', {
        url: '/import-sessions',
        views: {
          '@': {
            templateUrl: 'components/collections/import-sessions/import-sessions-collection.html'
          }
        },
        data: {
          pageTitle: 'Collection Import Sessions List',
          pageType: 'importSessions'
        }
      })
      .state('admin.collections.analysisSessions', {
        url: '/analysis-sessions',
        views: {
          '@': {
            templateUrl: 'components/collections/analysis-sessions/analysis-sessions-collection.html'
          }
        },
        data: {
          pageTitle: 'Collection Analysis Sessions List',
          pageType: 'analysisSessions'
        }
      })
      .state('admin.collections.dimensions', {
        url: '/dimensions',
        views: {
          '@': {
            templateUrl: 'components/collections/dimensions/dimensions-collection.html'
          }
        },
        data: {
          pageTitle: 'Collection Dimensions List',
          pageType: 'dimensions'
        }
      })
      .state('admin.collections.dimensionValues', {
        url: '/dimension-values',
        views: {
          '@': {
            templateUrl: 'components/collections/dimension-values/dimension-values-collection.html'
          }
        },
        data: {
          pageTitle: 'Collection Dimension Values List',
          pageType: 'dimensionValues'
        }
      })
      .state('admin.collections.coordinates', {
        url: '/coordinates',
        views: {
          '@': {
            templateUrl: 'components/collections/coordinates/coordinates-collection.html'
          }
        },
        data: {
          pageTitle: 'Collection Coordinates List',
          pageType: 'coordinates'
        }
      })
      .state('admin.collections.indicators', {
        url: '/indicators',
        views: {
          '@': {
            templateUrl: 'components/collections/indicators/indicators-collection.html'
          }
        },
        data: {
          pageTitle: 'Collection Indicators List',
          pageType: 'indicators'
        }
      })
      .state('admin.collections.indicatorValues', {
        url: '/indicator-values',
        views: {
          '@': {
            templateUrl: 'components/collections/indicator-values/indicator-values-collection.html'
          }
        },
        data: {
          pageTitle: 'Collection Indicator Values List',
          pageType: 'indicatorValues'
        }
      })

      // AUTENTICATION
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
      .state('login_two_columns', {
        url: '/login_two_columns',
        templateUrl: '/components/auth/login/login_two_columns.html',
        controller: 'UserController',
        data: {
          page: 'login',
          pageTitle: 'Login two columns',
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
  });
