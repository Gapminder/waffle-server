'use strict';

angular.module('adminPanel')
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
      .state('admin.home', {
        url: '',
        templateUrl: '/components/landing/landing.html',
        controller: 'MainController',
        controllerAs: 'mainCtrl'
      })
      .state('admin.profile', {
        url: '/profile',
        templateUrl: '/components/users/profile.html',
        controller: 'AuthController',
        controllerAs: 'authCtrl'
      })
      .state('admin.collections', {
        'abstract': true,
        url: '/collections',
        template: '<ui-view/>'
      })
      .state('admin.collections.list', {
        url: '/list',
        templateUrl: 'components/collections/collections.html',
        controller: 'CollectionsController',
        controllerAs: 'collectionsCtrl',
        data: {
          pageTitle: 'Collections List',
          //pageType: 'list'
        }
      })
      .state('admin.collections.users', {
        url: '/users',
        views: {
          '@': {
            templateUrl: 'components/collections/users/users-collection.html',
            controller: 'CollectionsController',
            controllerAs: 'collectionsCtrl'
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
            templateUrl: 'components/collections/data-sources-types/data-sources-types-collection.html',
            controller: 'CollectionsController',
            controllerAs: 'collectionsCtrl'
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
            templateUrl: 'components/collections/data-sources/data-sources-collection.html',
            controller: 'CollectionsController',
            controllerAs: 'collectionsCtrl'
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
            templateUrl: 'components/collections/import-data/import-data-collection.html',
            controller: 'CollectionsController',
            controllerAs: 'collectionsCtrl'
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
            templateUrl: 'components/collections/import-sessions/import-sessions-collection.html',
            controller: 'CollectionsController',
            controllerAs: 'collectionsCtrl'
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
            templateUrl: 'components/collections/analysis-sessions/analysis-sessions-collection.html',
            controller: 'CollectionsController',
            controllerAs: 'collectionsCtrl'
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
            templateUrl: 'components/collections/dimensions/dimensions-collection.html',
            controller: 'CollectionsController',
            controllerAs: 'collectionsCtrl'
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
            templateUrl: 'components/collections/dimension-values/dimension-values-collection.html',
            controller: 'CollectionsController',
            controllerAs: 'collectionsCtrl'
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
            templateUrl: 'components/collections/coordinates/coordinates-collection.html',
            controller: 'CollectionsController',
            controllerAs: 'collectionsCtrl'
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
            templateUrl: 'components/collections/indicators/indicators-collection.html',
            controller: 'CollectionsController',
            controllerAs: 'collectionsCtrl'
          }
        },
        data: {
          pageTitle: 'Collection Indicators List',
          pageType: 'indicators'
        }
      })
      .state('admin.collections.indicatorsValues', {
        url: '/indicators-values',
        views: {
          '@': {
            templateUrl: 'components/collections/indicators-values/indicators-values-collection.html',
            controller: 'CollectionsController',
            controllerAs: 'collectionsCtrl'
          }
        },
        data: {
          pageTitle: 'Collection Indicators Values List',
          pageType: 'indicatorsValues'
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
