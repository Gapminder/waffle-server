var angular = require('angular');
var uiRouter = require('angular-ui-router');
var ngResource = require('angular-resource');
require('angular-breadcrumb');
require('ngHandsontable');

var fileManagementComponent = require('./file-management');

var app = angular.module('admin', [
  ngResource,
  uiRouter,
  'ui.bootstrap',
  'ncy-angular-breadcrumb',
  'ngHandsontable',
  fileManagementComponent
]);

require('./ws-app.config')(app);
require('./ws-app.factories')(app);

// all in one bunch
require('./collections.service')(app);

require('./shared/navigation/breadcrumb.directive')(app);

require('./landing/landing.controller')(app);

require('./users/user.controller')(app);
require('./users/users.service')(app);

require('./playground/cyper-editor.service')(app);
require('./playground/cyper-editor.controller')(app);

require('./home/catalogs-registry/catalogs-registry.factories')(app);
require('./home/catalogs-registry/catalogs-registry-edit.controller')(app);
require('./home/catalogs-registry/catalogs-registry-list.controller')(app);

require('./home/dimension-values/dimension-values.factories')(app);
require('./home/dimension-values/dimension-values-edit.controller')(app);
require('./home/dimension-values/dimension-values.controller')(app);

require('./home/dimensions/dimensions.factories')(app);
require('./home/dimensions/dimensions.controller')(app);

require('./home/indicator-values/indicator-values.factories')(app);
require('./home/indicator-values/indicator-values-edit.controller')(app);
require('./home/indicator-values/indicator-values.controller')(app);

require('./home/indicators/indicators.factories')(app);
require('./home/indicators/indicators.controller')(app);

require('./home/publishers/publishers.factories')(app);
require('./home/publishers/publishers-edit.controller')(app);
require('./home/publishers/publishers-list.controller')(app);

require('./home/stats/stats.factories')(app);
require('./home/stats/stats.controller')(app);
require('./home/stats/stats.directives')(app);

require('./home/versions/versions.controller')(app);
require('./home/versions/version-details.controller')(app);

require('./home/versions-registry/versions-registry.factories')(app);
require('./home/versions-registry/versions-registry-list.controller')(app);
require('./home/versions-registry/versions-registry-edit.controller')(app);

require('./ws-app.routes')(app);
