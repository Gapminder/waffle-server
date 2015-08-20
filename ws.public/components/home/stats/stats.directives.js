angular.module('admin.services')
  .directive('visabiChart', ['$compile', 'Chart',
    function ($compile, Chart) {
      return {
        restrict: 'AE',
        scope: true,
        link: function (scope, element, attr) {
          var elementId = 'placeholder-' + attr.type + '-' + attr.indicator;
          element.append($compile('<div class="placeholder" id="' + elementId + '"></div>')(scope));

          var options = {
            bar: function bar() {
              Chart.get({
                versionId: attr.version,
                indicatorId: attr.indicator
              }, function (resp) {
                Vizabi('BarChart', document.getElementById(elementId), {
                  data: {
                    reader: 'inline',
                    data: resp.data
                  },
                  state: {
                    entities: {
                      show: {
                        dim: 'geo',
                        filter: {'geo': ['*']}
                      }
                    },
                    marker: {
                      label: {
                        use: 'property',
                        which: 'geo'
                      },
                      color: {
                        use: 'property',
                        which: 'geo'
                      },
                      axis_y: {
                        use: 'indicator',
                        which: 'score'
                      },
                      axis_x: {
                        use: 'property',
                        which: 'geo'
                      }
                    }
                  }
                });
              });
            },
            line: function line() {
              Vizabi('LineChart', document.getElementById(elementId), {
                data: {
                  reader: 'csv-file',
                  path: '/api/admin/chartcsv/xx/xx'
                }
              });
            },
            bubble: function bubble() {
              Vizabi('BubbleChart', document.getElementById(elementId), {
                data: {
                  reader: 'csv-file',
                  path: '/api/admin/chartcsv/xx/xx'
                }
              });
            }
          };

          options[attr.type]();
        }
      };
    }]);