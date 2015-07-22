// import
// save
// analyze
/*eslint-disable*/
var _ = require('lodash');
var async = require('async');
var express = require('express');

var parser = require('./ws.plugins/google-spread-sheets/parser');

generateList();
/** @private */
function generateList() {
  var GoogleSpreadsheet = require('google-spreadsheet');
  var someSheet = new GoogleSpreadsheet('192pjt2vtwAQzi154LJ3Eb5RF8W9Fx3ZAiUZy-zXgyJo');
  someSheet.getRows('od5', {'start-index': 1}, function (err2, cells) {
    function parseName(name, title, uid) {
      if (!name || !name.replace(/[^%\w]/g, '')) {
        if (title.replace(/[^%\w]/g, '')) {
          return title.replace(/[^%\w]+/g, '_');
        }
        return uid;
      }

      return name;
    }

    var rows = _.map(cells, function (row) {
      return {
        uid: parser.parse(row.indicatorurl),
        indicator: {
          name: parseName(row.id, row.title, parser.parse(row.indicatorurl)),
          title: row.title
        }
      };
    });

    var exclude = [
      'https://docs.google.com/spreadsheets/d/1aYzLwblTgPVT6Zbexq-V8coTzKr54Fg9JB7rhkzfLbU/pub',
      'https://docs.google.com/spreadsheets/d/1ZMmT3Lj2BCu8AYODni-sbv0Ibeh6mkSsn3DRmJo4rNg/pub',
      'https://docs.google.com/spreadsheets/d/1wQj8YxaeP4MAoMeRh6xZ5AnJkABhufT1UAuE_M5LeB0/pub',
      'https://docs.google.com/spreadsheets/d/1clUeOPK_Rs-ASt2Wl0NWXo-KhOrszkJJ19he7ID4YWY/pub',
      'https://docs.google.com/spreadsheets/d/1tt2bb3fpvOdBaRp1fv39pQ8RjkOb_VbjTi0XdVQEVpI/pub',
      'https://docs.google.com/spreadsheets/d/1erdUA9SDUzZw5M8KfbRL7fgda2XqoAkuvZ1XgGnQ-sY/pub',
      'https://docs.google.com/spreadsheets/d/1bOnlJd00Ygl1nxKrfnmOvkrJ4ruJ_md7WWdrdWYixr0/pub',
      'https://docs.google.com/spreadsheets/d/1FIfJRjfPJSC0S3q5fNUiASC0Xo3j-FlN_kMTPL7FXI0/pub',
      'https://docs.google.com/spreadsheets/d/1MYOjKDFE2z5JBAu5-UhCEjpgxDQF8-0zdReX8BFaPGU/pub',
      'https://docs.google.com/spreadsheets/d/1tj6e75vcdYfDWjz7dNVN-6C8QBJT5OH_OKCTCu2VmjE/pub',
      'https://docs.google.com/spreadsheets/d/1WMpJl70z4epmKyEkqwKDnCJ-_8NcF1WAe18JINslWww/pub',
      'https://docs.google.com/spreadsheets/d/1kB4PFkvhQu2emRcFBMu368wCjVhZzEcbWsXFgFfikJU/pub',
      'https://docs.google.com/spreadsheets/d/1oDVONphUheFEDSlNgaBZsP36KblRXPAG0q1O3vdALsg/pub'
    ];

    var excludeList = _.map(exclude, function (e) {
      return parser.parse(e);
    });

    var indicators = _.filter(rows, function(row) {
      return excludeList.indexOf(row.uid) === -1;
    });

    console.log(indicators);
  });
}
