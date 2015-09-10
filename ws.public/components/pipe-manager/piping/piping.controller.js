module.exports = function (app) {
  app.controller('PipingController', [function () {
    var self = this;
    // test data, todo: replaces with services load\parse
    var input = require('./test_data');
    self.rows = input.rows.slice();
    self.settings = createSettings(input.headers);

    self.pipe = '';
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
