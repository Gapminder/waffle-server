// import
// save
// analyze
/*eslint-disable*/
var express = require('express');

var app = express();

var serviceLocator = require('./ws.service-locator')(app);

require('./ws.config')(app);
require('./ws.repository')(serviceLocator);
require('./ws.plugins')(serviceLocator, function () {
  var uid = '1H3nzTwbn8z4lJ5gJ_WfDgCeGEXK3PVGcNjQ_U5og8eo';
  /** @type GoogleSpreadSheetPlugin */
  var gs = serviceLocator.plugins.get('google-spread-sheets');
  gs.importer.importData(uid, console.log.bind(console));
});



/**
 * @callback ErrorOnlyCallback
 * @param {Error} [err] - error if any
 */
