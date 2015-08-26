angular.module('admin.services')
  .factory('OptionsHolder', ['Publishers', 'PublisherCatalogs', function (Publishers, PublisherCatalogs) {
    'use strict';

    var factory = {};

    factory.fillPublishers = function fillPublishers(cb) {
      return Publishers.get({}, function (resp) {
        return cb(resp.error, resp.data);
      });
    };

    factory.fillCatalogs = function fillCatalogs(cb) {
      return PublisherCatalogs.getData({}, function (err, resp) {
        return cb(err, resp.data);
      });
    };

    return factory;
  }]);
