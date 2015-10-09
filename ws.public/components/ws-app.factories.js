module.exports = function (app) {
  app
    .factory('OptionsHolder', [
      'Publishers', 'PublisherCatalogs',
      function (Publishers, PublisherCatalogs) {

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
};
