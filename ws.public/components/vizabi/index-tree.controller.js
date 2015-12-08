module.exports = function (app) {
  app
    .controller('IndexTreeController', [
      '$state', '$http', '$modal',
      function ($state, $http, $modal) {
        var self = this;

        self.remove = function (scope) {
          scope.remove();
        };

        self.toggle = function (scope) {
          scope.toggle();
        };

        self.save = function () {
          var r = JSON.parse(JSON
            .stringify(self.data)
            .replace(/"title":/g, '"id":')
            .replace(/"nodes":/g, '"children":')
            .replace(/,?"..hashKey":"object:[0-9]+"/g, ''));

          var res = $http.put('http://localhost:8009/api/vizabi/index-tree', r[0]);
          res.success(function (data) {
            console.log(1, data);
          });
          res.error(function (data, status, headers, config) {
            console.log(2, data, status, headers, config);
          });
        };

        self.open = function open(current) {
          var modalInstance = $modal.open({
            templateUrl: 'indexTreeEdit.html',
            controller: 'IndexEditTreeController as vm',
            resolve: {
              indexDb: self.indexDb
            }
          });

          modalInstance.result.then(function (data) {
            var nodeData = current.$modelValue;

            if (!nodeData.nodes) {
              nodeData.nodes = [];
            }

            _.each(data, function (item) {
              nodeData.nodes.push({
                title: item,
                nodes: []
              });
            });
          });
        };

        $http.get('http://localhost:8007/api/vizabi/index-db').then(function (response) {
          self.indexDb = response.data.data.indicatorsDB;

          $http.get('http://localhost:8009/api/vizabi/index-tree').then(function (response) {
            var r = JSON.parse(
              JSON.stringify(response.data.data)
                .replace(/"id":/g, '"title":')
                .replace(/"children":/g, '"nodes":')
            );
            self.data = [r.indicatorsTree];
          });
        });
      }
    ])
    .controller('IndexEditTreeController', ['$modalInstance', 'indexDb', function ($modalInstance, indexDb) {
      var vm = this;
      vm.save = save;
      vm.close = close;

      vm.indexDb = _.keys(indexDb).map(function (k) {
        return {name: k, isChecked: false};
      });

      function save() {
        var res = _
          .filter(vm.indexDb, function (item) {
            return item.isChecked === true;
          })
          .map(function (item) {
            return item.name;
          });
        $modalInstance.close(res);
      }

      function close() {
        $modalInstance.close();
      }
    }]);
};
