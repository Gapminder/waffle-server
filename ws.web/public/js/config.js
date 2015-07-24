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

  $locationProvider.html5Mode(true);
  $locationProvider.hashPrefix('!');

  //$urlRouterProvider.otherwise("/");
  //$urlRouterProvider.otherwise('/errorOne');

  //$ocLazyLoadProvider.config({
  //  // Set to true if you want to see what and when is dynamically loaded
  //  debug: true
  //});

  $stateProvider
    .state('app', {
      url: '/',
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
        isCookiesSet: ['$state', '$cookies', function ($state, $cookies) {
          console.log('test1', $state);

          if ($state.params.isloginPage) {
            return false;
          }

          if (!$cookies.Session || !$cookies.Session.user.isAdmin()) {
            $state.go('app.login', {isLoginPage: true});
            return false;
          }

          return true;
        }]
      }
    })
    .state('app.account', {
      url: '/account',
      template: '<ui-view />',
      controller: 'AuthController'
    })
    .state('app.login', {
      url: '/login',
      templateUrl: 'views/login.html',
      controller: 'UserController',
      data: {
        page: 'login',
        pageTitle: 'Login',
        specialClass: 'gray-bg'
      }
    })
    .state('app.login_two_columns', {
      url: '/login_two_columns',
      templateUrl: 'views/login_two_columns.html',
      controller: 'UserController',
      data: {
        page: 'login',
        pageTitle: 'Login two columns',
        specialClass: 'gray-bg'
      }
    })
    .state('app.register', {
      url: '/register',
      templateUrl: 'views/register.html',
      controller: 'UserController',
      data: {
        page: 'login',
        pageTitle: 'Register',
        specialClass: 'gray-bg'
      }
    })
    .state('app.lockscreen', {
      url: '/lockscreen',
      templateUrl: 'views/lockscreen.html',
      data: {
        pageTitle: 'Lockscreen',
        specialClass: 'gray-bg'
      }
    })
    .state('app.forgot_password', {
      url: '/forgot_password',
      templateUrl: 'views/forgot_password.html',
      controller: 'UserController',
      data: {
        page: 'login',
        pageTitle: 'Forgot password',
        specialClass: 'gray-bg'
      }
    })
    .state('app.errorOne', {
      url: '/errorOne',
      templateUrl: 'views/errorOne.html',
      data: {
        pageTitle: '404',
        specialClass: 'gray-bg'
      }
    })
    .state('app.errorTwo', {
      url: '/errorTwo',
      templateUrl: 'views/errorTwo.html',
      data: {
        pageTitle: '500',
        specialClass: 'gray-bg'
      }
    })
    .state('app.collections', {
      'abstract': true,
      url: '/collections',
      templateUrl: 'views/collections.html',
      resolve: {
        loadPlugin: function ($ocLazyLoad) {
          return $ocLazyLoad.load([{
            name: 'ngGrid', files: ['js/plugins/nggrid/ng-grid-2.0.3.min.js']
          }, {
            insertBefore: '#loadBefore', files: ['js/plugins/nggrid/ng-grid.css']
          }]);
        }
      }
    })
    .state('app.collections.list', {
      url: '/list',
      templateUrl: 'views/collectionsList.html',
      data: {
        pageTitle: 'Collections List'
      }
    })
    .state('app.collections.users', {
      url: '/users',
      templateUrl: 'views/collectionUsers.html',
      data: {
        pageTitle: 'Collection Users List'
      }
    })
    .state('app.collections.indicators', {
      url: '/indicators',
      templateUrl: 'views/collectionIndicators.html',
      data: {
        pageTitle: 'Collection Indicators List'
      }
    })
    .state('app.collections.sessions', {
      url: '/sessions',
      templateUrl: 'views/collectionSessions.html',
      data: {
        pageTitle: 'Collection Sessions List'
      }
    })
    .state('app.collections.dimensions', {
      url: '/dimensions',
      templateUrl: 'views/collectionDimensions.html',
      data: {
        pageTitle: 'Collection Dimensions List'
      }
    })
    .state('app.home', {
      url: '',
      templateUrl: '/views/index.html',
      resolve: {
        isCookiesSet: ['$state', '$cookies', function ($state, $cookies) {
          console.log('test2', $state);
          //if (!$cookies.Session || !$cookies.Session.user.isAdmin()) {
          //  $state.go('login');
          //  return false;
          //}
          //
        }]
      }
    });
}
angular.module('adminPanel')
  .config(['$locationProvider', '$stateProvider', '$urlRouterProvider', '$ocLazyLoadProvider', 'IdleProvider', config])
  .run(['$state', '$cookies', '$rootScope', function ($state, $cookies, $rootScope) {
    $rootScope.$on('$stateChangeError', function () {
      $state.go('errorTwo');
    });

    $rootScope.$on('$stateNotFound', function () {
      $state.go('errorOne');
    });
    //
    //$rootState.$state = $state;
  }]);
