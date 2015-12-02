import {Component, View, CORE_DIRECTIVES, NgIf, NgFor} from 'angular2/angular2';
import {FORM_DIRECTIVES, FormBuilder, ControlGroup, Validators} from 'angular2/angular2';
import {Router, RouterLink, RouteParams} from 'angular2/router';
import {HTTP_PROVIDERS, Http, Headers} from 'angular2/http';
import {FileSelect, FileDrop, FileUploader} from 'ng2-file-upload';

import {UPLOAD_URL, SERVER_URL} from '../config';

@Component({
  selector: 'file-upload',
  providers: [HTTP_PROVIDERS]
})
@View({
  directives: [FileSelect, FileDrop, CORE_DIRECTIVES, FORM_DIRECTIVES, NgIf, NgFor],
  template: `
<style>
    .my-drop-zone { border: dotted 3px lightgray; }
    .nv-file-over { border: dotted 3px red; } /* Default class applied to drop zones on over */
    .another-file-over-class { border: dotted 3px green; }

    html, body { height: 100%; }
</style>

<div class="container">

    <div class="navbar navbar-default">
        <div class="navbar-header">
            <a class="navbar-brand" href>File Upload</a>
        </div>
    </div>

    <div class="row">

        <div class="col-md-3">

            <h3>Select files</h3>

            <div ng2-file-drop
                 [ng-class]="{'nv-file-over': hasDropZoneOver}"
                 (file-over)="fileOver($event)"
                 [uploader]="uploader"
                 class="well my-drop-zone">
                Drop zone
            </div>

            <input type="file" ng2-file-select [uploader]="uploader" /><br/>
        </div>

        <div class="col-md-10" style="margin-bottom: 40px">

            <p>Queue length: {{ uploader.queue.length }}</p>

            <table class="table">
                <thead>
                <tr>
                    <th width="50%">Name</th>
                    <th>Size</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                <tr *ng-for="#item of uploader.queue">
                    <td><strong>{{ item.file.name }}</strong></td>
                    <td *ng-if="uploader.isHTML5" nowrap>{{ item.file.size/1024/1024 | number:'.2' }} MB</td>
                    <td *ng-if="uploader.isHTML5">
                        <div class="progress" style="margin-bottom: 0;">
                            <div class="progress-bar" role="progressbar" [ng-style]="{ 'width': item.progress + '%' }"></div>
                        </div>
                    </td>
                    <td class="text-center">
                        <span *ng-if="item.isSuccess"><i class="glyphicon glyphicon-ok"></i></span>
                        <span *ng-if="item.isCancel"><i class="glyphicon glyphicon-ban-circle"></i></span>
                        <span *ng-if="item.isError"><i class="glyphicon glyphicon-remove"></i></span>
                    </td>
                    <td nowrap>
                        <button type="button" class="btn btn-success btn-xs"
                                (click)="item.upload()" [disabled]="item.isReady || item.isUploading || item.isSuccess">
                            <span class="glyphicon glyphicon-upload"></span> Upload
                        </button>
                        <button type="button" class="btn btn-warning btn-xs"
                                (click)="item.cancel()" [disabled]="!item.isUploading">
                            <span class="glyphicon glyphicon-ban-circle"></span> Cancel
                        </button>
                        <button type="button" class="btn btn-danger btn-xs"
                                (click)="item.remove()">
                            <span class="glyphicon glyphicon-trash"></span> Remove
                        </button>
                    </td>
                </tr>
                </tbody>
            </table>

            <div>
                <div>
                    Queue progress:
                    <div class="progress" style="">
                        <div class="progress-bar" role="progressbar" [ng-style]="{ 'width': uploader.progress + '%' }"></div>
                    </div>
                </div>
                <button type="button" class="btn btn-success btn-s"
                        (click)="uploader.uploadAll()" [disabled]="!uploader.getNotUploadedItems().length">
                    <span class="glyphicon glyphicon-upload"></span> Upload all
                </button>
                <button type="button" class="btn btn-warning btn-s"
                        (click)="uploader.cancelAll()" [disabled]="!uploader.isUploading">
                    <span class="glyphicon glyphicon-ban-circle"></span> Cancel all
                </button>
                <button type="button" class="btn btn-danger btn-s"
                        (click)="uploader.clearQueue()" [disabled]="!uploader.queue.length">
                    <span class="glyphicon glyphicon-trash"></span> Remove all
                </button>
            </div>

        </div>

    </div>

</div>
`
})
export class FileUpload {
  private uploader:FileUploader;
  private hasDropZoneOver:boolean = false;

  constructor(private fb:FormBuilder, rp:RouteParams, public router:Router, public http:Http) {
    this.uploader = new FileUploader({url: UPLOAD_URL, authToken: 'bearer ' + localStorage.getItem('jwt')});
  }

  private fileOver(e:any) {
    this.hasDropZoneOver = e;
  }
}
