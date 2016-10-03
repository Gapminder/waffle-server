'use strict';

const packService = require('./../../../ws.services/pack.service.js');

module.exports = (data, formatType, cb) => {
  return (packService[formatType] || packService['default'])(data, formatType, cb);
};
