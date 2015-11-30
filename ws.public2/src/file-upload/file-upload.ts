import {Component, View, CORE_DIRECTIVES, NgIf, NgFor} from 'angular2/angular2';
import {FORM_DIRECTIVES, FormBuilder, ControlGroup, Validators} from 'angular2/angular2';
import {Router, RouterLink, RouteParams} from 'angular2/router';
import {HTTP_PROVIDERS, Http, Headers} from 'angular2/http';

import {DATA_LOCATION_URL, SERVER_URL} from '../config';

@Component({
  selector: 'file-upload',
  providers: [HTTP_PROVIDERS]
})
@View({
  directives: [RouterLink, CORE_DIRECTIVES, FORM_DIRECTIVES, NgIf, NgFor],
  template: `file-upload`
})
export class FileUpload {

  constructor(private fb: FormBuilder, rp: RouteParams, public router: Router, public http: Http) {
  }
}
