var _ = require('lodash');

/** Table
 * @type Table
 * @member {String} name
 * @member {{col:[string], row:[string]}=} headers
 * @member {[[string]]} rows
 */

module.exports = function (app) {
  app.controller('PipingController', [
    '$scope', '$resource', 'FileResources', 'FileService',
    function ($scope, $resource, FileResources, FileService) {
      // todo: make as configurable Service Locator
      var StepTypes = {
        'import_file': {
          name: 'import_file',
          displayName: 'Import file',
          defaultDisplayName: 'Import file',
          group: 'import',
          fields: ['uri', 'name', 'ext'],
          options: {
            // file object
            file: {}
          },
          action: function loadFile(cb) {
            var self = this;
            self.ready = false;
            var file = this.options.file;
            self.displayName = self.defaultDisplayName + ' ' + file.name;
            FileService.load(file, function (err1, fileContent) {
              FileService.parse(file, fileContent, function (err2, tables) {
                self.tables = (_.isArray(tables) ? tables : [tables]).map(function (table) {
                  return FileService.recognizeHeaders(file, table);
                });

                self.tables[0].active = true;
                self.tables = tables;
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
        },
        'export_dimension': {
          name: 'export_dimension',
          displayName: 'Export Dimension',
          options: {
            // step to take data from
            step: {},
            // table to take data from,
            table: {
              headers: {
                // required
                col: []
              }
            },
            // dimension to extract
            dimension: {name: '', title: ''},
            // dimension values map csv->dimension values
            map: {
              // required
              value: '',
              // to map dim title (like `Norway` for `nor`)
              title: '',
              // string[] - to values synonyms
              synonyms: []
            }
          },
          toTable: function toTable() {
            try {
              // by performance reasons this could looks ugly
              // this.options.map.value, this.options.map.title
              var colHeadersLength = 1 + (this.options.map.title ? 1 : 0) +
                this.options.map.synonyms.length;

              var colHeaders = new Array(colHeadersLength);
              var rowMap = new Array(colHeadersLength);

              var index = 0;
              colHeaders[index] = 'value';
              rowMap[index] = this.options.table.headers.col
                .indexOf(this.options.map.value);
              index++;

              if (this.options.map.title) {
                colHeaders[index] = 'title';
                rowMap[index] = this.options.table.headers.col
                  .indexOf(this.options.map.title);
                index++;
              }

              for (var j = 0; j < this.options.map.synonyms.length; j++, index++) {
                colHeaders[index] = 'syn.' + j;
                rowMap[index] = this.options.table.headers.col.indexOf(this.options.map.synonyms[j]);
              }

              function mapRow(row) {
                var res = new Array(colHeadersLength);
                for (var i = 0; i < colHeadersLength; i++) {
                  res[i] = row[rowMap[i]];
                }
                return res;
              }

              /** @typeof Table*/
              return {
                name: this.options.dimension.name,
                headers: {col: colHeaders},
                rows: _.map(this.options.table.rows, mapRow)
              };
            } catch (e) {
              return false;
            }
          },
          toJSON: function toJSON() {
            try {
              // by performance reasons this could looks ugly
              // this.options.map.value, this.options.map.title
              var colHeadersLength = 2 + this.options.map.synonyms.length;

              var index = 0;
              var rowMap = new Array(colHeadersLength);
              rowMap[index++] = this.options.table.headers.col
                .indexOf(this.options.map.value);
              rowMap[index++] = this.options.table.headers.col
                .indexOf(this.options.map.title);

              for (var j = 0; j < this.options.map.synonyms.length; j++, index++) {
                rowMap[index] = this.options.table.headers.col.indexOf(this.options.map.synonyms[j]);
              }

              function mapRow(row) {
                var res = {
                  value: row[rowMap[0]],
                  synonyms: []
                };
                if (rowMap[1] !== -1) {
                  res.title = row[rowMap[1]];
                }
                for (var i = 2; i < colHeadersLength; i++) {
                  var value = row[rowMap[i]];
                  if (!value) {
                    continue;
                  }
                  if (res.synonyms.indexOf(value) !== -1) {
                    continue;
                  }

                  res.synonyms.push(value);
                }
                return res;
              }

              /** @typeof Table*/
              return _.map(this.options.table.rows, mapRow);
            } catch (e) {
              return false;
            }
          },
          action: function updloadDimension(cb) {
            var self = this;
            // todo: get dimension by name
            // todo: if dimension has id do not recreate, -> update
            // todo: update: dimension values idempotently
            var dimensionsResource = $resource('/api/dimensions');
            var dimensionValuesResource = $resource('/api/dimensions/:id/values');
            var body = this.options.dimension;

            return dimensionsResource.save({}, body, function (res) {
              if (res.error) {
                return cb(res.error);
              }

              var dimension = res.data.dimension;
              dimensionValuesResource.save({id: dimension._id}, self.toJSON(dimension), function (res) {
                if (res.error) {
                  return cb(res.error);
                }

                dimensionValuesResource.get(query, function (res) {
                  console.log(res.data);
                }, cb);
              }, cb);
            }, cb);
          }
        },
        "export_indicator": {
          name: 'export_indicator',
          displayName: 'Export Indicator',
          action: function (cb) {
            cb();
          }
        }
      };

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

      // pipes related
      self.runStep = function runStep(step) {
        self.pipe.runStep(step, function (err) {
          safeApply(function () {
            step.error = err;
          });
        });
      };

      self.previewStep = function previewStep(step) {
        if (step.name === StepTypes.import_file.name) {
          self.previews = _.map(step.tables, function (table) {
            table.settings = createSettings(table.headers, self.pipe, step);
            return table;
          });
          return;
        }
        if (step.name === StepTypes.export_dimension.name) {
          var t = step.toTable();
          if (!t) {
            step.ready = null;
            return;
          }
          t.settings = createSettings(t.headers, self.pipe, step);
          step.ready = true;
          self.previews = [t];
          return;
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
        this.active = true;
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

      Pipe.prototype.createExportDimensionStep = function createExportDimensionStep() {
        this.addStep(new Step(StepTypes.export_dimension.name));
        return this;
      };

      Pipe.prototype.createExportIndicatorStep = function createExportIndicatorStep() {
        this.addStep(new Step(StepTypes.export_indicator.name));
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
                  return selectionType !== 'row' || _.isArray(hotSettings.colHeaders);
                }
              },
              recognize_data: {
                name: 'Recognize data',
                callback: function (key, selection) {
                  var self = this;
                  var selected = this.getSelected();
                  var selectedData = this.getData.apply(this, selected);
                  // todo: make api call and freeze this column

                  setTimeout(function () {
                    self.selectCellByProp(selection.start.row, selection.start.col,
                      selection.end.row, selection.end.col, false);
                  }, 150);
                },
                disabled: function () {
                  window.a = this;
                  var selectionType = getSelectionType(this.getSelected());
                  return selectionType !== 'col';
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

      function safeApply(cb) {
        if ($scope.$$phase) {
          return cb();
        }
        $scope.$apply(cb);
      }
    }]);
};
