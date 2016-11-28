'use strict';

const formatService = require('./../../../ws.services/format.service.js');

module.exports = (data, formatType, cb) => {
  return (formatService[formatType] || formatService['default'])(data, formatType, cb);
};
