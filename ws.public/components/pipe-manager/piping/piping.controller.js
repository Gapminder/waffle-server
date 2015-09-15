var _ = require('lodash');

module.exports = function (app) {
  app.controller('PipingController', [
    '$scope', 'FileResources', 'FileService',
    function ($scope, FileResources, FileService) {
      var self = this;
      // test data, todo: replaces with services load\parse
      self.pipe = new Pipe();
      self.onChange = function () {
        if (!self.pipe) {
          self.result = self.error = null;
          return;
        }
        /* eslint no-new-func: 0*/
        try {
          var fn = new Function('self', self.pipe);
          self.result = fn(self);
          self.error = null;
        } catch (e) {
          self.error = e;
        }
      };

      // todo: as service
      self.refresh = function refresh(type, search) {
        FileResources.list({search: search}, function (err, data) {
          self.files = data.files;
        });
      };

      function safeApply(cb) {
        if ($scope.$$phase) {
          return cb();
        }
        $scope.$apply(cb);
      }

      // pipes related
      self.runStep = function runStep(step) {
        step.ready = false;
        self.pipe.runStep(step, function (err) {
          safeApply(function () {
            step.ready = !err;
            step.error = err;
          });
        });
      };

      self.previewStep = function previewStep(step) {
        var data = self.pipe.getStepData(step);
        if (!data) {
          return;
        }

        self.previews = _.map(_.isArray(data) ? data : [data], function (table) {
          // if type === table
          return {
            name: table.name,
            settings: createSettings({col: table.headers}, self.pipe, step),
            rows: table.rows
          };
        });
      };

      // todo: make as configurable Service Locator
      var StepTypes = {
        'import_file': {
          name: 'import_file',
          displayName: 'Import file',
          group: 'import',
          fields: ['uri', 'name', 'ext'],
          action: function loadFile(cb) {
            var file = this.options.file;
            FileService.load(file, function (err1, fileContent) {
              FileService.parse(file, fileContent, function (err2, tables) {
                return cb(err1 || err2, tables);
              });
            });
          }
        },
        'extract_col_headers': {
          name: 'extract_col_headers',
          displayName: 'Extract column header',
          group: 'extract',
          action: function (cb) {
            try {
              var table = this.options.table;
              table.headers = table.headers || {};
              table.headers.col = table.rows.shift();
              return cb(null, table);
            } catch (err) {
              return cb(err);
            }
          }
        },
        'extract_row_headers': {
          name: 'extract_row_headers',
          displayName: 'Extract row header',
          group: 'extract',
          action: function (cb) {
            try {
              var table = this.options.table;
              table.headers = table.headers || {};
              table.headers.row = _.map(table.rows, function (row) {
                return row.shift();
              });
              return cb(null, table);
            } catch (err) {
              return cb(err);
            }
          }
        }
      };

      // extract to factory?
      function Step(type, opts) {
        if (!(type in StepTypes)) {
          throw new Error('Not supported step type: ' + type);
        }
        // id? serialize!
        this.index = -1;
        _.merge(this, StepTypes[type]);
        this.options = opts || {};
        this.ready = null;
      }

      Step.prototype.run = function run(cb) {
        // check this group?
        // validate options?
        return this.action(cb);
        // throw new Error('[Step] Not found step run action for type: ' + this.type);
      };

      function Pipe() {
        this.pipe = {};
        this.steps = [];
      }

      Pipe.prototype.addStep = function (step) {
        step.index = this.steps.length;
        this.steps.push(step);
        return this;
      };

      Pipe.prototype.createImportStep = function createImportStep(step, opts) {
        this.addStep(new Step(StepTypes.import_file.name, opts));
        return this;
      };

      Pipe.prototype.createExtractRowHeaderStep = function createExtractRowHeaderStep(step, opts) {
        // type: [row,col]
        this.addStep(new Step(StepTypes.extract_row_headers.name, opts));
        return this;
      };

      Pipe.prototype.createExtractColHeaderStep = function createExtractColHeaderStep(step, opts) {
        // type: [row,col]
        this.addStep(new Step(StepTypes.extract_col_headers.name, opts));
        return this;
      };

      Pipe.prototype.runStep = function runStep(step, cb) {
        var selfPipe = this;
        step.run(function (err, res) {
          selfPipe.setStepData(step, res);
          return cb(err, res);
        });
        return this;
      };

      Pipe.prototype.setStepData = function setStepData(step, data) {
        this.pipe[step.name] = this.pipe[step.name] || {};
        this.pipe[step.name][step.index] = data;
      };

      Pipe.prototype.getStepData = function setStepData(step) {
        return this.pipe[step.name] && this.pipe[step.name][step.index];
      };

      // warning duplicates from file-manager!
      // todo: DRY them out
      function getSelectionType(selection) {
        // is cell startRow === endRow && startCol === endCol
        // is row: startRow === endRow
        // is column: startCol === endCol
        // is rectangle: else
        if (selection.start.row === selection.end.row && selection.end.col === selection.start.col) {
          return 'cell';
        }

        if (selection.start.row === selection.end.row) {
          return 'row';
        }

        if (selection.end.col === selection.start.col) {
          return 'col';
        }

        return 'rectangle';
      }

      /**
       * @param headers {row:[], col:[]}
       */
      function createSettings(headers, pipe, step) {
        /*eslint camelcase:0*/
        return {
          height: 400,
          colWidths: 100,
          stretchH: 'all',
          columnSorting: true,
          dropdownMenu: true,
          contextMenu: {
            callback: function (key, options) {
              if (key === 'about') {
                setTimeout(function () {
                  // timeout is used to make sure the menu collapsed before alert is shown
                  alert("This is a context menu with default and custom options mixed");
                }, 100);
              }
            },
            items: {
              set_as_header: {
                name: 'Set as header',
                callback: function (key, selection) {
                  window.a = this;

                  var selectionType = getSelectionType(selection);
                  if (selectionType !== 'col' && selectionType !== 'row') {
                    return alert('Please select row or column to set as a header');
                  }

                  if (this.hasRowHeaders() && selectionType === 'row') {
                    // confirm and replace?
                    return alert('Row headers already set');
                  }

                  if (this.hasColHeaders() && selectionType === 'col') {
                    // confirm and replace?
                    return alert('Col headers already set');
                  }

                  console.log(this);
                },
                visible: function () {
                  return !(this.hasRowHeaders() && this.hasColHeaders());
                }
              },
              recognize_data: {
                name: 'Recognize data',
                callback: function (key, selection) {
                  console.log(arguments)
                  // [startRow, startCol, endRow, endCol]
                  var selected = this.getSelected();
                  // is cell startRow === endRow && startCol === endCol
                  // is row: startRow === endRow
                  // is column: startCol === endCol
                  // is rectangle: else
                  var selectedData = this.getData.apply(this, selected);
                  var self = this;
                  setTimeout(function () {
                    self.selectCellByProp(selection.start.row, selection.start.col,
                      selection.end.row, selection.end.col, false);
                  }, 150);

                  window.a = this;
                }
              },
              row_above: {
                disabled: function () {
                  // if first row, disable this option
                }
              },
              row_below: {},
              hsep1: '---------',
              remove_row: {
                name: 'Remove this row, ok?',
                disabled: function () {
                  // if first row, disable this option
                }
              },
              hsep2: '---------',
              about: {name: 'About this menu'}
            }
          },
          className: 'htCenter htMiddle',
          readOnly: false,
          colHeaders: headers || true,
          rowHeaders: true
        };
      }
    }]);
};
