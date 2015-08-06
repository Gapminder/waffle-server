'use strict';

angular.module('admin.controllers').controller('ImportDataSpreadsheetController', [
  '$state', 'ImportDataSpreadsheetService', function ImportDataSpreadsheetController($state, ImportDataSpreadsheetService) {
    var self = this;
    self.currentData = null;
    self.currentMetadata = {};
    self.loadingData = true;

    ImportDataSpreadsheetService.getData({importSession: $state.params.importSession}, handleData);

    function handleData (error, response) {
      if (error) {
        console.error(error);
      }
      self.currentData = response.data;
      self.currentMetadata = response.metadata;
      self.loadingData = false;
    }
  }
]);
