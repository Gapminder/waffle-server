'use strict';

const _ = require('lodash');
const datapackageParser = require('./datapackage.parser');
const ddfImportUtils = require('./import-ddf.utils');
const constants = require('../../ws.utils/constants');

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
      const oldResource = _.get(this.metadata.file, 'old');
      this._cachedOldResource = this._parseResource(oldResource);
    }
    return this._cachedOldResource;
  }

  get currentResource() {
    if (!this._cachedCurrentResource) {
      const currentResource = _.get(this.metadata.file, 'new');
      this._cachedCurrentResource = this._parseResource(currentResource);
    }
    return this._cachedCurrentResource;
  }

  get removedColumns() {
    return this.metadata.removedColumns || [];
  }

  describes(dataType) {
    return this.metadata.type === dataType;
  }

  isCreateAction() {
    return this.metadata.action === 'create';
  }

  isRemoveAction() {
    return this.metadata.action === 'remove';
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

module.exports = {
  ChangesDescriptor
};
