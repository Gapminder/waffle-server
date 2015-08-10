'use strict';

var Importer = require('./importer');

function CsvPlugin(serviceLocator) {
  var self = this;

  try {
    self.meta = require('./plugin-meta');
    self.parser = require('./parser');
    self.importer = new Importer();
    self.analysis = require('./analysis')(serviceLocator).analyse;
  } catch (e) {
    console.error(e);
  }

  console.log('Plugin was initialized successful.');

  return self;
}

module.exports = function (serviceLocator) {
  return new CsvPlugin(serviceLocator);
};
