'use strict';

let _ = require('lodash');
let fs = require('fs');
let path = require('path');
let async = require('async');
let json2csv = require('json2csv');

if (!process.argv || process.argv.length < 3) {
  throw new Error('Please, provide input file path.');
}

if (process.argv.length > 3) {
  console.log('Only first given file path will be used by data generatior');
}

let request = require('request-json');
let client = request.createClient('http://localhost:3000/');

let endpoints = {
  geos: {
    path: '/api/geo/countries'
  },
  measureValues: {
    path: '/api/graphs/stats/vizabi-tools',
    preProcessData: data => {
      return _.chain(data.rows)
        .map(row => _.zipObject(data.headers, row))
        .value();
    }
  }
};

let generationSchemaFile = process.argv[2];
let generationSchemas = require(path.resolve(__dirname, generationSchemaFile));

let generationTasks = _.map(generationSchemas, schema => {
  return cb => {
    async.waterfall([
      cb => client.get(createUrl(schema), (err, res, body) => cb(err, body.data)),
      (docs, cb) => generateCsv(schema, docs, cb),
      (csv, cb) => fs.writeFile(schema.file, csv, 'utf8', cb)
    ], (error) => {
      if (error) {
        console.error(error);
      }
      console.log(`Completed generating ${schema.file}`);
      return cb(error);
    });
  }
});

function createUrl(schema) {
  let urlPath = endpoints[schema.endpoint].path;
  if (!schema.query) return urlPath;

  return `${urlPath}?${schema.query}`;
}

function generateCsv(schema, data, cb) {
  let doNothingWithData = data => data;

  let preProcessData = endpoints[schema.endpoint].preProcessData || doNothingWithData;
  return json2csv({
    fields: schema.wsProperties,
    fieldNames: schema.headers,
    data: preProcessData(data),
    quotes: ''
  }, cb);
}

async.parallel(generationTasks, error => {
  if (error) {
    console.error(error);
  }

  console.log('All generation tasks were completed');
  process.exit(0);
});
