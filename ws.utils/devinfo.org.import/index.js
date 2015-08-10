var express = require('express');
var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var async = require('async');
var http = require('http');
var mongoose = require('mongoose');

var csv = require('ya-csv');
var AdmZip = require('adm-zip');

var rootData = require('./rootData');

var app = express();
var serviceLocator = require('../../ws.service-locator')(app);

require('../../ws.config')(app);
require('../../ws.repository')(serviceLocator);

var DevInfoOrg = mongoose.model('DevInfoOrg');
var DATA_DIR = './data';

process.on('uncaughtException', function (err) {
  console.log(err);
});

function writeDetail(file, lang, country) {
  return function (cb) {
    return process.nextTick(function () {

      var r = csv.createCsvFileReader(DATA_DIR + '/' + file, {columnsFromHeader: true, 'separator': ','});
      r.addListener('data', function (data) {
        data.Country = country;
        data.Language = lang;
        var devInfoOrg = new DevInfoOrg(data);
        devInfoOrg.save(function (err) {
          if (err) {
            console.log(err);
          }
        });
      });
      r.addListener('end', function () {
        return cb();
      });
      r.on('error', function (err) {
        r.removeAllListeners();
        console.log(file, err);
        cb();
      });
    });
  }
}

function getUnzippedContent(url, id, cb) {
  var tmpFilePath = DATA_DIR + '/tmp/' + id + '.zip';

  return http
    .get(url, function (response) {
      if (response.headers['content-type'] !== 'application/x-zip-compressed') {
        response.resume();
        return cb(null, {url: url, issue: 'non zipped content: ' + response.headers['content-type']});
      }

      response.on('data', function (data) {
        fs.appendFileSync(tmpFilePath, data);
      });

      response.on('end', function () {
        var zip = new AdmZip(tmpFilePath);
        var target = DATA_DIR;
        zip.extractAllTo(target);
        fs.unlink(tmpFilePath);
        return cb(null, {url: url, target: target});
      });
    })
    .on('error', function (err) {
      return cb(null, {url: url, issue: 'non zipped content: ' + err.message});
    });
}

var executions = {
  first: function first(cb) {

    function loader(url, id) {
      return function (cb) {
        return getUnzippedContent(url, id, function (err, data) {
          return cb(err, data);
        });
      }
    }

    var actions = [];
    var id = 0;
    for (var i = 0; i < rootData.meta.Adaptations.length; i++) {
      var record = rootData.meta.Adaptations[i];
      var langs = record.LangCode_CSVFiles.split(',').map(function (lang) {
        return lang;
      });

      langs.forEach(function (lang) {
        if (lang && lang.trim() !== '') {
          var f = record.Name + '_' + record.Adaptation_Year + '_' + lang + '.zip';
          var url = record.Online_URL + '/stock/data/CSV_DataFiles/' + f;
          url = encodeURI(url);

          actions.push(loader(url, id++));
        }
      });
    }

    return async.parallelLimit(actions, 2, function (err, results) {
      results.forEach(function (result) {
        if (result && result.issue) {
          console.log(result.url, result.issue);
        }
      });

      return cb(err, results);
    });
  },
  second: function second(cb) {
    var actions = [];
    for (var i = 0; i < rootData.meta.Adaptations.length; i++) {
      var record = rootData.meta.Adaptations[i];
      var langs = record.LangCode_CSVFiles.split(',').map(function (lang) {
        return lang;
      });

      langs.forEach(function (lang) {
        if (lang && lang.trim() !== '') {
          var file = record.Name + '_' + record.Adaptation_Year + '_' + lang + '.zip';
          var country = _.findWhere(rootData.meta.Areas, {AREANID: record.Area_NId});
          actions.push(writeDetail(file.replace(/\.zip/, '.csv'), lang, !country ? null : country.AREANAME));
        }
      });
    }

    return async.parallelLimit(actions, 5, function (err) {
      if (err) {
        console.log(err);
      }

      return cb();
    });
  }
};

/*executions.first(function (err) {
 if (!err) {
 executions.second(function () {
 process.exit(0);
 });
 }
 });*/

if (process.argv.length !== 3) {
  console.log('Usage: node index.js first|second');
  process.exit(1);
}

executions[process.argv[2]](function (err) {
  if (err) {
    console.log(err);
  }

  console.log('The end...');
  process.exit(0);
});