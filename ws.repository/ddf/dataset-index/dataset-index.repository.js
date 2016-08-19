'use strict';

const _ = require('lodash');
const util = require('util');

const RepositoryFactory = require('../../repository.factory');
const repositoryModel = require('../../repository.model');

util.inherits(DatasetIndex, repositoryModel);

function DatasetIndex() {
  repositoryModel.apply(this, arguments);
}

module.exports = new RepositoryFactory(DatasetIndex);
