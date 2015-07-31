'use strict';

angular.module('admin.controllers').controller('CyperEditorController', ['CyperEditorService', '$scope', function CyperEditorController(CyperEditorService, $scope) {
  var self = this;
  self.choosePattern = choosePattern;
  self.cleanQuery = cleanQuery;
  self.runQuery = runQuery;
  self.loadingQuery = false;
  self.data = {};

  self.patterns = {
    MATCH: [
      'MATCH (n:XXX)-[:YYY]->(m:XXX) WHERE n.name=""',
      'MATCH (n)-->(m)',
      'MATCH (n {name:""})-->(m)',
      'MATCH p = (n)-->(m)',
      'OPTIONAL MATCH (n)-[r]->(m)'
    ],
    WHERE: [
      'WHERE  n.property <> {value}'
    ]
  };

  $scope.query = '';

  function choosePattern (pattern) {
    var cursorPosition = $('#query').prop('selectionEnd');
    console.log(cursorPosition);
    console.log($scope.query);
    var text = $scope.query;
    $scope.query = [text.substr(0, cursorPosition), pattern, text.substr(cursorPosition)].join('');
  }

  function cleanQuery () {
    $scope.query = '';
  }

  function runQuery () {
    self.loadingQuery = true;

    CyperEditorService.runQuery({query: $scope.query}, function(data) {
      self.data = data;
      self.loadingQuery = false;
    });
  }
}]);
