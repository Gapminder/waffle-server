module.exports = function (app) {
  app
    .constant('IndexTreeSettings', {
      INDEX_TREE: 'http://localhost:8009/api/vizabi/index-tree',
      INDEX_DB: 'http://localhost:8007/api/vizabi/index-db',
      INDEX_TREE_READ_ONLY: 'http://localhost:8009/api/vizabi/index-tree/read-only'
    })
    .controller('IndexTreeController', [
      '$state', '$http', '$modal', 'IndexTreeSettings',
      function ($state, $http, $modal, IndexTreeSettings) {
        var self = this;

        self.alerts = [];

        self.closeAlert = function(index) {
          self.alerts.splice(index, 1);
        };

        self.remove = function remove(scope) {
          scope.remove();
        };

        self.toggle = function toggle(scope) {
          scope.toggle();
        };

        self.refresh = function refresh() {
          location.href = location.href;
        };

        self.save = function save() {
          var r = JSON.parse(JSON
            .stringify(self.data)
            .replace(/,?"..hashKey":"object:[0-9]+"/g, ''));

          var res = $http.put(IndexTreeSettings.INDEX_TREE, r[0]);
          res.success(function (data) {
            self.alerts.push({type: 'success', msg: 'Tree was saved successfully.'});
          });
          res.error(function (data, status, headers, config) {
            self.alerts.push({type: 'danger', msg: data.error.replace(/\\n/g, '<br>')});
          });
        };

        self.openIndicators = function openIndicators(current) {
          var modalInstance = $modal.open({
            templateUrl: 'indexTreeIndicators.html',
            controller: 'IndexAddIndicatorsController as vm',
            resolve: {
              indexDb: self.indexDb
            }
          });

          modalInstance.result.then(function (data) {
            var nodeData = current.$modelValue;

            if (!nodeData.children) {
              nodeData.children = [];
            }

            _.each(data, function (item) {
              nodeData.children.push({
                id: item,
                children: []
              });
            });
          });
        };

        self.openGroup = function openGroup(current) {
          var modalInstance = $modal.open({
            templateUrl: 'indexTreeGroup.html',
            controller: 'IndexAddGroupController as vmg'
          });

          modalInstance.result.then(function (data) {
            var nodeData = current.$modelValue;

            if (!nodeData.children) {
              nodeData.children = [];
            }

            nodeData.children.push({
              id: data,
              children: []
            });
          });
        };

        self.removeRow = function removeRow(scope, id) {
          if (!self.isReadOnly(id)) {
            $modal.open({
              templateUrl: 'removeRow.html',
              controller: 'DeleteController as vmr',
              resolve: {
                global: {
                  remove: self.remove,
                  row: scope
                }
              }
            });
          }
        };

        self.isReadOnly = function isReadOnly(key) {
          return self.readOnly.indexOf(key) >= 0;
        };

        $http.get(IndexTreeSettings.INDEX_DB).then(function (response) {
          self.indexDb = response.data.data.indicatorsDB;
          $http.get(IndexTreeSettings.INDEX_TREE_READ_ONLY).then(function (response) {
            self.readOnly = response.data.data;
            $http.get(IndexTreeSettings.INDEX_TREE).then(function (response) {
              self.data = [response.data.data.indicatorsTree];
            });
          });
        });
      }
    ])
    .controller('DeleteController', ['$modalInstance', 'global', function ($modalInstance, global) {
      var vmr = this;
      vmr.remove = remove;
      vmr.close = close;

      function remove() {
        global.remove(global.row);
        close();
      }

      function close() {
        $modalInstance.close();
      }
    }])
    .controller('IndexAddIndicatorsController', ['$modalInstance', 'indexDb', function ($modalInstance, indexDb) {
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
    }])
    .controller('IndexAddGroupController', ['$modalInstance', function ($modalInstance) {
      var vm = this;
      vm.save = save;
      vm.close = close;

      vm.data = {
        name: ''
      };

      function save() {
        $modalInstance.close(vm.data.name);
      }

      function close() {
        $modalInstance.close();
      }
    }]);
};
