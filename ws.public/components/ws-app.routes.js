angular.module('adminPanel')
  .config([
    '$state',
    function ($state) {
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
          templateUrl: '/views/index.html'
        })
        // todo: add states for each back end type Dimensions, Indicators etc. what actually make sense

        // AUTENTICATION
        .state('login', {
          url: '/login',
          templateUrl: 'views/login.html',
          controller: 'UserController',
          data: {
            page: 'login',
            pageTitle: 'Login',
            specialClass: 'gray-bg'
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
  ]);
