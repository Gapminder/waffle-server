import {Component, View, CORE_DIRECTIVES, NgIf, NgFor, NgClass, OnInit} from 'angular2/angular2';
import {FORM_DIRECTIVES, FormBuilder, ControlGroup, Validators} from 'angular2/angular2';
import {Router, RouterLink, RouteParams} from 'angular2/router';
import {HTTP_PROVIDERS, Http, Headers} from 'angular2/http';

import {MANAGEMENT_URL, SERVER_URL} from '../config';
import {Ng2TableFilter, Ng2TablePaging, pagination} from '../../node_modules/ng2-table/components/index';
import {Ng2Table} from './table';

@Component({
  selector: 'file-management',
  providers: [HTTP_PROVIDERS]
})
@View({
  directives: [Ng2Table, Ng2TableFilter, Ng2TablePaging, pagination, NgClass, RouterLink, CORE_DIRECTIVES, FORM_DIRECTIVES, NgIf, NgFor],
  template: `
<div class="wrapper wrapper-content animated fadeInRight">
  <div class="navbar navbar-default">
      <div class="navbar-header">
          <a class="navbar-brand" href>File Manager</a>
      </div>
  </div>
  <div class="ibox-content m-b-sm border-bottom">
    <div class="row">
      <div class="col-sm-4">
        <div class="form-group">
          <label class="control-label" for="search">Search</label>
            <input
              type="text" id="search" name="product_name" value=""
              placeholder="Please enter any term" class="form-control"
              *ng-if="config.filtering"
              [ng2-table-filter]="{filterString: config.filtering.name, columnName: 'name'}"
              (table-changed)="onChangeTable($event)"/>
        </div>
      </div>
    </div>
  </div>
  <div class="row">
    <div class="col-lg-12">
      <div class="ibox float-e-margins">
        <div class="ibox-content">

          <div *ng-if="!rows.length">
            <p>No data for collection.</p>
            <a href="/file-upload" class="btn btn-primary">Upload some files</a>
          </div>
          <div *ng-if="rows.length">
            <div class="table-responsive">
              <ng2-table [jwt]="jwt"
                 [config]="config.sorting"
                 [rows]="rows" [columns]="columns"
                 (table-changed)="onChangeTable($event)"
                 (delete-file)="onDeleteFile($event)">
              </ng2-table>
              <pagination *ng-if="config.paging"
                [ng2-table-paging]="config.paging"
                (table-changed)="onChangeTable($event)"

                [total-items]="length"
                [(ng-model)]="page"
                [max-size]="maxSize"
                class="pagination-sm"
                [boundary-links]="true"
                [rotate]="false"
                (num-pages)="numPages = $event">
              </pagination>
              <pre *ng-if="config.paging" class="card card-block card-header">Page: {{page}} / {{numPages}}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`
})
export class FileManagement implements OnInit{
  public rows:Array<any> = [];
  public columns:Array<any> = [
    {title: 'Name (click to download)', name: 'name', sort: false},
    {title: 'Extension', name: 'ext', sort: false},
    {title: 'Size', name: 'size', sort: false},
    {title: 'Action', name: 'action', sort: false}
  ];
  public page:number = 1;
  public itemsPerPage:number = 10;
  public maxSize:number = 5;
  public numPages:number = 1;
  public length:number = 0;

  public config:any = {
    paging: true,
    sorting: {columns: []},
    filtering: {
      'name': ''
    }
  };

  private data:Array<any> = [];

  private jwt:string;
  private decodedJwt:string;

  constructor(public http: Http) {
    this.jwt = localStorage.getItem('jwt');
    this.decodedJwt = this.jwt && window.jwt_decode(this.jwt);
    this.length = this.data.length;
  }

  onInit() {
    this.onChangeTable(this.config);
  }

  routeLogout() {
    localStorage.removeItem('jwt');
    window.location.href = '/login';
  }

  onError (error) {
    alert(error.message || 'Waffle server isn\'t started yet!');
    console.error(error.message || 'Waffle server isn\'t started yet!');
    this.routeLogout();
  }

  onProcessReceivedData(response) {
    this.rows = response.data.files || [];
    this.length = response.data.count || 0;
  }

  onMapJsonData(response) {
    return response.json();
  }

  getData () {
    let skip = this.itemsPerPage ? (this.page - 1) * this.itemsPerPage : 0;
    let limit = this.itemsPerPage || 10;
    let search = this.config.filtering.name;

    let sort = {};

    for (let i = 0; i < this.config.sorting.columns.length; i++) {
      let column = this.config.sorting.columns[i];
      sort[column.name] = column.sort;
    }

    sort = JSON.stringify(sort);

    let url = `${MANAGEMENT_URL}?search=${search}&limit=${limit}&skip=${skip}&sort=${sort}`;

    this.http
      .get(url, {
        headers: this.createAuthHeaders(this.jwt)
      })
      .map(this.onMapJsonData)
      .subscribe(
        this.onProcessReceivedData.bind(this),
        this.onError.bind(this));
  }

  private onDeleteFile(file) {
    this.http
      .delete(`${MANAGEMENT_URL}?file=${JSON.stringify(file)}`, {
        headers: this.createAuthHeaders(this.jwt)
      })
      .subscribe(
        this.getData.bind(this),
        this.onError.bind(this));
  }

  private createAuthHeaders(jwtToken: string) {
    return new Headers({
      'Authorization': `Bearer ${jwtToken}`
    });
  }

  onChangeTable(config) {
    if (config.filtering) {
      this.config.filtering[config.filtering.columnName] = config.filtering.filterString;
    }
    if (config.sorting) {
      Object.assign(this.config.sorting, config.sorting);
    }

    if (config.paging) {
      this.page = config.paging.page;
      this.itemsPerPage = config.paging.itemsPerPage;
    }

    this.getData();
  }
}
