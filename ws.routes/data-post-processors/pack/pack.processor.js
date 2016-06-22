'use strict';

const packService = require('./../../../ws.services/pack.service.js');

module.exports = (data, formatType, cb) => (packService[formatType] || packService['default'])(data, cb);
