/*eslint-disable camelcase */
'use strict';

require('./common');
var async = require('async');
var mongoose = require('mongoose');

var Publishers = mongoose.model('Publishers');
var DataSources = mongoose.model('DataSources');
var ImportSessions = mongoose.model('ImportSessions');
var PublisherCatalogs = mongoose.model('PublisherCatalogs');
var PublisherCatalogVersions = mongoose.model('PublisherCatalogVersions');

var publisher = {
  name: 'Gapminder',
  url: 'http://www.gapminder.org/',
  createdAt: '2015-08-25T12:40:54.970Z'
};

var catalog = {
  name: 'graph_settings',
  publisher: null,
  createdAt: '2015-08-25T12:40:54.973Z',
  url: 'https://docs.google.com/spreadsheets/d/192pjt2vtwAQzi154LJ3Eb5RF8W9Fx3ZAiUZy-zXgyJo/pub'
};

var version = {
  version: 'default',
  publisher: null,
  catalog: null,
  createdAt: '2015-08-25T13:47:25.902Z'
};

exports.up = function (next) {
  async.series([
    function createDefaultPublisher(cb) {
      Publishers.findOneAndUpdate({name: publisher.name}, {$set: publisher}, {
        'new': true,
        upsert: true
      }, function (err, pub) {
        if (err) {
          return cb(err);
        }
        publisher._id = version.publisher = catalog.publisher = pub._id;
        return cb();
      });
    },
    function createDefaultCatalog(cb) {
      PublisherCatalogs.findOneAndUpdate({
        name: catalog.name,
        publisher: catalog.publisher
      }, {$set: catalog}, {'new': true, upsert: true}, function (err, cat) {
        if (err) {
          return cb(err);
        }
        catalog._id = version.catalog = cat._id;
        return cb();
      });
    },
    function createDefaultCatalogVersion(cb) {
      PublisherCatalogVersions.findOneAndUpdate({
        name: version.name,
        publisher: version.publisher,
        catalog: version.catalog
      }, {$set: version}, {'new': true, upsert: true}, function (err, ver) {
        if (err) {
          return cb(err);
        }
        version._id = ver._id;
        return cb();
      });

    },
    function setDefaultCatalogVersionToDataSources(cb) {
      DataSources.update({}, {
        $set: {
          publisher: version.publisher,
          catalog: version.catalog,
          catalogVersion: version._id
        }
      }, {multi: true}, cb);
    },
    function setCatalogVersionToImportSessions(cb) {
      ImportSessions.update({}, {$set: {catalogVersion: version._id}}, {safe: false, multi: true}, cb);
    },
    function setCatalogVersionToIndicators(cb) {
      cb();
    },
    function setCatalogVersionToIndicatorValues(cb) {
      cb();
    }
  ], next);
};

exports.down = function (next) {
  next();
};
/*eslint-enable camelcase */
