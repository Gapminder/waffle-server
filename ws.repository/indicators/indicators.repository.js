'use strict';

var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');

var Indicators = mongoose.model('Indicators');
var IndicatorValues = mongoose.model('IndicatorValues');

function IndicatorsRepository() {
}

module.exports = IndicatorsRepository;
