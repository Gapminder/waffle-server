// var XLSX = require('xlsx/dist/xlsx.core.min.js');
// var XLSX = require('xlsx');
var _ = require('lodash');
var papa = require('papaparse');

module.exports = function (app) {
  app
    .controller('FileListController', [
      '$scope', '$state', 'FilesService',
      function ($scope, $state, FilesService) {
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
          self.table = null;
          if (file.ext === '.csv') {
            papa.parse(file.uri, {
              download: true,
              dynamicTyping: true,
              worker: false,
              error: console.error.bind(console),
              complete: function (json) {
                var rows = json.data;
                if (!rows.length) {
                  return;
                }

                var headers = rows.shift();

                var settings = {
                  height: 396,
                  rowHeaders: true,
                  stretchH: 'all',
                  columnSorting: true,
                  contextMenu: false,
                  className: 'htCenter htMiddle',
                  readOnly: true,
                  colHeaders: headers
                };
                self.table = settings;
                self.tableItems = rows;
                if (!$scope.$$phase) {
                  $scope.$root.$applyAsync(function () {
                  });
                }
              }
            });
            return true;
          }

          if (file.ext !== '.csv') {
            /* set up XMLHttpRequest */
            var url = file.uri;
            var oReq = new XMLHttpRequest();
            oReq.open('GET', url, true);
            oReq.responseType = 'arraybuffer';

            oReq.onload = function (e) {
              console.time('parse');
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
              console.timeEnd('parse');
              /* DO SOMETHING WITH workbook HERE */

              console.time('transform');
              var key = Object.keys(workbook.Sheets)[0];
              var dataSheet = sheet_to_table(workbook.Sheets[key]);
              var rows = dataSheet.rows;
              var headers = dataSheet.headers;
              console.timeEnd('transform');

              var settings = {
                height: 396,
                rowHeaders: true,
                stretchH: 'all',
                columnSorting: true,
                contextMenu: false,
                className: 'htCenter htMiddle',
                readOnly: true,
                colHeaders: headers
              };
              self.table = settings;
              self.tableItems = rows;
              if (!$scope.$$phase) {
                $scope.$root.$applyAsync(function () {
                  // self.table = _.merge({data: rows}, settings);
                });
              }
            };

            oReq.send();
          }
        }
      }
    ]);

  function sheet_to_table(sheet, opts) {
    var val, row, range, header = 0, offset = 1, r, hdr = [], isempty, R, C, v;
    var o = opts != null ? opts : {};
    var raw = o.raw;
    if (sheet == null || sheet['!ref'] == null) return [];
    range = o.range !== undefined ? o.range : sheet['!ref'];
    if (o.header === 1) header = 1;
    else if (o.header === 'A') header = 2;
    else if (Array.isArray(o.header)) header = 3;
    switch (typeof range) {
      case 'string':
        r = safe_decode_range(range);
        break;
      case 'number':
        r = safe_decode_range(sheet['!ref']);
        r.s.r = range;
        break;
      default:
        r = range;
    }
    if (header > 0) offset = 0;
    var rr = encode_row(r.s.r);
    var cols = new Array(r.e.c - r.s.c + 1);
    var out = new Array(r.e.r - r.s.r - offset + 1);
    var outi = 0;
    for (C = r.s.c; C <= r.e.c; ++C) {
      cols[C] = encode_col(C);
      val = sheet[cols[C] + rr];
      switch (header) {
        case 1:
          hdr[C] = C;
          break;
        case 2:
          hdr[C] = cols[C];
          break;
        case 3:
          hdr[C] = o.header[C - r.s.c];
          break;
        default:
          if (val === undefined) continue;
          hdr[C] = format_cell(val);
      }
    }

    for (R = r.s.r + offset; R <= r.e.r; ++R) {
      rr = encode_row(R);
      isempty = true;
      row = [];
      //if (header === 1) row = [];
      //else {
      //  row = {};
      //  if (Object.defineProperty) Object.defineProperty(row, '__rowNum__', {value: R, enumerable: false});
      //  else row.__rowNum__ = R;
      //}

      for (C = r.s.c; C <= r.e.c; ++C) {
        val = sheet[cols[C] + rr];
        if (val === undefined || val.t === undefined) continue;
        v = val.v;
        switch (val.t) {
          case 'e':
            continue;
          case 's':
            break;
          case 'b':
          case 'n':
            break;
          default:
            throw 'unrecognized type ' + val.t;
        }
        if (v !== undefined) {
          row[C] = raw ? v : format_cell(val, v);
          //row[hdr[C]] = raw ? v : format_cell(val, v);
          isempty = false;
        }
      } // end column
      if (isempty === false || header === 1) out[outi++] = row;
    } // end row
    out.length = outi;
    return {rows: out, headers: hdr};
  }

  // utils copy of privates from XLSX
  function safe_decode_range(range) {
    var o = {s: {c: 0, r: 0}, e: {c: 0, r: 0}};
    var idx = 0, i = 0, cc = 0;
    var len = range.length;
    for (idx = 0; i < len; ++i) {
      if ((cc = range.charCodeAt(i) - 64) < 1 || cc > 26) break;
      idx = 26 * idx + cc;
    }
    o.s.c = --idx;

    for (idx = 0; i < len; ++i) {
      if ((cc = range.charCodeAt(i) - 48) < 0 || cc > 9) break;
      idx = 10 * idx + cc;
    }
    o.s.r = --idx;

    if (i === len || range.charCodeAt(++i) === 58) {
      o.e.c = o.s.c;
      o.e.r = o.s.r;
      return o;
    }

    for (idx = 0; i != len; ++i) {
      if ((cc = range.charCodeAt(i) - 64) < 1 || cc > 26) break;
      idx = 26 * idx + cc;
    }
    o.e.c = --idx;

    for (idx = 0; i != len; ++i) {
      if ((cc = range.charCodeAt(i) - 48) < 0 || cc > 9) break;
      idx = 10 * idx + cc;
    }
    o.e.r = --idx;
    return o;
  }

  function encode_row(row) {
    return '' + (row + 1);
  }

  function encode_col(col) {
    var s = '';
    for (++col; col; col = Math.floor((col - 1) / 26)) s = String.fromCharCode(((col - 1) % 26) + 65) + s;
    return s;
  }

  function safe_format_cell(cell, v) {
    if (cell.z !== undefined) try {
      return (cell.w = SSF.format(cell.z, v));
    } catch (e) {
    }
    if (!cell.XF) return v;
    try {
      return (cell.w = SSF.format(cell.XF.ifmt || 0, v));
    } catch (e) {
      return '' + v;
    }
  }

  function format_cell(cell, v) {
    if (cell == null || cell.t == null) return "";
    if (cell.w !== undefined) return cell.w;
    if (v === undefined) return safe_format_cell(cell, cell.v);
    return safe_format_cell(cell, v);
  }
};
