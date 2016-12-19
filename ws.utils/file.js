'use strict';

const _ = require('lodash');
const hi = require('highland');
const fs = require('fs');
const path = require('path');
const byline = require('byline');
const JSONStream = require('JSONStream');
const logger = require('../ws.config/log');

const Converter = require('csvtojson').Converter;

module.exports = {
  readTextFileByLineAsJsonStream,
  readCsvFileAsStream,
  readCsvFile
};

function readCsvFileAsStream(pathToDdfFolder, filepath) {
  const resolvedFilepath = path.resolve(pathToDdfFolder, filepath);

  return hi(fs.createReadStream(resolvedFilepath, 'utf-8')
    .pipe(new Converter({constructResult: false}, {objectMode: true})));
}

function readCsvFile(pathToDdfFolder, filepath, options, cb) {
  const resolvedFilepath = path.resolve(pathToDdfFolder, filepath);

  const converter = new Converter(Object.assign({}, {
    workerNum: 1,
    flatKeys: true
  }, options));

  converter.fromFile(resolvedFilepath, (err, data) => {
    if (err) {
      const isCannotFoundError = _.includes(err.toString(), "cannot be found.");
      if (isCannotFoundError) {
        logger.warn(err);
      } else {
        logger.error(err);
      }
    }

    return cb(null, data);
  });
}

function readTextFileByLineAsJsonStream(pathToFile) {
  const fileWithChangesStream = fs.createReadStream(pathToFile, {encoding: 'utf8'});
  const jsonByLine = byline(fileWithChangesStream).pipe(JSONStream.parse());
  return hi(jsonByLine);
}
