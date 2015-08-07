'use strict';

angular.module('admin.controllers').controller('CyperEditorController', ['CyperEditorService', '$scope', function CyperEditorController(CyperEditorService, $scope) {
  var self = this;
  self.choosePattern = choosePattern;
  self.cleanQuery = cleanQuery;
  self.runQuery = runQuery;
  self.loadingQuery = false;
  self.data = {};

  // ugly
  self.hostname = window.location.hostname;

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

  $scope.query = "// get all data for 4 indicators\n" +
  "MATCH (i1:Indicators)-[]->(:Dimensions{name: 'year'})-[]->(dv1:DimensionValues)-[]->(iv1:IndicatorValues),\n" +
  "(:Dimensions)-[]->(dv2:DimensionValues)-[]->(iv1:IndicatorValues)\n" +
  "where i1.name in ['GNIpercapita_atlasmethod_current_US', 'Children_per_woman_total_fertility',\n" +
  "'CO2_emissions_tonnes_per_person', 'Life_expectancy_years']\n" +
  "RETURN collect(i1.title) as indicator,dv1.value as year, dv2.value as country, collect(iv1.value) as value\n" +
  "order by year\n";

  function choosePattern (pattern) {
    var cursorPosition = $('#query').prop('selectionEnd');
    var text = $scope.query;
    $scope.query = [text.substr(0, cursorPosition), pattern, text.substr(cursorPosition)].join('');
  }

  function cleanQuery () {
    $scope.query = '';
  }

  function runQuery () {
    self.loadingQuery = true;
    var start = Date.now();
    CyperEditorService.runQuery({query: $scope.query}, function(error, data) {
      var end = Date.now();
      self.data = error || data;
      self.loadingQuery = false;
      self.timeDelta = end - start;
    });
  }
}]);
