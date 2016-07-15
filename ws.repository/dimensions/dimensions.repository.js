'use strict';

var mongoose = require('mongoose');
var async = require('async');

var Dimensions = mongoose.model('Dimensions');
var DimensionValues = mongoose.model('DimensionValues');

function DimensionsRepository() {
}

module.exports = DimensionsRepository;
