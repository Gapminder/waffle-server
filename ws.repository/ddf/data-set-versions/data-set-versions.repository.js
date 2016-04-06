'use strict';

const mongoose = require('mongoose');
const Versions = mongoose.model('DataSetVersions');
const utils = require('../utils');

function VersionsRepository() {
}

['pagedList', 'update', 'findById', 'deleteRecord'].forEach(actionName => {
  VersionsRepository.prototype[actionName] = utils.actionFactory(actionName)(Versions, this);
});

module.exports = VersionsRepository;
