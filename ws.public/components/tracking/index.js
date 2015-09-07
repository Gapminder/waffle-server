'use strict';
/*eslint block-scoped-var:0, no-undef:0*/
if (_isDev) {
  var jquery = require('jquery');
  jquery(document).ready(function () {
    require('ng-stats')({position: 'bottomright'});
  });
}

if (!_isDev) {
  require('./new-relic');
}
