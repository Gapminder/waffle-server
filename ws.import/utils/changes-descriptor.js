'use strict';

const _ = require('lodash');
const datapackageParser = require('./datapackage.parser');
const ddfImportUtils = require('./import-ddf.utils');
const constants = require('../../ws.utils/constants');

class ChangesDescriptor {
  constructor(rawChangesDescriptor) {
    this._object = _.get(rawChangesDescriptor, 'object', {});
    this._metadata = _.get(rawChangesDescriptor, 'metadata', {});
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
      return this._object['data-update'];
    }
    return this._object;
  }

  get original() {
    if (this.isUpdateAction() && this._object['data-origin']) {
      return this._object['data-origin'];
    }
    return this._object;
  }

  get language() {
    return this._metadata.lang;
  }

  get oldResource() {
    if (!this._cachedOldResource) {
      this._cachedOldResource = this._parseResource(this.oldResourceRaw);
    }
    return this._cachedOldResource;
  }

  get oldResourceRaw() {
    return _.get(this._metadata.file, 'old');
  }

  get currentResource() {
    if (!this._cachedCurrentResource) {
      this._cachedCurrentResource = this._parseResource(this.currentResourceRaw);
    }
    return this._cachedCurrentResource;
  }

  get currentResourceRaw() {
    return _.get(this._metadata.file, 'new');
  }

  get removedColumns() {
    return this._metadata.removedColumns || [];
  }

  get onlyColumnsRemoved() {
    return this._metadata.onlyColumnsRemoved;
  }

  get action() {
    return _.get(this._metadata, 'action');
  }

  describes(dataType) {
    return this._metadata.type === dataType;
  }

  isCreateAction() {
    return this.action === 'create';
  }

  isRemoveAction() {
    return this.action === ChangesDescriptor.REMOVE_ACTION_NAME;
  }

  isUpdateAction() {
    return ddfImportUtils.UPDATE_ACTIONS.has(this.action);
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

  static get REMOVE_ACTION_NAME() {
    return 'remove';
  }
}

module.exports = {
  ChangesDescriptor
};
