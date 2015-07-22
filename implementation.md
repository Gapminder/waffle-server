# waffle server implementation document

Please read:
- [Architecture overview](https://docs.google.com/presentation/d/14AM4YUTNrpVI7FRZpvCIgdJERA1vCrBsgGVJOKC9igY) for concept overview
- [Tidy data](http://www.jstatsoft.org/v59/i10/paper) for terms and data concepts understanding (3rd normal form of data)

## Import component

#### Overview


Role of import component is to connect to data source and download raw data as unique data sets. Expose raw data for future reuse.

Notes:
- creates import sessions
- creates import session data
- each import session is binded

Goal of component:
- import data in raw format
- versioning of imported data
- compare import versions (view diff)


Import Data:
- connect to Data Source (sample: google spreadsheet)
- import Data Sets in raw format to MongoDB

Versioning of imported data:
- each import is unique (creates unique version of import session)

Import versions comparison:
- compare different versions of data source imports (view difference, approve\decline import)

#### Data Source

`Data Source` is an external resource containing data to work with.

Notes:
- list of known data sources

Samples:
- google spreadsheet
- external APIs
- xml
- json files
- etc.

Requirements:
- should have unique `ID` within `data source` space
- `data source type` identifier
- meta: `user` created data source instance, and time stamp of creation

Schema:
- `_id`: object id, system
- `dst` (Data Source Type): object id, link to DataSource type entry
- `dsuid` (Data Source Unique Id): string, unique data source id within DataSource space
- `user`: object id, link to user created this entry
- `createdAt`: timestamp of entry creation
- `meta`: any additional information

Entry sample:
```javascript
{
  _id: ObjectId("ds1..."),
  dst: ObjectId("dst-google-spread-sheet..."),
  dsuid: '1saRApLme-qgAH0nyfg2mqPcm980nzKDg5kES0tS90rg',
  meta: {
    url: 'https://docs.google.com/spreadsheets/d/1H3nzTwbn8z4lJ5gJ_WfDgCeGEXK3PVGcNjQ_U5og8eo/pub#'
  },
  user: ObjectId('ola@gapminder.org'),
  createAt: Date.now()
}
```

Implementation notes:
- entry is unique by key `[dst, dsuid]`, so it should be `inserted` only if not `exists`

```javascript
db.DataSources.findOne({
  dst: ObjectId("dst-google-spread-sheet..."),
  dsuid: '1saRApLme-qgAH0nyfg2mqPcm980nzKDg5kES0tS90rg'
}, function (err, dataSource) {
  if (dataSource) {
    // if data source exists return existing entry
    return cb(err, dataSource);
  }
  // else create new one [create](http://mongoosejs.com/docs/api.html#model_Model.create)
  db.DataSources.create({
    _id: ObjectId("ds2..."),
    dst: ObjectId("dst-google-spread-sheet..."),
    dsuid: '1saRApLme-qgAH0nyfg2mqPcm980nzKDg5kES0tS90rg',
    meta: {
      url: 'https://docs.google.com/spreadsheets/d/1H3nzTwbn8z4lJ5gJ_WfDgCeGEXK3PVGcNjQ_U5og8eo/pub#'
    },
    user: ObjectId('ola@gapminder.org'),
    createAt: Date.now()
  }, callback);
});
```


#### Data source type

`Data source type` - is a unique type of Data Source, like google spreadsheet, Pentaho API, etc.


Notes:
- list of known data source types

Sample: same as Data Source

Requirements:
- should have unique name (`googlespreadsheet`, `petahoapi`, `panda`, etc.)

Schema:
- `_id` - object id, system
- `name` - string, unique name of data source
- `title` - display name (human readable)

Entry sample:
```javascript
{
  _id: ObjectId("dst-google-spread-sheet..."),
  name: 'dst-google-spread-sheet',
  title: 'Google Spread Sheets'
}
```

Implementation note:
- list of known data source types provided by plugin at register event,
so can not be changed manually by user or whatever

```js
var me = require('./google-spread-sheet-plugin');
console.log(me);
/* {
  name: 'google-spread-sheet',
  title: 'Google Spread Sheets',
  ... list of methods
} */

// register methods should create an entry in Data Source Types Collection
plugins.register(me, cb);

// in register method
db.DataSourceTypes.update(
  {name: plugin.name},
  {$set: plugin},
  {upsert: true},
  cb);
```

#### Import Session

Import session is versioning of imports made from same data source

Notes:
- history if import sessions

Schema:
- `_id` - object id, system
- `dsid` (Data Source entry Id) - object id, link to data source entry
- `isApproved` - is import sessions was approved
- `user` - who started to import data
- `createdAt` - timestamp of import start time


Entry sample:
```javascript
{
  _id: ObjectId("import-session-123..."),
  dsid: ObjectId("ds1..."),
  isApproved: false,
  user: ObjectId("ola@gampminer.org"),
  createdAt: Date.now()
}
```

#### Import Data

Import data is a collection of data in tidy data format.

What is `tidy data` format? (see link at top of this document)

Sample:

For example google spreadsheet store data in tables

Worksheet `Sheet 1`:

|    |1800|1801|1802|1804|
|----|----|----|----|----|
|c1  |1111|1112|1113|1114|
|c2  |2111|2112|2113|1114|
|c3  |3111|3112|3113|1114|
|c4  |4111|4112|4113|1114|

In tidy data format it is:

| sheet   | row | column | value |
|---------|-----|--------|-------|
| sheet 1 | 1   | A      | none  |
| sheet 1 | 1   | B      | 1800  |
| sheet 1 | 1   | C      | 1801  |
| sheet 1 | 1   | D      | 1802  |
| sheet 1 | 1   | E      | 1803  |
| sheet 1 | 2   | A      | c1    |
| sheet 1 | 2   | B      | 1111  |
| sheet 1 | 2   | C      | 1112  |
| sheet 1 | 2   | D      | 1113  |
| sheet 1 | 2   | E      | 1114  |
| sheet 1 | 3   | A      |  c2   |

etc...

so it is 3 dimensional data store

Schema:
- `_id` - object id, system
- `dimensions` - array of dimensions ([{dimension: any, value: any }])
- `dimensions.dimension` - string, dimension identifier
- `dimentions.value` - string, dimension value
- `value`- string, any variable value
- `importSessions` - array of links to import session entries

2 words about `importSessions`:
- it allows to get `latest` or any specific version of imported data
- watch and compare version of imported data, to track changes in data source
- it allows to get any version by user
- it allows to get any approved or not version

Entry sample:
```javascript
{
  _id: 'ObjectId(\'1436190649344\')',
  dimensions:
  [
    { dimension: 'sheet', value: 'od6' },
    { dimension: 'row', value: 1 },
    { dimension: 'column', value: 2 }
  ],
  value: '1800',
  importSessions: [ 'ObjectId("import-session-123...")' ]
  }
```

Usage samples:
- row:1 in sheet:od6 is dimension: years
- column:1 in sheet:od6 is dimension: countries
- sheet:od6 is indicator life_expectancy_at_birth

### Schema analysis
It is a semiautomatic step of import, as soon as data imported it could be analyzed
manually or basing on existing history of analysis patters, data values, data source type,
creating and extending existing dimensions and indicators.

// todo: write this
// model: dimensions
// model: indicators

### Export\Expose

// todo: rest api
// todo: save neo4j schems in mongodb
// todo: export to neo4j


## Transform

## Annotate
