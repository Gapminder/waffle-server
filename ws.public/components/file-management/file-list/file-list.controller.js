var _ = require('lodash');
var async = require('async');
var papa = require('papaparse');
var XLSX = require('xlsx');
var angular = require('angular');

module.exports = function (app) {
  app
    .controller('FileListController', [
      '$scope', '$state', 'FileResources', 'FileService',
      function ($scope, $state, FileResources, FileService) {
        var self = this;
        self.model = {search: ''};
        self.currentData = [];
        self.limit = 10;
        self.paging = {currentPage: 1};

        self.search = search;
        self.preview = preview;

        active();

        function active(isForce) {
          search(isForce);
        }

        function search(isForce) {
          var query = {
            skip: (self.paging.currentPage - 1) * self.limit,
            limit: self.limit
          };

          if (self.model.search) {
            query.search = self.model.search;
          }

          if (isForce) {
            query.force = true;
          }

          FileResources.list(query, function updateList(err, resp) {
            if (err) {
              console.error(err);
              return;
            }

            self.currentData = resp.files;
            self.totalItems = resp.count;
          });
        }

        function safeApplyW(pipe, cb) {
          if ($scope.$$phase) {
            console.log($scope.$$phase);
            return cb(null, pipe);
          }
          $scope.$apply(function () {
            setTimeout(function () {
              return cb(null, pipe);
            }, 50);
          });
        }

        function preview(file) {
          self.table = null;
          if (['.csv', '.xls', '.xlsx'].indexOf(file.ext) === -1) {
            setTimeout(function () {
              if (confirm('File format ' + file.ext + 'not yet supported,' +
                  'open it in new tab?')) {
                window.open(file.uri, '_blank');
              }
            }, 0);
            return;
          }

          async.waterfall([
            function init(cb) {
              console.time('Loading');
              file.loading = true;
              return cb(null, {file: file});
            },
            function loading(pipe, cb) {
              FileService.load(pipe.file, function (err, fileContent) {
                pipe.fileContent = fileContent;
                return cb(err, pipe);
              });
            },
            function next(pipe, cb) {
              pipe.file.loading = false;
              console.timeEnd('Loading');
              console.time('Parsing');
              pipe.file.parsing = true;
              return cb(null, pipe);
            },
            safeApplyW,
            function parsing(pipe, cb) {
              FileService.parse(pipe.file, pipe.fileContent, function (err, tables) {
                pipe.tables = tables;
                pipe.tables = _.map(pipe.tables, function (table) {
                  return FileService.recognizeHeaders(pipe.file, table);
                });
                return cb(err, pipe);
              });
            },
            function next(pipe, cb) {
              pipe.file.parsing = false;
              console.timeEnd('Parsing');
              console.time('Rendering');
              return cb(null, pipe);
            },
            safeApplyW,
            function rendering(pipe, cb) {
              render(pipe.tables, function () {
                console.timeEnd('Rendering');
                return cb(null, pipe);
              });
            },
            safeApplyW
          ], angular.noop);
        }
        // create settings for table
        function createSettings(headers) {
          return {
            height: 400,
            colWidths: 100,
            rowHeaders: true,
            stretchH: 'all',
            columnSorting: true,
            contextMenu: false,
            className: 'htCenter htMiddle',
            readOnly: false,
            colHeaders: headers
          };
        }

        // requires self and $scope
        // tables: [{name:string, headers:[string], rows: [string]]
        function render(tables, cb) {
          self.tables = _.map(tables, function (table) {
            return {
              name: table.name,
              rows: table.rows,
              settings: createSettings(table.headers && {col: table.headers.col})
            };
          });
          return cb();
        }
      }
    ]);
};
