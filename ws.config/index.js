module.exports = function (app) {
  // should be the first
  require('./config')(app);
  require('./log')(app);
  require('./passport')(app);
  require('./express.config')(app);
  require('./db.config')(app);
};
