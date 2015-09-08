//var XLSX = require('xlsx/dist/xlsx.core.min.js');
//var XLSX = require('xlsx');

module.exports = function (app) {
  app
    .controller('FileListController', [
      '$state', 'FilesService',
      function ($state, FilesService) {
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

          FilesService.list(query, function updateList(err, resp) {
            if (err) {
              console.error(err);
              return;
            }

            self.currentData = resp.files;
            self.totalItems = resp.count;
          });
        }

        function preview(file) {
          /* set up XMLHttpRequest */
          var url = file.uri;
          var oReq = new XMLHttpRequest();
          oReq.open('GET', url, true);
          oReq.responseType = 'arraybuffer';

          oReq.onload = function (e) {
            var arraybuffer = oReq.response;

            /* convert data to binary string */
            var data = new Uint8Array(arraybuffer);
            var arr = [];
            for (var i = 0; i !== data.length; ++i) {
              arr[i] = String.fromCharCode(data[i]);
            }
            var bstr = arr.join('');

            /* Call XLSX */
            var workbook = XLSX.read(bstr, {type: 'binary'});

            /* DO SOMETHING WITH workbook HERE */
            console.log(workbook);
          }

          oReq.send();
        }
      }
    ]);


  //app.factory("XLSXReaderService", ['$q', '$rootScope',
  //  function($q, $rootScope) {
  //    var service = function(data) {
  //      angular.extend(this, data);
  //    };
  //
  //    service.readFile = function(file, showPreview) {
  //      var deferred = $q.defer();
  //
  //      XLSXReader(file, showPreview, function(data){
  //        $rootScope.$apply(function() {
  //          deferred.resolve(data);
  //        });
  //      });
  //
  //      return deferred.promise;
  //    };
  //
  //    return service;
  //  }
  //]);

};
