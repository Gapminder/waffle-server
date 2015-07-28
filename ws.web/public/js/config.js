'use strict';

/**
 * INSPINIA - Responsive Admin Theme
 *
 * Inspinia theme use AngularUI Router to manage routing and views
 * Each view are defined as state.
 * Initial there are written state for all view in theme.
 *
 */
function config($locationProvider, $stateProvider, $urlRouterProvider, $ocLazyLoadProvider, IdleProvider) {
  // Configure Idle settings
  // in seconds
  IdleProvider.idle(5);
  IdleProvider.timeout(120);

  $locationProvider.html5Mode({
    enabled: true,
    requireBase: false
  });
  $locationProvider.hashPrefix('!');

  $urlRouterProvider.otherwise("/admin");
  //$urlRouterProvider.otherwise('/errorOne');

  //$ocLazyLoadProvider.config({
  //  // Set to true if you want to see what and when is dynamically loaded
  //  debug: true
  //});

  $stateProvider
    .state('admin', {
      url: '/admin',
      abstract: true,
      views: {
        '@': {
          template: '<ui-view />'
        },
        topnavbar: {
          templateUrl: '/views/topnavbar.html'
        },
        navigation: {
          templateUrl: '/views/navigation.html'
        }
      },
      resolve: {
        isCookiesSet: ['$state', '$stateParams', '$cookies', function ($state, $stateParams, $cookies) {
          console.log('test1', $state, $stateParams, $cookies);

          if (!$cookies.Session || !$cookies.Session.user || !$cookies.Session.user.isAdmin()) {
            console.log('fdhj');
            $state.transitionTo('login');
            return false;
          }

          return true;
        }]
      }
    })
    .state('admin.home', {
      url: '',
      templateUrl: '/views/index.html'
    })
    .state('admin.account', {
      url: '/account',
      templateUrl: '/views/index.html',
      controller: 'AuthController'
    })
    .state('admin.collections', {
      'abstract': true,
      url: '/collections',
      template: '<ui-view/>',
      //templateUrl: 'views/collections.html',
      //
      resolve: {
        loadPlugin: function ($ocLazyLoad) {
          return $ocLazyLoad.load([{
            name: 'ngGrid', files: ['js/libs/plugins/nggrid/ng-grid-2.0.3.min.js']
          }, {
            insertBefore: '#loadBefore', files: ['/js/libs/plugins/nggrid/ng-grid.css']
          }]);
        }
      }
    })
    .state('admin.collections.list', {
      url: '/list',
      templateUrl: 'views/collectionsList.html',
      data: {
        pageTitle: 'Collections List',
        pageType: 'list'
      }
    })
    .state('admin.collections.collection', {
      url: '/:type',
      views: {
        '@': {
          templateUrl: 'views/collectionsList.html',
          controller: 'MainController'
        }
      }
    })
    // AUTENTICATION
    .state('login', {
      url: '/login',
      templateUrl: 'views/login.html',
      controller: 'UserController',
      data: {
        page: 'login',
        pageTitle: 'Login',
        specialClass: 'gray-bg',
      }
    })
    .state('login_two_columns', {
      url: '/login_two_columns',
      templateUrl: 'views/login_two_columns.html',
      controller: 'UserController',
      data: {
        page: 'login',
        pageTitle: 'Login two columns',
        specialClass: 'gray-bg',
      }
    })
    .state('register', {
      url: '/register',
      templateUrl: 'views/register.html',
      controller: 'UserController',
      data: {
        page: 'login',
        pageTitle: 'Register',
        specialClass: 'gray-bg',
      }
    })
    .state('forgot_password', {
      url: '/forgot_password',
      templateUrl: 'views/forgot_password.html',
      controller: 'UserController',
      data: {
        page: 'login',
        pageTitle: 'Forgot password',
        specialClass: 'gray-bg',
      }
    })
    // ERRORS AND LOCKS
    .state('lockscreen', {
      url: '/lockscreen',
      templateUrl: 'views/lockscreen.html',
      data: {
        pageTitle: 'Lockscreen',
        specialClass: 'gray-bg'
      }
    })
    .state('error404', {
      url: '/error404',
      templateUrl: 'views/error404.html',
      data: {
        pageTitle: '404',
        specialClass: 'gray-bg'
      }
    })
    .state('error500', {
      url: '/error500',
      templateUrl: 'views/error500.html',
      data: {
        pageTitle: '500',
        specialClass: 'gray-bg'
      }
    });
}

angular.module('adminPanel')
  .config(['$locationProvider', '$stateProvider', '$urlRouterProvider', '$ocLazyLoadProvider', 'IdleProvider', config])
  .run(['$state', '$stateParams', '$cookies', '$rootScope', function ($state, $stateParams, $cookies, $rootScope) {
    $rootScope.$on('$stateChangeError', function () {
      $state.go('error500');
    });

    $rootScope.$on('$stateNotFound', function () {
      $state.go('error404');
    });
    //
    $rootScope.$state = $state;
    $rootScope.$stateParams = $stateParams;
  }]);
