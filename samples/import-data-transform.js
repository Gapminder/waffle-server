/*eslint no-console:0*/
'use strict';

var ds = [
  {d: {a: 1, b: 1, c: 1}, v: 11},
  {d: {a: 1, b: 1, c: 2}, v: 12},
  {d: {a: 1, b: 1, c: 3}, v: 13},
  {d: {a: 1, b: 2, c: 1}, v: 21},
  {d: {a: 1, b: 2, c: 2}, v: 22},
  {d: {a: 1, b: 2, c: 3}, v: 23},
  {d: {a: 2, b: 1, c: 1}, v: 31},
  {d: {a: 2, b: 1, c: 2}, v: 32},
  {d: {a: 2, b: 1, c: 3}, v: 33},
  {d: {a: 2, b: 2, c: 1}, v: 41},
  {d: {a: 2, b: 2, c: 2}, v: 42},
  {d: {a: 2, b: 2, c: 3}, v: 43}
];

var sheets = _.groupBy(ds, 'd.a');
var flat = _.map(sheets, function (sheet) {
  var rows = _.groupBy(sheet, 'd.b');
  return _.map(rows, function (row) {
    return _.map(row, function (entry) {
      return entry.v;
    });
  });
});

console.log(flat);
/*
// result
[ // spread sheet
  [  // work sheets
    [11, 12, 13], //row
    [21, 22, 23]
  ],

  [
    [31, 32, 33],
    [41, 42, 43]
  ]
]
*/
