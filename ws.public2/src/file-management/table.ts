import {
  Component, Directive, View, EventEmitter, Host,
  OnInit, Self, NgIf,
  CORE_DIRECTIVES, NgClass, FORM_DIRECTIVES
} from 'angular2/angular2';

import {Location, RouteConfig, RouterLink, Router, ROUTER_DIRECTIVES} from 'angular2/router'

import {Table} from '../../node_modules/ng2-table/components/index';
import {Ng2ThSortable} from '../../node_modules/ng2-table/components/table/sorting';

@Component({
  selector: 'ng2-table, [ng2-table]',
  inputs: ['rows', 'columns', 'config'],
  outputs: ['tableChanged', 'deleteFile']
})
@View({
  template: `
    <table class="table table-striped table-bordered dataTable" role="grid">
      <thead>
        <tr role="row">
          <th *ng-for="#column of columns" [ng2-th-sortable]="config" [column]="column" (sort-changed)="onChangeTable($event)">
            {{column.title}}
            <i *ng-if="config && column.sort" class="pull-right glyphicon"
              [ng-class]="{'glyphicon-chevron-down': column.sort === 'desc', 'glyphicon-chevron-up': column.sort === 'asc'}"></i>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr *ng-for="#file of rows">
          <td><a href="{{file.uri}}" target="_blank">{{file.name}}</a></td>
          <td>{{file.ext}}</td>
          <td>{{formatSize(file.size)}} MB</td>
          <td>
            <button *ng-if="file.uri" class="btn btn-sm btn-primary" (click)="doPreview(file)">Preview</button>
            <button class="btn btn-sm btn-success" (click)="doDelete(file)">Delete</button>
            <button *ng-if="file.loading" class="btn btn-sm btn-info">Loading</button>
            <button *ng-if="file.parsing" class="btn btn-sm btn-warning">Parsing</button>
          </td>
        </tr>
      </tbody>
    </table>
`,
  directives: [Ng2ThSortable, NgClass, CORE_DIRECTIVES, FORM_DIRECTIVES, ROUTER_DIRECTIVES]
})
export class Ng2Table extends Table {
  public deleteFile = new EventEmitter();

  constructor() {
    super();
  }

  private doPreview(file) {
    window.location = file.uri;
  }

  private doDelete(file) {
    this.deleteFile.next(file);
  }

  private formatSize(size) {
    var sizeInMb = size/1024/1024;
    return sizeInMb.toFixed(2);
  }
}
