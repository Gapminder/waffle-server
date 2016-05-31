'use strict';

const async = require('async');

module.exports = {
  getGitCommitsList: getGitCommitsList,
  importDataset: importDataset,
  updateIncrementally: updateIncrementally,
  getPrestoredQueries: getPrestoredQueries
};

function getGitCommitsList(req, res, next) {
  const github = req.body.github || req.params.github || req.query.github;

  reposService.cloneRepo(github, null, (error, repoInfo) => {
    if (error) {
      return res.json({success: !error, error});
    }

    git(repoInfo.pathToRepo)
      .log(function (err, log) {
        if (err) {
          return res.json({success: !err, err});
        }

        return res.json({commits: _.reverse(log.all)});
      })

  }, config);
}

function importDataset(req, res, next) {
  let params = _.isEmpty(req.query) ? req.body : req.query;
  async.waterfall([
    async.constant({}),
    (pipe, done) => Datasets.findOne({name: params.github}).lean().exec((error, dataset) => {
      pipe.dataset = dataset;
      done(error, pipe);
    }),
    (pipe, done) => Transactions.findOne({
      dataset: pipe.dataset ? pipe.dataset._id : null,
      commit: req.body.commit
    }).lean().exec((error, transaction) => {
      if (error) {
        logger.error(error);
        return res.json({success: !error, error});
      }

      if (transaction) {
        logger.error(`Version of dataset "${req.body.github}" with commit: "${transaction.commit}" was already applied`);
        return res.json({
          success: false,
          error: `Version of dataset with commit: "${transaction.commit}" was already applied`
        });
      }

      reposService.cloneRepo(params.github, params.commit, (error, wasCloned) => {
        if (error) {
          return res.json({success: !error, error});
        }

        importDdfService(app, error => {
          return done(error);
        }, {datasetName: reposService.getRepoName(params.github), commit: params.commit, github: req.body.github});
      }, config);
    })
  ], error => {
    return res.json({success: !error, error});
  });
}

function updateIncrementally(query, cb) {
  return async.waterfall(query, cb
    //async.constant(query, cb)
  );
}

function getPrestoredQueries(req, res, next) {
  async.waterfall([
    async.constant({}),
    (pipe, done) => Datasets.find({}).lean().exec((error, datasets) => {
      pipe.datasets = datasets;
      return done(error, pipe);
    }),
    (pipe, done) => {
      const urls = [];
      return async.each(pipe.datasets, (dataset, onUrlsCreated) => {
        return async.each(dataset.versions, (version, cb) => {
          return Concepts.find({
            dataset: dataset._id,
            type: 'measure',
            from: {$lte: version},
            to: {$gt: version}
          }).lean().exec((error, measures) => {
            urls.push(`dataset: ${dataset.name}, version: ${version}`);
            const filteredMeasures = _.chain(measures)
              .map('gid')
              .filter((measure) => !_.includes(['age', 'longitude', 'latitude'], measure))
              .take(3)
              .join(',')
              .value();
            urls.push(`http://localhost:3000/api/ddf/stats?dataset=${dataset.name}&version=${version}&time=1800:2015&select=geo,time,${filteredMeasures}`);
            return cb();
          });
        }, onUrlsCreated);
      }, error => {
        done(error, urls);
      });
    }
  ], (error, queries) => {
    if (error) {
      res.json({success: !error, error});
    }
    return res.json(queries);
  });
}
