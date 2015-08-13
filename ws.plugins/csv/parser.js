'use strict';

var validator = require('validator');
var fs = require('fs');
var path = require('path');

function CsvParser () {}

/**
 * Validate spreadsheet URI
 * @param {string} uri - unique resource identifier, URL usually
 * @returns {Error|Boolean} - true, if valid, Error if not valid
 */
CsvParser.prototype.validate = function (file) {
  var stats = fs.statSync(file);

  if (!fs.existsSync(path.join(file))) {
    return new Error('Csv file doesn\'t exist');
  }

  if (!stats || !stats.isFile()) {
    return new Error('Stats of the file was corrupted');
  }

  if (path.extname(file) === 'csv') {
    return new Error('The \'csv\' file extension is required');
  }

  if(path.basename(file, '.csv') === '') {
    return new Error('The file name is required');
  }

  return true;
};

/**
 * Parse raw format uid (url to public table) in dsuid
 * @param {String} uri - unique resource identifier
 *
 *
 * @returns {String|Error} - returns parsed data source unique id
 */
CsvParser.prototype.parse = function (file, cb) {
  // todo: add additional parsing and validation here
  var isValid = this.validate(file);

  if (isValid !== true) {
    return cb(isValid);
  }

  console.log('  Parsed file: ' + file);

  return cb(null, {filename: file, dsuid: path.basename(file, '.csv')});
};

module.exports = new CsvParser();
