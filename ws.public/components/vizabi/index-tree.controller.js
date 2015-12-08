module.exports = function (app) {
  app
    .controller('IndexTreeController', [
      '$state', '$http',
      function ($state, $http) {
        var self = this;

        self.remove = function (scope) {
          scope.remove();
        };

        self.toggle = function (scope) {
          scope.toggle();
        };

        self.moveLastToTheBeginning = function () {
          var a = self.data.pop();
          self.data.splice(0, 0, a);
        };

        self.newSubItem = function (scope) {
          var nodeData = scope.$modelValue;
          nodeData.nodes.push({
            id: nodeData.id * 10 + nodeData.nodes.length,
            title: nodeData.title + '.' + (nodeData.nodes.length + 1),
            nodes: []
          });
        };

        self.collapseAll = function () {
          self.$broadcast('collapseAll');
        };

        self.expandAll = function () {
          self.$broadcast('expandAll');
        };

        $http.get('http://localhost:8009/api/vizabi/index-tree').then(function (response) {
          self.data = JSON.parse(
            JSON.stringify(response.data.data)
              .replace(/"id":/g, '"title":')
              .replace(/"children":/g, '"nodes":')
          );
        });
      }
    ]);
};
