'use strict';

var cors = require('cors');
var _ = require('lodash');

var options = {
  origin: true,
  methods: [],
  allowedHeaders: ['X-Requested-With', 'Content-Type', 'Authorization'],
  credentials: true
};

module.exports = function(allowedHttpMethods) {
  var optionsWithAllowedMethods = _.extend({}, options, {methods: allowedHttpMethods});
  return cors(optionsWithAllowedMethods);
};
