'use strict';

angular.module('admin.controllers').controller('CollectionsBreadcrumbController', [
  '$state', function CollectionsBreadcrumbController($state) {
    var self = this;
    self.pageTitle = $state.current.data.pageTitle;
    self.pageType = $state.current.data.pageType;
    self.pageParentTitle = $state.current.data.pageParentTitle;
    self.pageParentType = $state.current.data.pageParentType;
    self.tagline = 'Waffle Server';
  }
]);
