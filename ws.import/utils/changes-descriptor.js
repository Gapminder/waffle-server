'use strict';

const _ = require('lodash');
const datapackageParser = require('./datapackage.parser');
const ddfImportUtils = require('./import-ddf.utils');
const constants = require('../../ws.utils/constants');

const REMOVE_ACTION_NAME = 'remove';

class ChangesDescriptor {
  constructor(rawChangesDescriptor) {
    this.object = _.get(rawChangesDescriptor, 'object', {});
    this.metadata = _.get(rawChangesDescriptor, 'metadata', {});
    this._cachedOldResource = null;
    this._cachedCurrentResource = null;
  }

  get gid() {
    return this.original[this.concept];
  }

  get concept() {
    if (this.isCreateAction()) {
      return _.head(_.get(this.currentResource, 'primaryKey'));
    }
    return this.original.gid;
  }

  get changes() {
    if (this.isUpdateAction()) {
      return this.object['data-update'];
    }
    return this.object;
  }

  get original() {
    if (this.isUpdateAction() && this.object['data-origin']) {
      return this.object['data-origin'];
    }
    return this.object;
  }

  get language() {
    return this.metadata.lang;
  }

  get oldResource() {
    if (!this._cachedOldResource) {
      this._cachedOldResource = this._parseResource(this.oldResourceRaw);
    }
    return this._cachedOldResource;
  }

  get oldResourceRaw() {
    return _.get(this.metadata.file, 'old');
  }

  get currentResource() {
    if (!this._cachedCurrentResource) {
      this._cachedCurrentResource = this._parseResource(this.currentResourceRaw);
    }
    return this._cachedCurrentResource;
  }

  get currentResourceRaw() {
    return _.get(this.metadata.file, 'new');
  }

  get removedColumns() {
    return this.metadata.removedColumns || [];
  }

  get onlyColumnsRemoved() {
    return this.metadata.onlyColumnsRemoved;
  }

  describes(dataType) {
    return this.metadata.type === dataType;
  }

  isCreateAction() {
    return this.metadata.action === 'create';
  }

  isRemoveAction() {
    return this.metadata.action === REMOVE_ACTION_NAME;
  }

  isUpdateAction() {
    return ddfImportUtils.UPDATE_ACTIONS.has(this.metadata.action);
  }

  _parseResource(resource) {
    if (this.describes(constants.CONCEPTS)) {
      return datapackageParser.parseConceptsResource(resource);
    }

    if (this.describes(constants.ENTITIES)) {
      return datapackageParser.parseEntitiesResource(resource);
    }

    return datapackageParser.parseDatapointsResource(resource);
  }
}

ChangesDescriptor.REMOVE_ACTION_NAME = REMOVE_ACTION_NAME;

module.exports = {
  ChangesDescriptor
};
