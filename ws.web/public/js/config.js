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

  //$urlRouterProvider.otherwise('/errorOne');

  //$ocLazyLoadProvider.config({
  //  // Set to true if you want to see what and when is dynamically loaded
  //  debug: true
  //});

  $stateProvider
    .state('index', {
      url: '',
      templateUrl: 'views/content.html'
    })
    .state('login', {
      url: '/login',
      templateUrl: 'views/login.html',
      data: {
        pageTitle: 'Login',
        specialClass: 'gray-bg'
      }
    })
    .state('login_two_columns', {
      url: '/login_two_columns',
      templateUrl: 'views/login_two_columns.html',
      data: {
        pageTitle: 'Login two columns',
        specialClass: 'gray-bg'
      }
    })
    .state('register', {
      url: '/register',
      templateUrl: 'views/register.html',
      data: {
        pageTitle: 'Register',
        specialClass: 'gray-bg'
      }
    })
    .state('lockscreen', {
      url: '/lockscreen',
      templateUrl: 'views/lockscreen.html',
      data: {
        pageTitle: 'Lockscreen',
        specialClass: 'gray-bg'
      }
    })
    .state('forgot_password', {
      url: '/forgot_password',
      templateUrl: 'views/forgot_password.html',
      data: {
        pageTitle: 'Forgot password',
        specialClass: 'gray-bg'
      }
    })
    .state('errorOne', {
      url: '/errorOne',
      templateUrl: 'views/errorOne.html',
      data: {
        pageTitle: '404',
        specialClass: 'gray-bg'
      }
    })
    .state('errorTwo', {
      url: '/errorTwo',
      templateUrl: 'views/errorTwo.html',
      data: {
        pageTitle: '500',
        specialClass: 'gray-bg'
      }
    })
    .state('ui', {
      'abstract': true,
      url: '/ui',
      templateUrl: 'views/content.html'
    })
    .state('collections', {
      'abstract': true,
      url: '/collections',
      templateUrl: 'views/content.html'
    })
    .state('collections.list', {
      url: '/list',
      templateUrl: 'views/collectionsList.html',
      data: {
        pageTitle: 'Collections List'
      },
      resolve: {
        loadPlugin: function ($ocLazyLoad) {
          return $ocLazyLoad.load([{
            name: 'ngGrid', files: ['js/plugins/nggrid/ng-grid-2.0.3.min.js']
          }, {
            insertBefore: '#loadBefore', files: ['js/plugins/nggrid/ng-grid.css']
          }]);
        }
      }
    });
}
angular.module('adminPanel').config(['$locationProvider', '$stateProvider', '$urlRouterProvider', '$ocLazyLoadProvider', 'IdleProvider', config]).run(function ($rootScope, $state) {
  $rootScope.$state = $state;
});
