var md5 = require('md5');
var loginPage = '/login';

exports.getCacheConfig = function getCacheConfig(prefix) {
  return function (req, res, next) {
    /*eslint camelcase:0*/
    if (req.query.force === true) {
      res.use_express_redis_cache = false;
      return next();
    }

    var hash = md5(prefix + '-' + req.method + req.url);
    res.express_redis_cache_name = hash;
    next();
  };
};

exports.ensureAuthenticated = function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    if (req.xhr) {
      return res.json({success: false, error: 'You need to be logged in'});
    }

    return res.redirect(loginPage);
  };
