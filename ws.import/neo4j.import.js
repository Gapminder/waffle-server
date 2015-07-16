'use strict';
var _ = require('lodash');
var async = require('async');
var Neo4j = require('node-neo4j');
var express = require('express');
var mongoose = require('mongoose');

require('../ws.config');
var config = require('./config');

var app = express();
var serviceLocator = require('../ws.service-locator')(app);
require('../ws.repository')(serviceLocator);
var neo4jdb = new Neo4j(config.NEO4J_DB_URL);

var collections = Object.keys(mongoose.models);
//var collections = ['ImportSessions'];

function saveEntryToNeo4j(entry, label, cb) {
  console.time('save entry to neo4j: ' + entry._id);
  //var query =
  //  ('merge (indicator:%label% {_id:{id}}) ' +
  //  'on create set indicator += {entry} ' +
  //  'on match set indicator += {entry} ' +
  //  'return indicator')
  //    .replace('%label%', label);

  var query =
    ('create (n:%label% {entry})')
      .replace('%label%', label);

  var params = {
    id: entry._id.toString(),
    entry: _.reduce(entry, function (res, value, key) {
      if (_.isObject(value) && !_.isArray(value) && key !== '_id') {
        res[key] = JSON.stringify(value);
        return res;
      }
      res[key] = value.toString();
      return res;
    }, {})
  };
  //delete params.entry._id;

  return neo4jdb.cypherQuery(query, params, function (err) {
    console.timeEnd('save entry to neo4j: ' + entry._id);
    return cb(err);
  });
}

function createIndexById(label, cb) {
  var query = 'create index on :%label%(_id)'.replace('%label%', label);

  return neo4jdb.cypherQuery(query, {}, cb);
}

console.log('Export started');
console.time('Export done');
async.eachSeries(collections, importDataCollection, function (err) {
  if (err) {
    console.error(err);
    return;
  }

  console.log('Import data finished successful!');
  console.timeEnd('Export done');
});

function importDataCollection(modelName, eachcb) {
  console.log('Started import of: ' + modelName);
  console.time('Done import of: ' + modelName);
  var Model = mongoose.model(modelName);
  async.waterfall([
    function initWaterfall(cb) {
      return createIndexById(modelName, function (err) {
        return cb(err, {Model: Model, modelName: modelName});
      });
    },
    getData
  ], function (err) {
    console.timeEnd('Done import of: ' + modelName);
    return eachcb(err);
  });

  function getData(options, cb) {
    options.Model.count({}, function (err, count) {
      if (err) {
        return cb(err);
      }

      if (count === 0) {
        return cb();
      }

      var tasks = [];
      var page = 5000;

      var pages = Math.floor(count / page);
      var lastPage = count % page;
      var i = 0;
      for (i = 0; i < pages; i++) {
        tasks.push({skip: i * page, limit: page});
      }
      tasks.push({skip: i * page, limit: lastPage});

      var counter = pages + 1;
      console.log('Export data values to save: ', counter);
      async.eachLimit(tasks, 10, function (task, cb) {
        var currentCounter = counter--;
        //if (counter % 100 === 0 || counter < 100 && counter % 10 === 0 || counter < 10) {
        console.time('Export data left to save: ' + currentCounter);
        //}
        options.Model.find({}, {__v: 0})
          .skip(task.skip)
          .limit(task.limit)
          .lean().exec(function (err, docs) {
            if (err) {
              return cb(err);
            }
            //console.log('page loaded: ' + docs.length);
            //async.eachLimit(docs, 10, function (entry, cb) {
            var batchQuery = _.map(docs, function (entry, index) {
              var entry2 = _.reduce(entry, function (res, value, key) {
                // data sources schema
                if (key === 'meta') {
                  return res;
                }

                // data source types and not coordinates schema
                if (key === 'dimensions' && options.modelName !== 'Coordinates') {
                  _.each(value, function (dimKey, dimName) {
                    res['dimension-' + dimName] = dimKey;
                  });
                  return res;
                }

                if (key === 'ds' && options.modelName !== 'ImportSessions') {
                  if (!value[0]) {
                    return res;
                  }

                  // indicator values schema
                  if (value[0].dv) {
                    res[key] = _.pluck(value, 'dv');
                    return res;
                  }

                  // import data schema
                  _.each(value, function (val) {
                    res['dimension-' + val.d] = val.v;
                  });
                  return res;
                }

                //if (_.isObject(value) && !_.isArray(value) && key !== '_id') {
                //  res[key] = JSON.stringify(value);
                //  return res;
                //}

                if (_.isArray(value)) {
                  res[key] = _.map(value, function (v) {
                    return v.toString();
                  });
                  return res;
                }
                res[key] = value.toString();
                return res;
              }, {});

              var query = {
                method: 'POST',
                to: '/node',
                body: entry2,
                id: index
              };
              return query;
            });
            _.each(docs, function (entry, index) {
              batchQuery.push({
                method: 'POST',
                to: '{' + index + '}/labels',
                id: index + docs.length,
                body: options.modelName
              });
            });

            return neo4jdb.batchQuery(batchQuery, function (err) {
              console.timeEnd('Export data left to save: ' + currentCounter);
              return cb(err);
            });
          });
      }, function (err) {
        return cb(err);
      });
    });
  }
}
