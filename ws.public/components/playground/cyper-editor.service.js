'use strict';

/**
 * Service that will run cyper queries
 */
angular.module('admin.services')
  .service('CyperEditorService', ['$resource', function ($resource) {
    /**
     * This object will be contain all information of this service
     * @type {Object}
     */
    var service = {
      runQuery: runQuery
    };

    var apiResource = $resource('/api/admin/cyper', {}, {
      runQuery: {method: 'POST'}
    });

    return service;

    ////////////

    function runQuery(params, cb) {
      apiResource.runQuery(params, function (resp) {
        return cb(resp.error, {data: resp.data}, resp);
      });
    }
  }]);
