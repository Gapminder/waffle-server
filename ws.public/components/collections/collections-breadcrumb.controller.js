'use strict';

angular.module('admin.controllers').controller('CollectionsBreadcrumbController', [
  '$state', function CollectionsBreadcrumbController($state) {
    var self = this;
    self.pageTitle = $state.current.data.pageTitle;
    self.pageType = $state.current.data.pageType;
    self.tagline = 'Waffle Server';
  }
]);
