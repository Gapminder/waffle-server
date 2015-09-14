var angular = require('angular');

var app = angular.module('pipe-manager', []);

require('./pipe-management.routes')(app);

require('./piping/piping.controller')(app);

module.exports = app.name;
