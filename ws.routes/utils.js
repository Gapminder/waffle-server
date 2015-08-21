var md5 = require('md5');

exports.getCacheConfig = function getCacheConfig(prefix) {
  return function (req, res, next) {
    console.log(req.query.force);
    /*eslint camelcase:0*/
    if (req.query.force === true) {
      res.use_express_redis_cache = false;
      return next();
    }

    var hash = md5(prefix + '-' + req.method + req.url);
    console.log(prefix + '-' + req.method + req.url);
    res.express_redis_cache_name = hash;
    next();
  };
};
