module.exports = function (app) {
  app.directive('adminBreadcrumb', function () {
    return {
      template: '<br><div ncy-breadcrumb></div>'
    };
  });
};
