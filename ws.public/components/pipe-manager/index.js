var angular = require('angular');

var app = angular.module('pipe-manager', []);

require('./piping/piping.controller')(app);
require('./pipe-management.routes')(app);

module.exports = app.name;
