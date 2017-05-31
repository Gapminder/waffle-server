import * as _ from 'lodash';
import * as datapackageParser from './datapackage.parser';
import * as ddfImportUtils from './import-ddf.utils';
import {constants} from '../../ws.utils/constants';
import {DatapackageResource, ParsedConceptResource} from './datapackage.parser';

export class ChangesDescriptor {
  private _object: any;
  private _metadata: any;
  private _cachedOldResource: any = null;
  private _cachedCurrentResource: any = null;

  public constructor(rawChangesDescriptor: any) {
    this._object = _.get(rawChangesDescriptor, 'object', {});
    this._metadata = _.get(rawChangesDescriptor, 'metadata', {});
  }

  public get gid(): any {
    return this._object[this.concept];
  }

  public get concept(): any {
    if (this.isCreateAction()) {
      return _.head(_.get(this.currentResource, 'primaryKey') as any[]);
    }
    return this._object.gid;
  }

  public get changes(): any {
    if (this.isUpdateAction()) {
      return this._object['data-update'];
    }
    return this._object;
  }

  public get original(): any {
    const isObjectBeingUpdated = this.isUpdateAction() && this._object['data-origin'];
    const isEntityBeingRemoved = this.isRemoveAction() && this.describes(constants.ENTITIES);

    if (isObjectBeingUpdated || isEntityBeingRemoved) {
      return this._object['data-origin'];
    }
    return this._object;
  }

  public get changedObject(): any {
    return _.omit(_.extend({}, this.original, this.changes), this.removedColumns);
  }

  public get language(): any {
    return this._metadata.lang;
  }

  public get oldResource(): any {
    if (!this._cachedOldResource) {
      this._cachedOldResource = this._parseResource(this.oldResourceRaw);
    }
    return this._cachedOldResource;
  }

  public get oldResourceRaw(): any {
    return _.get(this._metadata.file, 'old');
  }

  public get currentResource(): any {
    if (!this._cachedCurrentResource) {
      this._cachedCurrentResource = this._parseResource(this.currentResourceRaw);
    }
    return this._cachedCurrentResource;
  }

  public get currentResourceRaw(): any {
    return _.get(this._metadata.file, 'new');
  }

  public get removedColumns(): any {
    return this._metadata.removedColumns || [];
  }

  public get onlyColumnsRemoved(): any {
    return this._metadata.onlyColumnsRemoved;
  }

  public get action(): string {
    return _.get(this._metadata, 'action') as string;
  }

  public describes(dataType: any): boolean {
    return this._metadata.type === dataType;
  }

  public isCreateAction(): boolean {
    return this.action === 'create';
  }

  public isRemoveAction(): boolean {
    return this.action === ChangesDescriptor.REMOVE_ACTION_NAME;
  }

  public isUpdateAction(): boolean {
    return ddfImportUtils.UPDATE_ACTIONS.has(this.action);
  }

  private _parseResource(resource: DatapackageResource): ParsedConceptResource {
    if (this.describes(constants.CONCEPTS)) {
      return datapackageParser.parseConceptsResource(resource);
    }

    if (this.describes(constants.ENTITIES)) {
      return datapackageParser.parseEntitiesResource(resource);
    }

    return datapackageParser.parseDatapointsResource(resource);
  }

  public static get REMOVE_ACTION_NAME(): string {
    return 'remove';
  }
}
