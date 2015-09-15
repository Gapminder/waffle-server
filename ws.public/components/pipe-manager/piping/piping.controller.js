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
        self.pipe.runStep(step, function (err) {
          safeApply(function () {
            step.error = err;
          });
        });
      };

      self.previewStep = function previewStep(step) {
        self.previews = self.previews || [];
        _.each(step.tables, function (table) {
          table.settings = createSettings(table.headers, self.pipe, step);
          self.previews.push(table);
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
            var self = this;
            self.ready = false;
            var file = this.options.file;
            FileService.load(file, function (err1, fileContent) {
              FileService.parse(file, fileContent, function (err2, tables) {
                self.tables = _.isArray(tables) ? tables : [tables];
                self.tables[0].active = true;
                self.ready = true;
                return cb(err1 || err2, tables);
              });
            });
          }
        },
        'extract_col_headers': {
          name: 'extract_col_headers',
          displayName: 'Extract column header',
          group: 'extract',
          sfx: true,
          action: function (cb) {
            try {
              this.ready = false;
              var table = this.options.table;
              table.headers = table.headers || {};
              table.headers.col = table.rows.shift();
              this.tables = [table];
              this.ready = true;
              cb(null, table);
            } catch (err) {
              cb(err);
            } finally {
              safeApply(_.noop);
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
        safeApply(_.noop);
        if (step.sfx === true) {
          step.action(function () {
            safeApply(_.noop);
          });
        }
        console.log(this);
        return this;
      };

      Pipe.prototype.createImportStep = function createImportStep(step, opts) {
        this.addStep(new Step(StepTypes.import_file.name, opts));
        return this;
      };

      Pipe.prototype.createExtractColHeaderStep = function createExtractColHeaderStep(step, opts) {
        var options = _.merge(opts || {}, {table: _.find(step.tables, {active: true})});
        // type: [row,col]
        this.addStep(new Step(StepTypes.extract_col_headers.name, options));
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
      function getSelectionType(selected) {
        var selection = _.isArray(selected) ? selected : [];
        if (selected.start && selected.end) {
          selection = [selected.start.row, selected.start.col,
            selected.end.row, selected.end.col];
        }
        // is cell startRow === endRow && startCol === endCol
        // is row: startRow === endRow
        // is column: startCol === endCol
        // is rectangle: else
        if (selection[0] === selection[2] && selection[1] === selection[3]) {
          return 'cell';
        }

        if (selection[0] === selection[2]) {
          return 'row';
        }

        if (selection[1] === selection[3]) {
          return 'col';
        }

        return 'rectangle';
      }

      /**
       * @param  {{row?:[], col?:[]}} headers
       * @param {Pipe} pipe
       * @param {step} step
       */
      function createSettings(headers, pipe, step) {
        /*eslint camelcase:0*/
        var settings = {
          height: 396,
          colWidths: 100,
          className: 'htCenter htMiddle',
          colHeaders: headers && headers.col || true,
          rowHeaders: headers && headers.row || true,
          readOnly: true,
          manualColumnFreeze: true,
          stretchH: 'all',
          columnSorting: true,
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
                  var selectionType = getSelectionType(selection);
                  if (selectionType === 'row') {
                    return pipe.createExtractColHeaderStep(step);
                  }
                },
                disabled: function () {
                  var hotSettings = this.getSettings();
                  var selectionType = getSelectionType(this.getSelected());
                  console.log(selectionType)
                  return selectionType !== 'row' || _.isArray(hotSettings.colHeaders);
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
              freeze_column: {}
            }
          }
        };

        if (_.isArray(settings.colHeaders)) {
          delete settings.contextMenu.items.set_as_header;
        }
        return settings;
      }
    }]);
};
