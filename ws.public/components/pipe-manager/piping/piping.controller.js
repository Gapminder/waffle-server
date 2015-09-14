var _ = require('lodash');

module.exports = function (app) {
  app.controller('PipingController', [
    '$scope', 'FileResources', 'FileService',
    function ($scope, FileResources, FileService) {
      var self = this;
      // test data, todo: replaces with services load\parse
      var input = require('./test_data');
      self.rows = input.rows.slice();
      self.settings = createSettings(input.headers);

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
            settings: createSettings(table.headers),
            rows: table.rows
          };
        });
      };
      // extract to configuration
      var ImportTypes = {
        file: {name: 'file', fields: ['uri', 'name', 'ext'], action: loadFile},
        dimension: {},
        observable: {}
      };

      var StepTypes = {
        'import': {name: 'import', displayName: 'Import', stepDef: ImportTypes.file}
      };

      function loadFile(file, cb) {
        FileService.load(file, function (err1, fileContent) {
          FileService.parse(file, fileContent, function (err2, tables) {
            return cb(err1 || err2, tables);
          });
        });
      }

      // extract to factory?
      function Step(type, opts) {
        if (!(type in StepTypes)) {
          throw new Error('Not supported step type: ' + type);
        }
        this.index = -1;
        this.type = type;
        this.stepType = StepTypes[type];
        this.opts = opts || {};
        this.defaults = this.getDefaults();
        this.ready = null;
      }

      Step.prototype.run = function run(cb) {
        switch (this.type) {
          case 'import':
            return this.stepType.stepDef.action(this.opts, cb);
          default:
            throw new Error('[Step] Not found step run action for type: ' + this.type);
        }
      };

      Step.prototype.getDefaults = function getDefaults() {
        switch (this.type) {
          case 'import':
            return ImportTypes[this.type];
          default:
            throw new Error('[Step] Not found step defaults for type: ' + this.type);
        }
      };

      Step.prototype.getDisplayName = function getDisplayName() {
        var name = [
          this.stepType.displayName,
          this.stepType.stepDef.name
        ];
        switch (this.type) {
          case 'import':
            switch (this.stepType.name) {
              case 'file':
              default :
                name.push(this.opts.name);
            }
            return name.join(' ');
          default:
            throw new Error('[Step] Not found step defaults for type: ' + this.type);
        }
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
        this.addStep(new Step(StepTypes.import.name, opts));
        return this;
      };

      Pipe.prototype.runStep = function runStep(step, cb) {
        var selfPipe = this;
        step.run(function (err, res) {
          selfPipe.setStepData(step, res);
          console.log(selfPipe);
          return cb(err, res);
        });
        return this;
      };

      Pipe.prototype.setStepData = function setStepData(step, data) {
        this.pipe[step.type] = this.pipe[step.type] || {};
        this.pipe[step.type][step.opts.name] = data;
      };

      Pipe.prototype.getStepData = function setStepData(step) {
        return this.pipe[step.type] && this.pipe[step.type][step.opts.name];
      };

      // warning duplicates from file-manager!
      // todo: DRY them out
      function createSettings(headers) {
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
              "recognize_data": {
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
                  this.selectCellByProp(selection.start.row, selection.start.col,
                    selection.end.row, selection.end.col, false);
                  window.a = this;
                }
              },
              "row_above": {
                disabled: function () {
                  // if first row, disable this option
                }
              },
              "row_below": {},
              "hsep1": "---------",
              "remove_row": {
                name: 'Remove this row, ok?',
                disabled: function () {
                  // if first row, disable this option
                }
              },
              "hsep2": "---------",
              "about": {name: 'About this menu'}
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
