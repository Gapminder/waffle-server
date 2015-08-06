'use strict';

/**
 * Service that will get all imported data
 */
angular.module('admin.services')
  .service('ImportDataSpreadsheetService', ['$resource', function ($resource) {
    /**
     * This object will be contain all information of this service
     * @type {Object}
     */
    var service = {
      getData: getData
    };

    var apiResource = $resource('/api/admin/import-data');

    return service;

    ////////////

    function getData(params, cb) {
      apiResource.get(params, function (resp) {
        return cb(resp.error, resp.data, resp);
      });
    }
  }]);
