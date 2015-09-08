var angular = require('angular');
// var fileUpload = require('ng-file-upload');
require('angular-file-upload');

var app = angular.module('file-management', ['angularFileUpload']);

require('./file-upload/file-upload.controller')(app);
require('./file-list/file-list.service')(app);
require('./file-list/file-list.controller')(app);
require('./file-management.routes')(app);

module.exports = app.name;
