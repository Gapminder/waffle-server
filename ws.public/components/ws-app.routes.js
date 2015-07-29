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
      // todo: add states for each back end type Dimensions, Indicators etc. what actually make sense

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
