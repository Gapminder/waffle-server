'use strict';

var validator = require('validator');

// todo: add validation error class
function GoogleSpreadSheetParser() {
  /** @private */
  this.hasKeyRegExp = /(key=|spreadsheets\/d\/)([\w-]*)/;
  /** @private */
  this.has
  /** @private */
  this.hasUid = /([\w-]*)/;
}

/**
 * Validate spreadsheet URI
 * @param {string} uri - unique resource identifier, URL usually
 * @returns {Error|Boolean} - true, if valid, Error if not valid
 */
GoogleSpreadSheetParser.prototype.validate = function (uri) {
  if (!uri) {
    return new Error('URI is required');
  }

  if (validator.isURL(uri) && !this.hasKeyRegExp.test(uri)) {
    return new Error('URI is not valid URL');
  }

  if (!this.hasUid.test(uri)) {
    return new Error('URI is not valid UID');
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
GoogleSpreadSheetParser.prototype.parse = function (uri) {
  // todo: add additional parsing and validation here
  var isValid = this.validate(uri);

  if (isValid !== true) {
    return new Error(isValid.message);
  }

  if (validator.isURL(uri)) {
    return this.hasKeyRegExp.exec(uri)[2];
  }

  return uri;
};

module.exports = new GoogleSpreadSheetParser();
