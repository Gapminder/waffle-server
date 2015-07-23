'use strict';

// var mongoose = require('mongoose');
// var _ = require('lodash');

module.exports = function (router) {
  function getIndicators () {

  }

  function getIndicator () {

  }

  function getIndicatorValues () {

  }

  function getIndicatorVersions () {

  }
  // redirect to list of indicators
  router.get('/', function (req, res) {
    return res.redirect('/api/lastVersion/indicators');
  });

  // returns list of indicators
  router.get('/:version/indicators', getIndicators);
  // returns indicator meta
  router.get('/:version/indicators/:name', getIndicator);
  // returns indicator values, latest version or specific version
  router.get('/:version/indicators/:name/values', getIndicatorValues);
  // returns indicator versions
  router.get('/:version/indicators/:name/versions', getIndicatorVersions);
};
