module.exports = function (app) {
  app.controller('PipingController', [function () {
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

  }]);

  function Importer(opts) {
    this.options = opts;
  }

  Importer.prototype.run = function run() {
    // load file
  };

  var ImportTypes = {
    file: {name: 'file', fields: ['uri', 'name', 'ext'], handler: Importer},
    dimension: {},
    observable: {}
  };

  var StepTypes = {
    'import': {name: 'import', displayName: 'Import', type: ImportTypes['file']}
  };


  function Step(type, opts) {
    if (!(type in StepTypes)) {
      throw new Error('Not supported step type: ' + type);
    }
    this.index = -1;
    this.type = type;
    this.stepType = StepTypes[type];
    this.opts = opts || {};

    this.defaults = this.getDefaults();
  }

  Step.prototype.getDefaults = function getDefaults() {
    switch (this.type) {
      case 'import':
        return ImportTypes[this.type];
      default:
        throw new Error('[Pipe] Not found step defaults for type: ' + this.type);
    }
  };

  Step.prototype.getDisplayName = function getDisplayName() {
    var name = [
      this.stepType.displayName,
      this.stepType.type.name
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
        throw new Error('[Pipe] Not found step defaults for type: ' + this.type);
    }
  };

  function Pipe() {
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

  // warning duplicates from file-manager!
  // todo: DRY them out
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
};
