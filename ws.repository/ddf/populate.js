'use strict';

const _ = require('lodash');
const async = require('async');
const mongoose = require('mongoose');

_.forEach([
  'concepts',
  'data-points',
  'dataset-versions',
  'dataset-transactions',
  'datasets',
  'entities',
  'entity-groups',
  'measures',
  'translations',
  'users',
  'changelogs',
  'eventlogs'
], model => require(`./${model}/${model}.model`));


mongoose.connect('mongodb://localhost:27017/ws_ddf', (err) => {
  if (err) {
    throw err;
  }

  async.waterfall([
    async.constant({}),
    (pipe, done) => removeData(pipe, done),
    (pipe, done) => createUser(pipe, done),
    (pipe, done) => createDataset(pipe, done),
    (pipe, done) => createVersion(pipe, done),
    (pipe, done) => createTransaction(pipe, done),
    (pipe, done) => createEntityGroups(pipe, done),
    (pipe, done) => createEntities(pipe, done),
    (pipe, done) => createMeasures(pipe, done),
    (pipe, done) => createDataPoints(pipe, done),
    (pipe, done) => createConcepts(pipe, done),
    (pipe, done) => createTranslations(pipe, done)
  ], (err, result) => {
    if (err) {
      throw err;
    }

    console.log('done!');

    process.exit(0);
  });

  function removeData(pipe, done) {
    async.parallel([
      cb => mongoose.model('Concepts').remove({}, cb),
      cb => mongoose.model('DataPoints').remove({}, cb),
      cb => mongoose.model('DatasetVersions').remove({}, cb),
      cb => mongoose.model('DatasetTransactions').remove({}, cb),
      cb => mongoose.model('Datasets').remove({}, cb),
      cb => mongoose.model('Entities').remove({}, cb),
      cb => mongoose.model('EntityGroups').remove({}, cb),
      cb => mongoose.model('Measures').remove({}, cb),
      cb => mongoose.model('Translations').remove({}, cb),
      cb => mongoose.model('Users').remove({}, cb),
      cb => mongoose.model('Changelogs').remove({}, cb),
      cb => mongoose.model('Eventlogs').remove({}, cb)
    ], (err) => done(err, pipe));
  }

  function createUser(pipe, done) {
    mongoose.model('Users').create({
      name: 'Vasya Pupkin',
      email: 'email@email.com',
      username: 'VPup',
      password: 'VPup'
    }, (err, res) => {
      pipe.user = res;
      return done(err, pipe);
    });
  }

  function createDataset(pipe, done) {
    mongoose.model('Datasets').create({
      dsId: Math.random().toString(),
      type: 'local',
      url: '/c/users',
      dataProvider: 'hands',
      defaultLanguage: 'en',
      createdBy: pipe.user._id
    }, (err, res) => {
      pipe.dataSet = res;
      return done(err, pipe);
    });
  }

  function createVersion(pipe, done) {
    mongoose.model('DatasetVersions').create({
      name: Math.random().toString(),
      createdBy: pipe.user._id,
      dataset: pipe.dataSet._id,
      isCurrent: true
    }, (err, res) => {
      pipe.version = res;
      return done(err, pipe);
    });
  }

  function createTransaction(pipe, done) {
    mongoose.model('DatasetTransactions').create({
      version: pipe.version._id,
      createdBy: pipe.user._id
    }, (err, res) => {
      pipe.session = res;
      return done(err, pipe);
    });
  }

  function createEntityGroups(pipe, done) {
    pipe.entityGroups = {};

    async.waterfall([
      async.constant(pipe),
      (pipe, done) => _createGeo(pipe, done),
      (pipe, done) => _createCountry(pipe, done),
      (pipe, done) => _createCity(pipe, done),
      (pipe, done) => _createCountryToCityDrilldown(pipe, done),
      (pipe, done) => _createTime(pipe, done),
      (pipe, done) => _createYear(pipe, done),
      (pipe, done) => _createGeoToCountryDrilldown(pipe, done),
      (pipe, done) => _createTimeToYearDrilldown(pipe, done)
    ], done);

    function _createGeo(pipe, done) {
      mongoose.model('EntityGroups').create({
        gid: 'geo',
        name: 'Geo',
        type: 'entity_domain',
        versions: [pipe.version._id]
      }, (err, res) => {
        pipe.entityGroups.geo = res;
        return done(err, pipe);
      });
    }

    function _createCountry(pipe, done) {
      mongoose.model('EntityGroups').create({
        gid: 'country',
        name: 'Country',
        type: 'entity_set',
        domain: pipe.entityGroups.geo._id,
        drillups: [pipe.entityGroups.geo._id],
        versions: [pipe.version._id]
      }, (err, res) => {
        pipe.entityGroups.country = res;
        return done(err, pipe);
      });
    }

    function _createCity(pipe, done) {
      mongoose.model('EntityGroups').create({
        gid: 'city',
        name: 'City',
        type: 'entity_set',
        domain: pipe.entityGroups.geo._id,
        // emulated only drill_up property from current ddf--concept.csv
        drillups: [pipe.entityGroups.country._id],
        versions: [pipe.version._id]
      }, (err, res) => {
        pipe.entityGroups.city = res;
        return done(err, pipe);
      });
    }

    function _createTime(pipe, done) {
      mongoose.model('EntityGroups').create({
        gid: 'time',
        name: 'Time',
        type: 'entity_domain',
        versions: [pipe.version._id]
      }, (err, res) => {
        pipe.entityGroups.time = res;
        return done(err, pipe);
      });
    }

    function _createYear(pipe, done) {
      mongoose.model('EntityGroups').create({
        gid: 'year',
        name: 'Year',
        type: 'entity_set',
        domain: pipe.entityGroups.time._id,
        drillups: [pipe.entityGroups.time._id],
        versions: [pipe.version._id]
      }, (err, res) => {
        pipe.entityGroups.year = res;
        return done(err, pipe);
      });
    }

    function _createGeoToCountryDrilldown(pipe, done) {
      mongoose.model('EntityGroups').findOne({gid: 'country'}).lean().exec((error, country) => {
        mongoose.model('EntityGroups').update({
          gid: 'geo'
        }, {$push: {drilldowns: country._id}}, (err, res) => {
          return done(err, pipe);
        });
      });
    }

    function _createTimeToYearDrilldown(pipe, done) {
      mongoose.model('EntityGroups').findOne({gid: 'year'}).lean().exec((error, year) => {
        mongoose.model('EntityGroups').update({
          gid: 'time'
        }, {$push: {drilldowns: year._id}}, (err, res) => {
          return done(err, pipe);
        });
      });
    }

    function _createCountryToCityDrilldown(pipe, done) {
      mongoose.model('EntityGroups').findOne({gid: 'city'}).lean().exec((error, city) => {
        mongoose.model('EntityGroups').update({
          gid: 'country'
        }, {$push: {drilldowns: city._id}}, (err, res) => {
          return done(err, pipe);
        });
      });
    }
  }

  function createEntities(pipe, done) {
    pipe.entities = {};

    async.waterfall([
      async.constant(pipe),
      (pipe, done) => _createKharkiv(pipe, done),
      (pipe, done) => _createUkraine(pipe, done),
      (pipe, done) => _updateKharkivDrillup(pipe, done),
      (pipe, done) => _createHongKong(pipe, done),
      (pipe, done) => _createAbc(pipe, done),
      (pipe, done) => _createYear1900(pipe, done),
      (pipe, done) => _createYear2000(pipe, done),
      // (pipe, done) => _createTime1900s(pipe, done)
    ], done);

    function _createKharkiv(pipe, done) {
      mongoose.model('Entities').create({
        gid: 'kharkiv',
        title: 'Kharkiv',
        domain: pipe.entityGroups.geo._id,
        sets: [pipe.entityGroups.city._id],
        versions: [pipe.version._id]
      }, (err, res) => {
        pipe.entities.kharkiv = res;
        return done(err, pipe);
      });
    }

    function _createUkraine(pipe, done) {
      mongoose.model('Entities').create({
        gid: 'ukraine',
        title: 'Ukraine',
        domain: pipe.entityGroups.geo._id,
        sets: [pipe.entityGroups.country._id],
        drilldowns: [pipe.entities.kharkiv._id],
        versions: [pipe.version._id]
      }, (err, res) => {
        pipe.entities.ukraine = res;
        return done(err, pipe);
      });
    }

    function _updateKharkivDrillup(pipe, done) {
      mongoose.model('Entities').update({
        _id: pipe.entities.kharkiv._id
      }, {$set: {drillups: [pipe.entities.ukraine._id]}}, (err) => {
        pipe.entities.kharkiv.drillups = [pipe.entities.ukraine._id];
        done(err, pipe);
      })
    }

    function _createHongKong(pipe, done) {
      mongoose.model('Entities').create({
        gid: 'hongkong',
        title: 'Hong Kong',
        domain: pipe.entityGroups.geo._id,
        sets: [pipe.entityGroups.country._id, pipe.entityGroups.city._id],
        versions: [pipe.version._id]
      }, (err, res) => {
        pipe.entities.hongkong = res;
        return done(err, pipe);
      });
    }

    function _createAbc(pipe, done) {
      mongoose.model('Entities').create({
        gid: '_abc',
        title: 'Abc',
        domain: pipe.entityGroups.geo._id,
        versions: [pipe.version._id]
      }, (err, res) => {
        pipe.entities._abc = res;
        return done(err, pipe);
      });
    }

    function _createYear1900(pipe, done) {
      mongoose.model('Entities').create({
        gid: '1900',
        domain: pipe.entityGroups.time._id,
        sets: [pipe.entityGroups.year._id],
        versions: [pipe.version._id]
      }, (err, res) => {
        pipe.entities['1900'] = res;
        return done(err, pipe);
      });
    }

    function _createYear2000(pipe, done) {
      mongoose.model('Entities').create({
        gid: '2000',
        domain: pipe.entityGroups.time._id,
        sets: [pipe.entityGroups.year._id],
        versions: [pipe.version._id]
      }, (err, res) => {
        pipe.entities['2000'] = res;
        return done(err, pipe);
      });
    }

    // function _createTime1900s(pipe, done) {
    //   mongoose.model('Entities').create({
    //     gid: '1900s',
    //     domain: pipe.entityGroups.time._id,
    //     versions: [pipe.version._id]
    //   }, (err, res) => {
    //     pipe.entities['1900s'] = res;
    //     return done(err, pipe);
    //   });
    // }
  }

  function createMeasures(pipe, done) {
    async.parallel({
      gini: (done) => _createGini(pipe, done),
      population: (done) => _createPopulation(pipe, done)
    }, (err, res) => {
      pipe.measures = res;
      done(err, pipe);
    });

    function _createGini(pipe, done) {
      mongoose.model('Measures').create({
        gid: 'gini',
        name: 'Gini',
        versions: [pipe.version._id]
      }, done);
    }

    function _createPopulation(pipe, done) {
      mongoose.model('Measures').create({
        gid: 'population',
        name: 'Population',
        versions: [pipe.version._id]
      }, done);
    }
  }

  function createDataPoints(pipe, done) {
    let dataPoints = generateDataPoints(pipe);

    mongoose.model('DataPoints').create(dataPoints, (err, res) => {
      pipe.dataPoints = res;
      done(err, pipe);
    });

    function generateMeasureValue() {
      return Math.random().toFixed(5) * 100000;
    }

    function generateCoordinates(pipe) {
      let coordKharkivGeo = {gid: pipe.entities.kharkiv.gid, entityGroupName: pipe.entityGroups.geo.gid, entity: pipe.entities.kharkiv._id, entityGroup: pipe.entityGroups.geo._id};
      let coordKharkivCity = {gid: pipe.entities.kharkiv.gid, entityGroupName: pipe.entityGroups.city.gid, entity: pipe.entities.kharkiv._id, entityGroup: pipe.entityGroups.city._id};
      let coordUkraineGeo = {gid: pipe.entities.ukraine.gid, entityGroupName: pipe.entityGroups.geo.gid, entity: pipe.entities.ukraine._id, entityGroup: pipe.entityGroups.geo._id};
      let coordUkraineCountry = {gid: pipe.entities.ukraine.gid, entityGroupName: pipe.entityGroups.country.gid, entity: pipe.entities.ukraine._id, entityGroup: pipe.entityGroups.country._id};
      let coordHongKongGeo = {gid: pipe.entities.hongkong.gid, entityGroupName: pipe.entityGroups.geo.gid, entity: pipe.entities.hongkong._id, entityGroup: pipe.entityGroups.geo._id};
      let coordHongKongCountry = {gid: pipe.entities.hongkong.gid, entityGroupName: pipe.entityGroups.country.gid, entity: pipe.entities.hongkong._id, entityGroup: pipe.entityGroups.country._id};
      let coordHongKongCity = {gid: pipe.entities.hongkong.gid, entityGroupName: pipe.entityGroups.city.gid, entity: pipe.entities.hongkong._id, entityGroup: pipe.entityGroups.city._id};
      let coordAbcGeo = {gid: pipe.entities._abc.gid, entityGroupName: pipe.entityGroups.geo.gid, entity: pipe.entities._abc._id, entityGroup: pipe.entityGroups.geo._id};
      let coordYear1900 = {gid: pipe.entities['1900'].gid, entityGroupName: pipe.entityGroups.year.gid, entity: pipe.entities['1900']._id, entityGroup: pipe.entityGroups.year._id};
      let coordYear2000 = {gid: pipe.entities['2000'].gid, entityGroupName: pipe.entityGroups.year.gid, entity: pipe.entities['2000']._id, entityGroup: pipe.entityGroups.year._id};

      return [
        _.shuffle([coordKharkivGeo, coordYear1900]),
        _.shuffle([coordKharkivGeo, coordYear2000]),
        _.shuffle([coordKharkivCity, coordYear1900]),
        _.shuffle([coordKharkivCity, coordYear2000]),
        _.shuffle([coordUkraineGeo, coordYear1900]),
        _.shuffle([coordUkraineGeo, coordYear2000]),
        _.shuffle([coordUkraineCountry, coordYear1900]),
        _.shuffle([coordUkraineCountry, coordYear2000]),
        _.shuffle([coordHongKongGeo, coordYear1900]),
        _.shuffle([coordHongKongGeo, coordYear2000]),
        _.shuffle([coordHongKongCountry, coordYear1900]),
        _.shuffle([coordHongKongCountry, coordYear2000]),
        _.shuffle([coordHongKongCity, coordYear1900]),
        _.shuffle([coordHongKongCity, coordYear2000]),
        _.shuffle([coordAbcGeo, coordYear1900]),
        _.shuffle([coordAbcGeo, coordYear2000])
      ];

    }

    function generateDataPoints(pipe) {
      return _.reduce(pipe.measures, (result, measure) => {
        let coordinates = generateCoordinates(pipe);

        let dataPointTemplate = {
          coordinates: null,
          value: null,
          measureName: measure.gid,
          measure: measure._id,
          versions: [pipe.version._id]
        };
        let _dataPoints = _.map(coordinates, (_coordinates) => {
          var dataPoint = _.clone(dataPointTemplate);
          dataPoint.coordinates = _coordinates;
          dataPoint.value = generateMeasureValue();
          return dataPoint;
        });

        return result.concat(_dataPoints);
      }, []);
    }
  }

  function createConcepts(pipe, done) {
    let concepts = [
      {gid: 'unit', name: 'Unit', versions: [pipe.version._id]},
      {gid: 'description', name: 'Description', type: 'string', versions: [pipe.version._id]},
      {gid: 'geographic_regions', name: 'Geographic regions', type: 'entity_set', versions: [pipe.version._id]},
      {gid: 'geo', name: 'Geo', type: 'entity_domain', versions: [pipe.version._id]},
      {gid: 'time', name: 'Time', type: 'time', versions: [pipe.version._id]},
      {gid: 'children_per_woman_total_fertility', name: 'Babies per woman', type: 'measure', versions: [pipe.version._id]}
    ];

    mongoose.model('Concepts').create(concepts, (err, res) => {
      pipe.concepts = res;
      done(err, pipe);
    });
  }

  function createTranslations(pipe, done) {
    let translations = [
      {key: 'indicator/gini', value: 'Gini', language: 'en', dataset: pipe.dataSet._id, updatedBy: pipe.user._id},
      {key: 'indicator/population', value: 'Population', language: 'en', dataset: pipe.dataSet._id, updatedBy: pipe.user._id},
      {key: 'indicator/gini', value: 'Gini-ru', language: 'ru', dataset: pipe.dataSet._id, updatedBy: pipe.user._id},
      {key: 'indicator/population', value: 'Population-ru', language: 'ru', dataset: pipe.dataSet._id, updatedBy: pipe.user._id},
    ];

    mongoose.model('Translations').create(translations, (err, res) => {
      pipe.translations = res;
      done(err, pipe);
    });
  }
});
