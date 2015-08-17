angular.module('admin.services')
  .factory('OptionsHolder', ['Publishers', 'PublisherCatalogs', function (Publishers, PublisherCatalogs) {
    var factory = {};

    factory.fillPublishers = function fillPublishers(cb) {
      return Publishers.get({}, function (resp) {
        if (resp.error) {
          return cb(resp.error);
        }

        return cb(null, resp.data);
      });
    };

    factory.fillCatalogs = function fillCatalogs(cb) {
      return PublisherCatalogs.get({}, function (resp) {
        if (resp.error) {
          return cb(resp.error);
        }

        return cb(null, resp.data);
      });
    };

    return factory;
  }]);