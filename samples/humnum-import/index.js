var express = require('express');
var fs = require('fs');
var path = require('path');
var async = require('async');
var http = require('http');
var mongoose = require('mongoose');

var CSV = require('./utils/csv');
var yaCsv = require('ya-csv');
var AdmZip = require('adm-zip');

var app = express();
var serviceLocator = require('../../ws.service-locator')(app);

require('../../ws.config')(app);
require('../../ws.repository')(serviceLocator);

var Humnum = mongoose.model('Humnum');

var DATA_DIR = './data';

function writeDetail(file) {
  return function (cb) {
    return process.nextTick(function () {
      var r = yaCsv.createCsvFileReader(file, {columnsFromHeader: true, 'separator': ','});
      r.addListener('data', function (data) {
        var humnum = new Humnum(data);
        humnum.save(function (err) {
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
        cb(err);
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

    fs.readdirSync(DATA_DIR).forEach(function (fileName) {
      if (path.extname(fileName) === '.csv') {
        fs.unlinkSync(DATA_DIR + '/' + fileName);
      }
    });

    var content = fs.readFileSync('./source/HumnumMatrix.csv').toString();
    var humnumMatrix = CSV.parse(content);

    function loader(id) {
      return function (cb) {
        return getUnzippedContent(humnumMatrix[id][5], id, function (err, data) {
          return cb(err, data);
        });
      }
    }

    var actions = [];
    for (var i = 0; i < humnumMatrix.length; i++) {
      if (humnumMatrix[i].length > 5 && humnumMatrix[i][5].trim().length > 0 &&
        humnumMatrix[i][5].indexOf('https:') !== 0) {
        actions.push(loader(i));
      }
    }

    return async.parallelLimit(actions, 5, function (err, results) {
      results.forEach(function (result) {
        if (result && result.issue) {
          console.log(result.url, result.issue);
        }
      });

      return cb(err, results);
    });
  },
  second: function second(cb) {
    return Humnum.remove({}, function (err) {
      if (err) {
        return cb(err);
      }

      var actions = [];
      var files = fs.readdirSync(DATA_DIR);
      files.forEach(function (file) {
        if (file !== DATA_DIR + '/tmp') {
          actions.push(writeDetail(DATA_DIR + '/' + file));
        }
      });

      return async.waterfall(actions, function (err) {
        return cb(err);
      });
    });
  }
};

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
