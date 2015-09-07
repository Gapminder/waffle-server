module.exports = function (app) {
  app
    .service('CollectionsService', ['$resource', function ($resource) {
      /**
       * This object will be contain all information of this service
       * @type {Object}
       */
      var service = {
        getData: getData
      };

      var apiResource = $resource('/api/admin/collections/:action:list', {action: '@action', list: '@list'});

      return service;

      function getData(params, cb) {
        apiResource.get(params, function (resp) {
          return cb(resp.error, {data: resp.data, totalItems: resp.totalItems}, resp);
        });
      }
    }]);
};
