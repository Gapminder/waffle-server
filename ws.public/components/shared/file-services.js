var _ = require('lodash');
var papa = require('papaparse');
var XLSX = require('xlsx');
var angular = require('angular');

module.exports = function (app) {
  app
    .run(['CsvFileService', 'ExcelFileService', angular.noop])
    .factory('FileService', [function () {
      function FileService() {
        this.services = [];
      }

      FileService.prototype.register = function registerFileHandler(fileService) {
        this.services.push(fileService);
      };

      /**
       * @private
       * @param ext
       * @returns {*}
       */
      FileService.prototype.getService = function getServiceBy(ext) {
        for (var i = 0; i < this.services.length; i++) {
          if (this.services[i].test(ext)) {
            return this.services[i];
          }
        }
      };

      FileService.prototype.load = function load(file, cb) {
        this.getService(file.ext).load(file, cb);
        return this;
      };
      FileService.prototype.parse = function parse(file, fileContent, cb) {
        this.getService(file.ext).parse(file, fileContent, cb);
        return this;
      };
      FileService.prototype.recognize = function recognize(file, fileContent, cb) {
        this.getService(file.ext).recognize(file, fileContent, cb);
        return this;
      };
      FileService.prototype.recognizeHeaders = function recognizeHeaders(file, rows) {
        return this.getService(file.ext).recognizeHeaders(file, rows);
      };
      return new FileService();
    }])
    .factory('CsvFileService', ['FileService', function (FileService) {
      function CsvFileService() {
      }

      CsvFileService.prototype.test = function (ext) {
        return ext === '.csv';
      };

      CsvFileService.prototype.load = function load(file, cb) {
        papa.parse(file.uri, {
          download: true,
          dynamicTyping: true,
          worker: false,
          error: cb,
          complete: function (json) {
            // json.data: Array<Array<string>>
            return cb(json.error, json.data);
          }
        });
        return this;
      };

      CsvFileService.prototype.parse = function parse(file, fileContent, cb) {
        return cb(null, [{
          name: file.name,
          rows: fileContent
        }]);
      };
      CsvFileService.prototype.recognizeHeaders = function recognize(file, table) {
        table.headers = table.rows.shift();
        return table;
      };

      var service = new CsvFileService();
      FileService.register(service);
      return service;
    }])
    .factory('ExcelFileService', ['FileService', function (FileService) {
      function ExcelFileService() {
      }

      ExcelFileService.prototype.test = function (ext) {
        return ext === '.xls' || ext === '.xlsx';
      };

      ExcelFileService.prototype.load = function load(file, cb) {
        /* set up XMLHttpRequest */
        var url = file.uri;
        var oReq = new XMLHttpRequest();
        oReq.open('GET', url, true);
        oReq.responseType = 'arraybuffer';

        oReq.onload = function () {
          var arraybuffer = oReq.response;
          return cb(null, arraybuffer);
        };

        oReq.send();
        return this;
      };

      ExcelFileService.prototype.parse = function parse(file, fileContent, cb) {
        /* convert data to binary string */
        var data = new Uint8Array(fileContent);
        var arr = [];

        for (var i = 0; i !== data.length; ++i) {
          arr[i] = String.fromCharCode(data[i]);
        }
        var bstr = arr.join('');
        var workbook = XLSX.read(bstr, {type: 'binary'});

        console.time('compile xls');
        var tables = _.map(Object.keys(workbook.Sheets), function (key) {
          var table = sheet_to_table(workbook.Sheets[key]);
          return {name: key, headers: table.headers, rows: table.rows};
        });
        console.timeEnd('compile xls');
        return cb(null, tables);
      };

      ExcelFileService.prototype.recognizeHeaders = function recognizeHeaders(file, table) {
        return table;
      };

      var service = new ExcelFileService();
      FileService.register(service);
      return service;

      // xlxs etention
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

          for (C = r.s.c; C <= r.e.c; ++C) {
            val = sheet[cols[C] + rr];
            if (val === undefined || val.t === undefined) {
              row[C] = undefined;
              continue;
            }

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
            row[C] = raw ? v : format_cell(val, v);
            //if (v !== undefined) {
            //  isempty = false;
            //}
          } // end column
          //if (isempty === false || header === 1)
          out[outi++] = row;
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
    }]);
};
