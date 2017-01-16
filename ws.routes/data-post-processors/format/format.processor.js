'use strict';

const formatService = require('../../../ws.services/format.service');

module.exports = (data, formatType, cb) => {
  return (formatService[formatType] || formatService['default'])(data, cb);
};
