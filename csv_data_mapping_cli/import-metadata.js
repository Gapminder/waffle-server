/*eslint camelcase: 0*/
'use strict';

// Converter Class
const _ = require('lodash');
const fs = require('fs');
const async = require('async');

const metadata = require('./vizabi/metadata.json');
const mongoose = require('mongoose');

const Translations = mongoose.model('Translations');
const IndexTree = mongoose.model('IndexTree');
const IndexDb = mongoose.model('IndexDb');

const logger = require('../ws.config/log');
const config = require('../ws.config/config');

module.exports = function (options, done) {

  console.time('done');
  async.waterfall([
    clearAllDbs,
    (pipe, cb) => cb(),
    importIndicatorsDb,
    importIndicatorsTree,
    createTranslations
  ], (err) => {
    console.timeEnd('done');
    return done(err);
  });
};

function clearAllDbs(cb) {
  return async.parallel([
    cb => Translations.remove({}, err => cb(err)),
    cb => IndexDb.remove({}, err => cb(err)),
    cb => IndexTree.remove({}, err => cb(err))
  ], cb);
}

function importIndicatorsDb(cb) {
  logger.info('Importing indicator db');
  const indicatorsDB = _.keys(metadata.indicatorsDB)
    .map(function (key) {
      return _.extend(metadata.indicatorsDB[key], {name: key});
    });

  IndexDb.collection.insert(indicatorsDB, function (err, docs) {
    if (err) {
      return cb(err);
    }

    return cb();
  });
}

function importIndicatorsTree(cb) {
  logger.info('importing indicators tree');
  IndexTree
    .findOne({}, {_id: 0, __v: 0})
    .exec(function (err, tree) {
      if (err) {
        return cb(err);
      }

      if (!tree) {
        const indexTree = new IndexTree(metadata.indicatorsTree);
        return indexTree.save(function (_err) {
          return cb(_err);
        });
      }

      IndexTree.update({}, {$set: metadata.indicatorsTree}, function (_err) {
        return cb(_err);
      });
    });
}

function createTranslations(cb) {
  logger.info('create translations');
  const en = require('./vizabi/en');
  const se = require('./vizabi/se');
  const translations = []
    .concat(map(en, 'en'))
    .concat(map(se, 'se'));
  return Translations.create(translations, err => cb(err));

  function map(json, lang) {
    return _.reduce(json, function (res, value, key) {
      res.push({key: key, value: value, language: lang});
      return res;
    }, []);
  }
}
