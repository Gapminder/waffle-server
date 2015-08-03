'use strict';

angular.module('admin.controllers').controller('ImportDataSpreadsheetController', [
  '$state', 'ImportDataSpreadsheetService', function ImportDataSpreadsheetController($state, ImportDataSpreadsheetService) {
    var self = this;
    self.currentData = [];

    ImportDataSpreadsheetService.getData({importSession: $state.params.importSession}, handleData);

    function handleData (error, data) {
      if (error) {
        console.error(error);
      }
      self.currentData = data;
    }
  }
]);
