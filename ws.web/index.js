'use strict';

module.exports = function initWsWeb(app) {
  require('./controller')(app);
};
