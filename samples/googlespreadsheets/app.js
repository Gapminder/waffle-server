var _ = require('lodash');
var GoogleSpreadsheet = require("google-spreadsheet");

var my_sheet = new GoogleSpreadsheet('1H3nzTwbn8z4lJ5gJ_WfDgCeGEXK3PVGcNjQ_U5og8eo');

// https://docs.google.com/spreadsheets/d/1H3nzTwbn8z4lJ5gJ_WfDgCeGEXK3PVGcNjQ_U5og8eo/pub#
my_sheet.getInfo(console.log.bind(console));
// { title: 'indicator life_expectancy_at_birth',
//   updated: '2015-01-16T14:50:53.248Z',
//   author: { name: 'gapdata', email: 'gapdata@gmail.com' },
//   worksheets:
//    [ { id: 'od6',
//        title: 'Data',
//        rowCount: '245',
//        colCount: '206'},
//      { id: 'od7',
//        title: 'About',
//        rowCount: '51',
//        colCount: '13'},
//      { id: 'od4',
//        title: 'Footnotes',
//        rowCount: '20',
//        colCount: '6'},
//      { id: 'od5',
//        title: 'Settings',
//        rowCount: '20',
//        colCount: '6'},
//      { id: 'oda',
//        title: 'Download',
//        rowCount: '20',
//        colCount: '6'},
//      { id: 'odb',
//        title: 'v',
//        rowCount: '20',
//        colCount: '6'}
//   ]
// }


my_sheet.getInfo(function (err, info) {
  // data worksheet

  // console.log(info.worksheets[0]);

  // { id: 'od6',
  // title: 'Data',
  // rowCount: '245',
  // colCount: '206'}

  info.worksheets[0].getCells({'max-row': 2, 'max-col': 2}, function (err, cells) {
    // console.log(cells);

    // [ { id: 'https://spreadsheets.google.com/feeds/cells/1H3nzTwbn8z4lJ5gJ_WfDgCeGEXK3PVGcNjQ_U5og8eo/od6/public/values/R1C1',
    //   row: 1,
    //   col: 1,
    //   value: 'Life expectancy with projections. Yellow is IHME',
    //   numericValue: undefined},
    // { id: 'https://spreadsheets.google.com/feeds/cells/1H3nzTwbn8z4lJ5gJ_WfDgCeGEXK3PVGcNjQ_U5og8eo/od6/public/values/R1C2',
    //   row: 1,
    //   col: 2,
    //   value: '1800',
    //   numericValue: '1800.0'},
    // { id: 'https://spreadsheets.google.com/feeds/cells/1H3nzTwbn8z4lJ5gJ_WfDgCeGEXK3PVGcNjQ_U5og8eo/od6/public/values/R2C1',
    //   row: 2,
    //   col: 1,
    //   value: 'Afghanistan',
    //   numericValue: undefined},
    // { id: 'https://spreadsheets.google.com/feeds/cells/1H3nzTwbn8z4lJ5gJ_WfDgCeGEXK3PVGcNjQ_U5og8eo/od6/public/values/R2C2',
    //   row: 2,
    //   col: 2,
    //   value: '28.211',
    //   numericValue: '28.211'}
    // ]

    transformToTidyData(info.worksheets[0], cells);
  });
});


function transformToTidyData(sheet, cells) {
  var _id = sheet._id;
  console.log('|\tsheet\t|\trow\t|\tcolumn\t|\tvalue\t|');
  return _.map(cells, function (cell) {
    // console.log('|\t%s\t|\t%s\t|\t%s\t|\t%s\t|', sheet.id, cell.row, cell.col, cell.value);

    // |	sheet	|	row	|	column	|	value	|
    // |	od6	|	1	|	1	|	Life expectancy with projections. Yellow is IHME	|
    // |	od6	|	1	|	2	|	1800	|
    // |	od6	|	2	|	1	|	Afghanistan	|
    // |	od6	|	2	|	2	|	28.211	|

    // console.log({
    //   _id: "ObjectId('" + Date.now() + "')",
    //   dimensions: [
    //     {
    //       dimension: 'sheet',
    //       value: sheet.id
    //     },
    //     {
    //       dimension: 'row',
    //       value: cell.row
    //     },
    //     {
    //       dimension: 'collumn',
    //       value: cell.col
    //     }
    //   ],
    //   value: cell.value,
    //   importSessions: ['ObjectId("import-session-123...")']
    // });

//     { _id: 'ObjectId(\'1436190649343\')',
//   dimensions:
//    [ { dimension: 'sheet', value: 'od6' },
//      { dimension: 'row', value: 1 },
//      { dimension: 'collumn', value: 1 } ],
//   value: 'Life expectancy with projections. Yellow is IHME',
//   importSessions: [ 'ObjectId("import-session-123...")' ] }
// { _id: 'ObjectId(\'1436190649344\')',
//   dimensions:
//    [ { dimension: 'sheet', value: 'od6' },
//      { dimension: 'row', value: 1 },
//      { dimension: 'collumn', value: 2 } ],
//   value: '1800',
//   importSessions: [ 'ObjectId("import-session-123...")' ] }
// { _id: 'ObjectId(\'1436190649344\')',
//   dimensions:
//    [ { dimension: 'sheet', value: 'od6' },
//      { dimension: 'row', value: 2 },
//      { dimension: 'collumn', value: 1 } ],
//   value: 'Afghanistan',
//   importSessions: [ 'ObjectId("import-session-123...")' ] }
// { _id: 'ObjectId(\'1436190649345\')',
//   dimensions:
//    [ { dimension: 'sheet', value: 'od6' },
//      { dimension: 'row', value: 2 },
//      { dimension: 'collumn', value: 2 } ],
//   value: '28.211',
//   importSessions: [ 'ObjectId("import-session-123...")' ] }

    return [sheet.id, cell.row, cell.col, cell.value];
  });
}
